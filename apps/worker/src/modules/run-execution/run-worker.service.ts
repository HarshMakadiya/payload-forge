import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaClient, type Prisma } from '@payload-forge/prisma';
import type {
  RunControlCommand,
  RunJobData,
  RunSummary,
} from '@payload-forge/shared';
import { type Job, Worker } from 'bullmq';
import { Redis } from 'ioredis';
import { randomUUID } from 'node:crypto';
import { BodyStore } from './body-store.js';
import { HttpRequestExecutor } from './http-request.executor.js';
import { RealClock } from './real-clock.js';
import {
  RunExecutionService,
  type RunExecutionHandle,
  type RunExecutionObserver,
} from './run-execution.service.js';
import { decryptSecretHeaders } from './secret-headers.js';

@Injectable()
export class RunWorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RunWorkerService.name);
  private readonly prisma = new PrismaClient();
  private readonly connection = new Redis(process.env.REDIS_URL ?? '', {
    maxRetriesPerRequest: null,
  });
  private readonly subscriber = this.connection.duplicate();
  private readonly activeRuns = new Map<string, RunExecutionHandle>();
  private readonly workerId = randomUUID();
  private worker: Worker<RunJobData> | undefined;
  private heartbeat: NodeJS.Timeout | undefined;

  async onModuleInit(): Promise<void> {
    await this.prisma.$connect();
    const staleHeartbeat = new Date(Date.now() - 15_000);
    const interrupted = await this.prisma.testRun.updateMany({
      where: {
        status: { in: ['RUNNING', 'PAUSED'] },
        OR: [
          { workerHeartbeatAt: null },
          { workerHeartbeatAt: { lt: staleHeartbeat } },
        ],
      },
      data: {
        status: 'INTERRUPTED',
        finishedAt: new Date(),
        workerId: null,
        workerHeartbeatAt: null,
      },
    });
    this.logger.log({
      requestId: null,
      runId: null,
      event: 'worker-started',
      interruptedRuns: interrupted.count,
    });
    await this.subscriber.psubscribe('run-control:*');
    this.subscriber.on('pmessage', (_pattern, channel, message) => {
      this.handleControlMessage(channel, message);
    });
    this.worker = new Worker<RunJobData>(
      'payload-forge-test-runs',
      (job) => this.executeJob(job),
      {
        connection: this.connection,
        concurrency: Number(process.env.WORKER_RUN_CONCURRENCY ?? 2),
      }
    );
    this.worker.on('failed', (job, error) => {
      void this.recordFailedRun(job, error).catch((recordError: unknown) => {
        this.logger.error({
          requestId: null,
          runId: job?.data.snapshot.id ?? null,
          event: 'failed-run-persistence-failed',
          error:
            recordError instanceof Error
              ? recordError.message
              : String(recordError),
        });
      });
    });
    await this.writeHeartbeat();
    this.heartbeat = setInterval(() => {
      void this.writeHeartbeat().catch((error: unknown) => {
        this.logger.error({
          requestId: null,
          runId: null,
          event: 'worker-heartbeat-failed',
          error: error instanceof Error ? error.message : String(error),
        });
      });
    }, 5_000);
    this.heartbeat.unref();
  }

  async onModuleDestroy(): Promise<void> {
    if (this.heartbeat !== undefined) clearInterval(this.heartbeat);
    await this.worker?.close();
    await this.subscriber.quit();
    await this.connection.quit();
    await this.prisma.$disconnect();
  }

  private handleControlMessage(channel: string, message: string): void {
    const runId = channel.slice('run-control:'.length);
    const handle = this.activeRuns.get(runId);
    if (handle === undefined) return;
    try {
      const parsed = JSON.parse(message) as RunControlCommand;
      if (parsed.action === 'pause') handle.pause();
      if (parsed.action === 'resume') handle.resume();
      if (parsed.action === 'cancel') handle.cancel();
      if (parsed.action === 'throttle') {
        handle.setThrottlePercent(parsed.throttlePercent);
      }
    } catch (error: unknown) {
      this.logger.error({
        requestId: null,
        runId,
        event: 'invalid-run-control-message',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async executeJob(job: Job<RunJobData>): Promise<unknown> {
    const storedRun = await this.prisma.testRun.findUniqueOrThrow({
      where: { id: job.data.snapshot.id },
      select: { status: true, workerHeartbeatAt: true },
    });
    if (storedRun.status !== 'QUEUED') {
      const hasStaleLease =
        (storedRun.status === 'RUNNING' || storedRun.status === 'PAUSED') &&
        (storedRun.workerHeartbeatAt === null ||
          storedRun.workerHeartbeatAt.getTime() < Date.now() - 15_000);
      if (hasStaleLease) {
        await this.prisma.testRun.update({
          where: { id: job.data.snapshot.id },
          data: {
            status: 'INTERRUPTED',
            finishedAt: new Date(),
            workerId: null,
            workerHeartbeatAt: null,
          },
        });
        return { status: 'interrupted' };
      }
      return { status: storedRun.status.toLowerCase() };
    }
    const snapshot = {
      ...job.data.snapshot,
      endpoint: {
        ...job.data.snapshot.endpoint,
        headers: {
          ...job.data.snapshot.endpoint.headers,
          ...(job.data.encryptedSecretHeaders === undefined
            ? {}
            : decryptSecretHeaders(job.data.encryptedSecretHeaders)),
        },
      },
    };
    await this.prisma.testRun.update({
      where: { id: snapshot.id },
      data: {
        status: 'RUNNING',
        startedAt: new Date(),
        workerId: this.workerId,
        workerHeartbeatAt: new Date(),
      },
    });
    const handle = new RunExecutionService(
      new RealClock(),
      new HttpRequestExecutor(new BodyStore()),
      this.createObserver(snapshot.id)
    ).start(snapshot);
    this.activeRuns.set(snapshot.id, handle);
    try {
      const summary = await handle.completion;
      return await this.persistFinalSummary(snapshot.id, snapshot, summary);
    } finally {
      this.activeRuns.delete(snapshot.id);
    }
  }

  private createObserver(runId: string): RunExecutionObserver {
    return {
      onAttempt: async (attempt) => {
        await this.prisma.requestAttempt.upsert({
          where: {
            testRunId_logicalRequestSequence_attemptNumber: {
              testRunId: runId,
              logicalRequestSequence: attempt.logicalRequestSequence,
              attemptNumber: attempt.attemptNumber,
            },
          },
          create: {
            testRunId: runId,
            logicalRequestSequence: attempt.logicalRequestSequence,
            attemptNumber: attempt.attemptNumber,
            startedAt: new Date(attempt.startedAtMs),
            latencyMs: attempt.result.latencyMs,
            statusCode: attempt.result.statusCode ?? null,
            requestMethod: attempt.result.requestMethod ?? 'UNKNOWN',
            requestUrl: attempt.result.requestUrl ?? '',
            requestHeaders:
              (attempt.result.requestHeaders as
                Prisma.InputJsonValue | undefined) ?? {},
            ...(attempt.result.responseHeaders === undefined
              ? {}
              : {
                  responseHeaders: attempt.result.responseHeaders,
                }),
            error: attempt.result.error ?? null,
            errorType: attempt.result.errorType ?? null,
            searchText: attempt.result.searchText ?? null,
            requestBodyRef: attempt.result.requestBodyRef ?? null,
            responseBodyRef: attempt.result.responseBodyRef ?? null,
            bodyTruncated: attempt.result.bodyTruncated ?? false,
          },
          update: {
            latencyMs: attempt.result.latencyMs,
            statusCode: attempt.result.statusCode ?? null,
            requestMethod: attempt.result.requestMethod ?? 'UNKNOWN',
            requestUrl: attempt.result.requestUrl ?? '',
            requestHeaders:
              (attempt.result.requestHeaders as
                Prisma.InputJsonValue | undefined) ?? {},
            ...(attempt.result.responseHeaders === undefined
              ? {}
              : {
                  responseHeaders: attempt.result.responseHeaders,
                }),
            error: attempt.result.error ?? null,
            errorType: attempt.result.errorType ?? null,
            searchText: attempt.result.searchText ?? null,
            requestBodyRef: attempt.result.requestBodyRef ?? null,
            responseBodyRef: attempt.result.responseBodyRef ?? null,
            bodyTruncated: attempt.result.bodyTruncated ?? false,
          },
        });
      },
      onProgress: async (progress) => {
        await this.prisma.testRun.update({
          where: { id: runId },
          data: {
            attemptCount: progress.attempts,
            succeeded: progress.succeeded,
            failed: progress.failed,
            queued: progress.queued,
            inFlight: progress.inFlight,
            timedOut: progress.timedOut,
          },
        });
        await this.publishRunProgress({ runId, ...progress });
      },
      onCircuitBreaker: async (event) => {
        await this.prisma.testRun.update({
          where: { id: runId },
          data: { status: 'PAUSED' },
        });
        await this.publishRunProgress({
          runId,
          status: 'PAUSED',
          circuitBreaker: event,
        });
        this.logger.warn({
          requestId: null,
          runId,
          event: 'run-circuit-breaker-tripped',
          ...event,
        });
      },
    };
  }

  private async persistFinalSummary(
    runId: string,
    snapshot: RunJobData['snapshot'],
    executionSummary: RunSummary
  ): Promise<unknown> {
    const attempts = await this.prisma.requestAttempt.findMany({
      where: { testRunId: runId },
      select: {
        logicalRequestSequence: true,
        latencyMs: true,
        statusCode: true,
        error: true,
        errorType: true,
      },
    });
    const successfulSequences = new Set(
      attempts
        .filter(
          (attempt) =>
            attempt.error === null &&
            attempt.statusCode !== null &&
            attempt.statusCode >= 200 &&
            attempt.statusCode < 300
        )
        .map((attempt) => attempt.logicalRequestSequence)
    );
    const completedSequences = new Set(
      attempts.map((attempt) => attempt.logicalRequestSequence)
    );
    const persistedFailed = [...completedSequences].filter(
      (sequence) => !successfulSequences.has(sequence)
    ).length;
    const sortedLatencies = attempts
      .map((attempt) => attempt.latencyMs)
      .sort((left, right) => left - right);
    const percentile = (value: number): number => {
      if (sortedLatencies.length === 0) return 0;
      const index = Math.ceil((value / 100) * sortedLatencies.length) - 1;
      return sortedLatencies[Math.max(0, index)] ?? 0;
    };
    const persistedSummary = {
      ...executionSummary,
      attempts: attempts.length,
      succeeded: successfulSequences.size,
      failed: persistedFailed,
      cancelled:
        executionSummary.status === 'cancelled'
          ? snapshot.totalLogicalRequests -
            successfulSequences.size -
            persistedFailed
          : 0,
      latencyPercentiles: {
        p50: percentile(50),
        p90: percentile(90),
        p95: percentile(95),
        p99: percentile(99),
      },
      errorBreakdown: attempts.reduce<Record<string, number>>(
        (breakdown, attempt) => {
          const isError =
            attempt.error !== null ||
            (attempt.statusCode !== null &&
              (attempt.statusCode < 200 || attempt.statusCode >= 300));
          if (isError) {
            const key =
              attempt.errorType ?? String(attempt.statusCode ?? 'unknown');
            breakdown[key] = (breakdown[key] ?? 0) + 1;
          }
          return breakdown;
        },
        {}
      ),
      attemptsLog: [],
    };
    await this.prisma.testRun.update({
      where: { id: runId },
      data: {
        status:
          executionSummary.status === 'cancelled' ? 'CANCELLED' : 'COMPLETED',
        succeeded: persistedSummary.succeeded,
        failed: persistedSummary.failed,
        cancelled: persistedSummary.cancelled,
        attemptCount: persistedSummary.attempts,
        summary: persistedSummary,
        queued: 0,
        inFlight: 0,
        timedOut: attempts.filter((attempt) => attempt.errorType === 'timeout')
          .length,
        finishedAt: new Date(),
        workerId: null,
        workerHeartbeatAt: null,
      },
    });
    await this.publishRunProgress({ runId, final: true, ...persistedSummary });
    return persistedSummary;
  }

  private async recordFailedRun(
    job: Job<RunJobData> | undefined,
    error: Error
  ): Promise<void> {
    if (job === undefined) return;
    const runId = job.data.snapshot.id;
    await this.prisma.testRun.update({
      where: { id: runId },
      data: {
        status: 'FAILED',
        inFlight: 0,
        finishedAt: new Date(),
        workerId: null,
        workerHeartbeatAt: null,
      },
    });
    this.logger.error({
      requestId: null,
      runId,
      event: 'run-job-failed',
      error: error.message,
    });
  }

  private async writeHeartbeat(): Promise<void> {
    await this.connection.set(
      'payload-forge:worker-heartbeat',
      new Date().toISOString(),
      'EX',
      15
    );
    const activeRunIds = [...this.activeRuns.keys()];
    if (activeRunIds.length > 0) {
      await this.prisma.testRun.updateMany({
        where: { id: { in: activeRunIds }, workerId: this.workerId },
        data: { workerHeartbeatAt: new Date() },
      });
    }
  }

  private async publishRunProgress(event: object): Promise<void> {
    const subscriberCount = await this.connection.publish(
      'run-progress',
      JSON.stringify(event)
    );
    if (subscriberCount === 0) {
      await this.connection.incr('payload-forge:dropped-realtime-events');
    }
  }
}
