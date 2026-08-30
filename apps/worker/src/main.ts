import { PrismaClient } from '@payload-forge/prisma';
import type { RunJobData } from '@payload-forge/shared';
import { type Job, Worker } from 'bullmq';
import { Redis } from 'ioredis';
import { BodyStore } from './modules/run-execution/body-store.js';
import { HttpRequestExecutor } from './modules/run-execution/http-request.executor.js';
import { RealClock } from './modules/run-execution/real-clock.js';
import { decryptSecretHeaders } from './modules/run-execution/secret-headers.js';
import {
  RunExecutionService,
  type RunExecutionHandle,
  type RunExecutionObserver,
} from './modules/run-execution/run-execution.service.js';

const prisma = new PrismaClient();
await prisma.$connect();
await prisma.testRun.updateMany({
  where: { status: { in: ['RUNNING', 'PAUSED'] } },
  data: { status: 'INTERRUPTED', finishedAt: new Date() },
});

const connection = new Redis(
  process.env.REDIS_URL ?? 'redis://localhost:6379',
  { maxRetriesPerRequest: null }
);
const subscriber = connection.duplicate();
const activeRuns = new Map<string, RunExecutionHandle>();
await subscriber.psubscribe('run-control:*');
subscriber.on(
  'pmessage',
  (_pattern: string, channel: string, message: string) => {
    const runId = channel.slice('run-control:'.length);
    const handle = activeRuns.get(runId);
    if (handle === undefined) {
      return;
    }
    const parsed = JSON.parse(message) as { action?: string };
    if (parsed.action === 'pause') handle.pause();
    if (parsed.action === 'resume') handle.resume();
    if (parsed.action === 'cancel') handle.cancel();
  }
);

const worker = new Worker<RunJobData>(
  'test-runs',
  async (job) => {
    const storedRun = await prisma.testRun.findUniqueOrThrow({
      where: { id: job.data.snapshot.id },
      select: { status: true },
    });
    if (storedRun.status === 'CANCELLED') {
      return { status: 'cancelled' };
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
    await prisma.testRun.update({
      where: { id: snapshot.id },
      data: { status: 'RUNNING', startedAt: new Date() },
    });
    const observer: RunExecutionObserver = {
      onAttempt: async (attempt) => {
        await prisma.requestAttempt.upsert({
          where: {
            testRunId_logicalRequestSequence_attemptNumber: {
              testRunId: snapshot.id,
              logicalRequestSequence: attempt.logicalRequestSequence,
              attemptNumber: attempt.attemptNumber,
            },
          },
          create: {
            testRunId: snapshot.id,
            logicalRequestSequence: attempt.logicalRequestSequence,
            attemptNumber: attempt.attemptNumber,
            startedAt: new Date(attempt.startedAtMs),
            latencyMs: attempt.result.latencyMs,
            statusCode: attempt.result.statusCode ?? null,
            error: attempt.result.error ?? null,
            requestBodyRef: attempt.result.requestBodyRef ?? null,
            responseBodyRef: attempt.result.responseBodyRef ?? null,
            bodyTruncated: attempt.result.bodyTruncated ?? false,
          },
          update: {
            latencyMs: attempt.result.latencyMs,
            statusCode: attempt.result.statusCode ?? null,
            error: attempt.result.error ?? null,
            requestBodyRef: attempt.result.requestBodyRef ?? null,
            responseBodyRef: attempt.result.responseBodyRef ?? null,
            bodyTruncated: attempt.result.bodyTruncated ?? false,
          },
        });
      },
      onProgress: async (progress) => {
        await prisma.testRun.update({
          where: { id: snapshot.id },
          data: {
            attemptCount: progress.attempts,
            succeeded: progress.succeeded,
            failed: progress.failed,
          },
        });
      },
    };
    const service = new RunExecutionService(
      new RealClock(),
      new HttpRequestExecutor(new BodyStore()),
      observer
    );
    const handle = service.start(snapshot);
    if (storedRun.status === 'PAUSED') {
      handle.pause();
    }
    activeRuns.set(snapshot.id, handle);
    try {
      const summary = await handle.completion;
      await prisma.testRun.update({
        where: { id: snapshot.id },
        data: {
          status: summary.status === 'cancelled' ? 'CANCELLED' : 'COMPLETED',
          succeeded: summary.succeeded,
          failed: summary.failed,
          cancelled: summary.cancelled,
          attemptCount: summary.attempts,
          finishedAt: new Date(),
        },
      });
      return summary;
    } finally {
      activeRuns.delete(snapshot.id);
    }
  },
  {
    connection,
    concurrency: Number(process.env.WORKER_RUN_CONCURRENCY ?? 2),
  }
);

const recordFailedRun = async (
  job: Job<RunJobData> | undefined,
  error: Error
): Promise<void> => {
  if (job === undefined) return;
  await prisma.testRun.update({
    where: { id: job.data.snapshot.id },
    data: { status: 'FAILED', finishedAt: new Date() },
  });
  process.stderr.write(
    `${JSON.stringify({ runId: job.data.snapshot.id, error: error.message })}\n`
  );
};
worker.on('failed', (job, error) => {
  void recordFailedRun(job, error);
});

const shutdown = async (): Promise<void> => {
  await worker.close();
  await subscriber.quit();
  await connection.quit();
  await prisma.$disconnect();
};
process.on('SIGINT', () => {
  void shutdown();
});
process.on('SIGTERM', () => {
  void shutdown();
});
