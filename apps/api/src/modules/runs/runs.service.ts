import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@payload-forge/prisma';
import type { TestRunSnapshot } from '@payload-forge/shared';
import { randomInt, randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateRunDto } from './runs.dto.js';
import { RunQueueService } from './run-queue.service.js';

@Injectable()
export class RunsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: RunQueueService
  ) {}

  async create(input: CreateRunDto): Promise<unknown> {
    const [project, environment, endpoint, payloadTemplate] = await Promise.all(
      [
        this.prisma.project.findUnique({ where: { id: input.projectId } }),
        this.prisma.environment.findUnique({
          where: { id: input.environmentId },
        }),
        this.prisma.endpoint.findUnique({ where: { id: input.endpointId } }),
        input.payloadTemplateId === undefined
          ? Promise.resolve(null)
          : this.prisma.payloadTemplate.findUnique({
              where: { id: input.payloadTemplateId },
            }),
      ]
    );
    if (project === null || environment === null || endpoint === null) {
      throw new NotFoundException({
        code: 'RUN_RESOURCE_NOT_FOUND',
        message: 'Project, Environment, or Endpoint not found',
      });
    }
    if (
      environment.projectId !== input.projectId ||
      endpoint.projectId !== input.projectId
    ) {
      throw new BadRequestException('Run resources must belong to one Project');
    }
    if (
      input.payloadTemplateId !== undefined &&
      (payloadTemplate === null || payloadTemplate.endpointId !== endpoint.id)
    ) {
      throw new BadRequestException({
        code: 'PAYLOAD_TEMPLATE_MISMATCH',
        message: 'Payload Template must belong to the selected Endpoint',
      });
    }
    if (!input.ownershipAcknowledged) {
      throw new BadRequestException({
        code: 'TARGET_AUTHORIZATION_REQUIRED',
        message: 'Confirm that you own or are authorized to test this target',
      });
    }

    const requestsPerMinute = Math.ceil(
      input.totalLogicalRequests / input.durationMinutes
    );
    const isProduction = environment.kind === 'PRODUCTION';
    const rateLimit = isProduction
      ? Number(process.env.PRODUCTION_MAX_REQUESTS_PER_MINUTE ?? 1_000)
      : 10_000;
    const concurrencyLimit = isProduction
      ? Number(process.env.PRODUCTION_MAX_CONCURRENCY ?? 50)
      : 500;
    if (requestsPerMinute > rateLimit) {
      throw new BadRequestException(
        `Requested rate exceeds ${rateLimit} requests per minute`
      );
    }
    if (input.maxConcurrency > concurrencyLimit) {
      throw new BadRequestException(
        `Requested concurrency exceeds ${concurrencyLimit}`
      );
    }
    if (isProduction && input.productionConfirmed !== true) {
      throw new BadRequestException({
        code: 'PRODUCTION_CONFIRMATION_REQUIRED',
        message: 'Production Test Runs require explicit confirmation',
      });
    }

    const id = randomUUID();
    const environmentVariables = environment.variables as Record<
      string,
      unknown
    >;
    const selectedPayloads =
      endpoint.method === 'GET'
        ? [null]
        : ((payloadTemplate?.payloads as unknown[] | undefined) ??
          input.payloads ??
          (endpoint.payloadSample === null
            ? [null]
            : [endpoint.payloadSample]));
    const snapshot: TestRunSnapshot = {
      id,
      endpoint: {
        method: endpoint.method as TestRunSnapshot['endpoint']['method'],
        url: new URL(
          this.resolveText(endpoint.path, environmentVariables),
          environment.baseUrl
        ).toString(),
        headers: this.resolveValue(
          endpoint.headers,
          environmentVariables
        ) as Record<string, string>,
        timeoutMs: endpoint.timeoutMs,
      },
      totalLogicalRequests: input.totalLogicalRequests,
      requestsPerMinute,
      durationMs: input.durationMinutes * 60_000,
      rateStrategy: input.rateStrategy,
      throttlePercent: 100,
      maxConcurrency: input.maxConcurrency,
      circuitBreaker: {
        minCompletedRequests: 20,
        errorRateThreshold: 0.2,
        action: 'pause',
      },
      retry: {
        maxAttempts: input.maxAttempts ?? 1,
        backoffMs: input.retryBackoffMs ?? 0,
      },
      payloads: selectedPayloads.map((payload) =>
        this.resolveValue(payload, environmentVariables)
      ),
      environmentVariables,
      redactFields: project.redactFields,
      ...(payloadTemplate === null
        ? {}
        : { payloadTemplateVersion: payloadTemplate.version }),
      assertionVersion: 1,
      workerVersion: process.env.WORKER_VERSION ?? '0.1.0',
      targetAuthorizationAcknowledged: true,
      productionConfirmed: isProduction,
      randomSeed: randomInt(1, 2_147_483_647),
    };

    const run = await this.prisma.testRun.create({
      data: {
        id,
        projectId: input.projectId,
        environmentId: input.environmentId,
        endpointId: input.endpointId,
        snapshot: snapshot as unknown as Prisma.InputJsonValue,
        totalLogicalRequests: input.totalLogicalRequests,
        requestsPerMinute,
        maxConcurrency: input.maxConcurrency,
        queued: input.totalLogicalRequests,
        randomSeed: snapshot.randomSeed,
      },
    });
    await this.queue.enqueue(snapshot, environment.encryptedSecrets);
    return run;
  }

  async control(
    runId: string,
    action: 'pause' | 'resume' | 'cancel'
  ): Promise<unknown> {
    const run = await this.prisma.testRun.findUnique({ where: { id: runId } });
    if (run === null) {
      throw new NotFoundException({
        code: 'RUN_NOT_FOUND',
        message: 'Test Run not found',
      });
    }
    const isAllowed =
      (action === 'pause' && run.status === 'RUNNING') ||
      (action === 'resume' && run.status === 'PAUSED') ||
      (action === 'cancel' &&
        (run.status === 'QUEUED' ||
          run.status === 'RUNNING' ||
          run.status === 'PAUSED'));
    if (!isAllowed) {
      throw new BadRequestException({
        code: 'RUN_STATUS_TRANSITION_INVALID',
        message: `Cannot ${action} a ${run.status.toLowerCase()} run`,
      });
    }
    await this.queue.control(runId, { action });
    const status =
      action === 'pause'
        ? 'PAUSED'
        : action === 'resume'
          ? 'RUNNING'
          : 'CANCELLED';
    return this.prisma.testRun.update({
      where: { id: runId },
      data: { status },
    });
  }

  async throttle(runId: string, throttlePercent: number): Promise<unknown> {
    const run = await this.prisma.testRun.findUnique({ where: { id: runId } });
    if (run === null) {
      throw new NotFoundException({
        code: 'RUN_NOT_FOUND',
        message: 'Test Run not found',
      });
    }
    if (run.status !== 'RUNNING' && run.status !== 'PAUSED') {
      throw new BadRequestException({
        code: 'RUN_THROTTLE_INVALID',
        message: `Cannot throttle a ${run.status.toLowerCase()} run`,
      });
    }
    const snapshot = run.snapshot as Prisma.JsonObject;
    await this.queue.control(runId, { action: 'throttle', throttlePercent });
    return this.prisma.testRun.update({
      where: { id: runId },
      data: {
        snapshot: {
          ...snapshot,
          throttlePercent,
        },
      },
    });
  }

  private resolveText(
    value: string,
    variables: Readonly<Record<string, unknown>>
  ): string {
    return value.replace(
      /\{\{([A-Za-z0-9_.-]+)\}\}/gu,
      (_match, name: string) => {
        const replacement = variables[name];
        if (
          replacement === undefined ||
          (typeof replacement !== 'string' && typeof replacement !== 'number')
        ) {
          throw new BadRequestException({
            code: 'ENVIRONMENT_VARIABLE_UNRESOLVED',
            message: `Environment variable ${name} is missing or not scalar`,
          });
        }
        return String(replacement);
      }
    );
  }

  private resolveValue(
    value: unknown,
    variables: Readonly<Record<string, unknown>>
  ): unknown {
    if (typeof value === 'string') return this.resolveText(value, variables);
    if (Array.isArray(value)) {
      return value.map((item) => this.resolveValue(item, variables));
    }
    if (typeof value === 'object' && value !== null) {
      return Object.fromEntries(
        Object.entries(value).map(([key, item]) => [
          key,
          this.resolveValue(item, variables),
        ])
      );
    }
    return value;
  }
}
