import { describe, expect, it } from 'vitest';
import type { AttemptResult, TestRunSnapshot } from '@payload-forge/shared';
import {
  RunExecutionService,
  type ExecutionClock,
  type RunExecutionObserver,
  type RequestExecutor,
} from './run-execution.service.js';

class RecordingClock implements ExecutionClock {
  private currentTimeMs = 0;
  readonly sleeps: number[] = [];

  now(): number {
    return this.currentTimeMs;
  }

  sleep(durationMs: number): Promise<void> {
    this.sleeps.push(durationMs);
    this.currentTimeMs += durationMs;
    return Promise.resolve();
  }
}

describe('RunExecutionService', () => {
  it('dispatches every logical request at the configured constant rate', async () => {
    const clock = new RecordingClock();
    const dispatchTimes: number[] = [];
    const executor: RequestExecutor = {
      execute: (): Promise<AttemptResult> => {
        dispatchTimes.push(clock.now());
        return Promise.resolve({ statusCode: 200, latencyMs: 12 });
      },
    };
    const snapshot: TestRunSnapshot = {
      id: 'run-1',
      endpoint: {
        method: 'POST',
        url: 'https://example.test/orders',
        headers: {},
        timeoutMs: 5_000,
      },
      totalLogicalRequests: 3,
      requestsPerMinute: 3,
      maxConcurrency: 1,
      retry: { maxAttempts: 1, backoffMs: 0 },
      payloads: [{ order: 1 }, { order: 2 }, { order: 3 }],
      randomSeed: 42,
    };

    const summary = await new RunExecutionService(clock, executor).execute(
      snapshot
    );

    expect(dispatchTimes).toEqual([0, 20_000, 40_000]);
    expect(summary).toMatchObject({
      status: 'completed',
      logicalRequests: 3,
      attempts: 3,
      succeeded: 3,
      failed: 0,
      cancelled: 0,
    });
  });

  it('logs retries as attempts and keeps them inside the rate budget', async () => {
    const clock = new RecordingClock();
    const dispatchTimes: number[] = [];
    let callCount = 0;
    const executor: RequestExecutor = {
      execute: (): Promise<AttemptResult> => {
        dispatchTimes.push(clock.now());
        callCount += 1;
        return Promise.resolve(
          callCount === 1
            ? { statusCode: 503, latencyMs: 20 }
            : { statusCode: 201, latencyMs: 15 }
        );
      },
    };
    const snapshot: TestRunSnapshot = {
      id: 'run-retry',
      endpoint: {
        method: 'POST',
        url: 'https://example.test/orders',
        headers: {},
        timeoutMs: 5_000,
      },
      totalLogicalRequests: 1,
      requestsPerMinute: 60,
      maxConcurrency: 1,
      retry: { maxAttempts: 2, backoffMs: 250 },
      payloads: [{ order: 1 }],
      randomSeed: 42,
    };

    const summary = await new RunExecutionService(clock, executor).execute(
      snapshot
    );

    expect(dispatchTimes).toEqual([0, 1_000]);
    expect(summary).toMatchObject({
      status: 'completed',
      logicalRequests: 1,
      attempts: 2,
      succeeded: 1,
      failed: 0,
    });
    expect(summary.attemptsLog.map((attempt) => attempt.attemptNumber)).toEqual(
      [1, 2]
    );
  });

  it('uses available concurrency without exceeding the configured cap', async () => {
    const clock = new RecordingClock();
    let activeAttempts = 0;
    let maximumActiveAttempts = 0;
    const executor: RequestExecutor = {
      execute: async (): Promise<AttemptResult> => {
        activeAttempts += 1;
        maximumActiveAttempts = Math.max(maximumActiveAttempts, activeAttempts);
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
        activeAttempts -= 1;
        return { statusCode: 200, latencyMs: 5 };
      },
    };
    const snapshot: TestRunSnapshot = {
      id: 'run-concurrency',
      endpoint: {
        method: 'GET',
        url: 'https://example.test/health',
        headers: {},
        timeoutMs: 5_000,
      },
      totalLogicalRequests: 4,
      requestsPerMinute: 60_000,
      maxConcurrency: 2,
      retry: { maxAttempts: 1, backoffMs: 0 },
      payloads: [null],
      randomSeed: 42,
    };

    const summary = await new RunExecutionService(clock, executor).execute(
      snapshot
    );

    expect(maximumActiveAttempts).toBe(2);
    expect(summary).toMatchObject({
      status: 'completed',
      logicalRequests: 4,
      attempts: 4,
      succeeded: 4,
    });
  });

  it('cancels undispatched logical requests through the run handle', async () => {
    const clock = new RecordingClock();
    const handleReference: {
      current?: ReturnType<RunExecutionService['start']>;
    } = {};
    const executor: RequestExecutor = {
      execute: (): Promise<AttemptResult> => {
        handleReference.current?.cancel();
        return Promise.resolve({ statusCode: 200, latencyMs: 5 });
      },
    };
    const snapshot: TestRunSnapshot = {
      id: 'run-cancel',
      endpoint: {
        method: 'POST',
        url: 'https://example.test/orders',
        headers: {},
        timeoutMs: 5_000,
      },
      totalLogicalRequests: 3,
      requestsPerMinute: 60,
      maxConcurrency: 1,
      retry: { maxAttempts: 1, backoffMs: 0 },
      payloads: [{ order: 1 }],
      randomSeed: 42,
    };

    const service = new RunExecutionService(clock, executor);
    const handle = service.start(snapshot);
    handleReference.current = handle;
    const summary = await handle.completion;

    expect(summary).toMatchObject({
      status: 'cancelled',
      logicalRequests: 3,
      attempts: 1,
      succeeded: 1,
      failed: 0,
      cancelled: 2,
    });
  });

  it('pauses new dispatches and resumes the same run', async () => {
    const clock = new RecordingClock();
    let executionCount = 0;
    let signalFirstStarted: (() => void) | undefined;
    let releaseFirst: (() => void) | undefined;
    const firstStarted = new Promise<void>((resolve) => {
      signalFirstStarted = resolve;
    });
    const firstRelease = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    const executor: RequestExecutor = {
      execute: async (): Promise<AttemptResult> => {
        executionCount += 1;
        if (executionCount === 1) {
          signalFirstStarted?.();
          await firstRelease;
        }
        return { statusCode: 200, latencyMs: 5 };
      },
    };
    const snapshot: TestRunSnapshot = {
      id: 'run-pause',
      endpoint: {
        method: 'GET',
        url: 'https://example.test/health',
        headers: {},
        timeoutMs: 5_000,
      },
      totalLogicalRequests: 3,
      requestsPerMinute: 60,
      maxConcurrency: 1,
      retry: { maxAttempts: 1, backoffMs: 0 },
      payloads: [null],
      randomSeed: 42,
    };

    const handle = new RunExecutionService(clock, executor).start(snapshot);
    await firstStarted;
    handle.pause();
    releaseFirst?.();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));

    expect(handle.getStatus()).toBe('paused');
    expect(executionCount).toBe(1);

    handle.resume();
    const summary = await handle.completion;
    expect(executionCount).toBe(3);
    expect(summary.status).toBe('completed');
  });

  it('publishes persisted progress as attempts complete', async () => {
    const clock = new RecordingClock();
    const attempts: number[] = [];
    const progress: number[] = [];
    const observer: RunExecutionObserver = {
      onAttempt: (attempt) => {
        attempts.push(attempt.logicalRequestSequence);
        return Promise.resolve();
      },
      onProgress: (current) => {
        progress.push(current.succeeded);
        return Promise.resolve();
      },
    };
    const executor: RequestExecutor = {
      execute: () => Promise.resolve({ statusCode: 200, latencyMs: 5 }),
    };
    const snapshot: TestRunSnapshot = {
      id: 'run-observed',
      endpoint: {
        method: 'GET',
        url: 'https://example.test/health',
        headers: {},
        timeoutMs: 5_000,
      },
      totalLogicalRequests: 2,
      requestsPerMinute: 60,
      maxConcurrency: 1,
      retry: { maxAttempts: 1, backoffMs: 0 },
      payloads: [null],
      randomSeed: 42,
    };

    await new RunExecutionService(clock, executor, observer).execute(snapshot);

    expect(attempts).toEqual([1, 2]);
    expect(progress).toEqual([1, 2]);
  });
});
