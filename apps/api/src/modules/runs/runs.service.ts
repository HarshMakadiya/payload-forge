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
    const [environment, endpoint] = await Promise.all([
      this.prisma.environment.findUnique({
        where: { id: input.environmentId },
      }),
      this.prisma.endpoint.findUnique({ where: { id: input.endpointId } }),
    ]);
    if (environment === null || endpoint === null) {
      throw new NotFoundException('Environment or Endpoint not found');
    }
    if (
      environment.projectId !== input.projectId ||
      endpoint.projectId !== input.projectId
    ) {
      throw new BadRequestException('Run resources must belong to one Project');
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
      throw new BadRequestException(
        'Production Test Runs require explicit confirmation'
      );
    }

    const id = randomUUID();
    const snapshot: TestRunSnapshot = {
      id,
      endpoint: {
        method: endpoint.method as TestRunSnapshot['endpoint']['method'],
        url: new URL(endpoint.path, environment.baseUrl).toString(),
        headers: {
          ...(endpoint.headers as Record<string, string>),
        },
        timeoutMs: endpoint.timeoutMs,
      },
      totalLogicalRequests: input.totalLogicalRequests,
      requestsPerMinute,
      maxConcurrency: input.maxConcurrency,
      retry: {
        maxAttempts: input.maxAttempts ?? 1,
        backoffMs: input.retryBackoffMs ?? 0,
      },
      payloads:
        input.payloads ??
        (endpoint.payloadSample === null ? [null] : [endpoint.payloadSample]),
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
      throw new NotFoundException('Test Run not found');
    }
    await this.queue.control(runId, action);
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
}
