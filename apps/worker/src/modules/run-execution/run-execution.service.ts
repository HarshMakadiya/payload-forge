import type {
  AttemptResult,
  RequestAttempt,
  RunSummary,
  TestRunSnapshot,
} from '@payload-forge/shared';

export interface ExecutionClock {
  now(): number;
  sleep(durationMs: number, signal?: AbortSignal): Promise<void>;
}

export interface ExecuteRequest {
  readonly snapshot: TestRunSnapshot;
  readonly logicalRequestSequence: number;
  readonly attemptNumber: number;
  readonly payload: unknown;
  readonly signal: AbortSignal;
}

export interface RequestExecutor {
  execute(request: ExecuteRequest): Promise<AttemptResult>;
}

export interface RunProgress {
  readonly attempts: number;
  readonly succeeded: number;
  readonly failed: number;
}

export interface RunExecutionObserver {
  onAttempt?(attempt: RequestAttempt): Promise<void>;
  onProgress?(progress: RunProgress): Promise<void>;
}

export interface RunExecutionHandle {
  readonly completion: Promise<RunSummary>;
  pause(): void;
  resume(): void;
  cancel(): void;
  getStatus(): 'running' | 'paused' | 'cancelled' | 'completed';
}

class RunControl {
  private status: 'running' | 'paused' | 'cancelled' | 'completed' = 'running';
  private resumeWaiters: Array<() => void> = [];
  readonly abortController = new AbortController();

  pause(): void {
    if (this.status === 'running') {
      this.status = 'paused';
    }
  }

  resume(): void {
    if (this.status !== 'paused') {
      return;
    }
    this.status = 'running';
    this.releaseWaiters();
  }

  cancel(): void {
    if (this.status === 'cancelled' || this.status === 'completed') {
      return;
    }
    this.status = 'cancelled';
    this.abortController.abort();
    this.releaseWaiters();
  }

  complete(): void {
    if (this.status !== 'cancelled') {
      this.status = 'completed';
    }
    this.releaseWaiters();
  }

  async waitUntilRunnable(): Promise<void> {
    if (this.status !== 'paused') {
      return;
    }
    await new Promise<void>((resolve) => this.resumeWaiters.push(resolve));
  }

  getStatus(): 'running' | 'paused' | 'cancelled' | 'completed' {
    return this.status;
  }

  private releaseWaiters(): void {
    for (const resolve of this.resumeWaiters.splice(0)) {
      resolve();
    }
  }
}

class RateGate {
  private tail: Promise<void> = Promise.resolve();
  private hasDispatchedAttempt = false;

  constructor(
    private readonly clock: ExecutionClock,
    private readonly intervalMs: number
  ) {}

  reserve(additionalDelayMs = 0): Promise<void> {
    const reservation = this.tail.then(async () => {
      if (this.hasDispatchedAttempt) {
        await this.clock.sleep(Math.max(this.intervalMs, additionalDelayMs));
      }
      this.hasDispatchedAttempt = true;
    });
    this.tail = reservation.catch(() => undefined);
    return reservation;
  }
}

export class RunExecutionService {
  private observerTail: Promise<void> = Promise.resolve();

  constructor(
    private readonly clock: ExecutionClock,
    private readonly requestExecutor: RequestExecutor,
    private readonly observer?: RunExecutionObserver
  ) {}

  start(snapshot: TestRunSnapshot): RunExecutionHandle {
    const control = new RunControl();
    return {
      completion: this.executeControlled(snapshot, control),
      pause: () => control.pause(),
      resume: () => control.resume(),
      cancel: () => control.cancel(),
      getStatus: () => control.getStatus(),
    };
  }

  async execute(snapshot: TestRunSnapshot): Promise<RunSummary> {
    return this.start(snapshot).completion;
  }

  private async executeControlled(
    snapshot: TestRunSnapshot,
    control: RunControl
  ): Promise<RunSummary> {
    const attemptsLog: RequestAttempt[] = [];
    let succeeded = 0;
    let failed = 0;
    const intervalMs = 60_000 / snapshot.requestsPerMinute;
    const rateGate = new RateGate(this.clock, intervalMs);
    let nextLogicalRequestSequence = 1;

    const executeLogicalRequest = async (
      logicalRequestSequence: number
    ): Promise<void> => {
      for (
        let attemptNumber = 1;
        attemptNumber <= snapshot.retry.maxAttempts;
        attemptNumber += 1
      ) {
        await control.waitUntilRunnable();
        if (control.getStatus() === 'cancelled') {
          return;
        }
        await rateGate.reserve(
          attemptNumber > 1 ? snapshot.retry.backoffMs : 0
        );
        if (control.getStatus() === 'cancelled') {
          return;
        }

        const startedAtMs = this.clock.now();
        const result = await this.requestExecutor.execute({
          snapshot,
          logicalRequestSequence,
          attemptNumber,
          payload:
            snapshot.payloads[
              (logicalRequestSequence - 1) % snapshot.payloads.length
            ],
          signal: control.abortController.signal,
        });
        const requestAttempt: RequestAttempt = {
          logicalRequestSequence,
          attemptNumber,
          startedAtMs,
          result,
        };
        attemptsLog.push(requestAttempt);
        await this.publishObserverEvent(() =>
          this.observer?.onAttempt?.(requestAttempt)
        );

        const isSuccessful =
          result.error === undefined &&
          result.statusCode !== undefined &&
          result.statusCode >= 200 &&
          result.statusCode < 300;
        if (isSuccessful) {
          succeeded += 1;
          await this.publishProgress(attemptsLog.length, succeeded, failed);
          break;
        }
        if (control.getStatus() === 'cancelled') {
          return;
        }
        if (attemptNumber === snapshot.retry.maxAttempts) {
          failed += 1;
          await this.publishProgress(attemptsLog.length, succeeded, failed);
        }
      }
    };

    const runWorker = async (): Promise<void> => {
      while (nextLogicalRequestSequence <= snapshot.totalLogicalRequests) {
        await control.waitUntilRunnable();
        if (control.getStatus() === 'cancelled') {
          return;
        }
        const logicalRequestSequence = nextLogicalRequestSequence;
        nextLogicalRequestSequence += 1;
        await executeLogicalRequest(logicalRequestSequence);
      }
    };

    const workerCount = Math.min(
      snapshot.maxConcurrency,
      snapshot.totalLogicalRequests
    );
    await Promise.all(
      Array.from({ length: workerCount }, async () => runWorker())
    );
    attemptsLog.sort(
      (left, right) =>
        left.logicalRequestSequence - right.logicalRequestSequence ||
        left.attemptNumber - right.attemptNumber
    );
    const wasCancelled = control.getStatus() === 'cancelled';
    control.complete();

    return {
      status: wasCancelled ? 'cancelled' : 'completed',
      logicalRequests: snapshot.totalLogicalRequests,
      attempts: attemptsLog.length,
      succeeded,
      failed,
      cancelled: wasCancelled
        ? snapshot.totalLogicalRequests - succeeded - failed
        : 0,
      attemptsLog,
    };
  }

  private async publishProgress(
    attempts: number,
    succeeded: number,
    failed: number
  ): Promise<void> {
    await this.publishObserverEvent(() =>
      this.observer?.onProgress?.({ attempts, succeeded, failed })
    );
  }

  private publishObserverEvent(
    publish: () => Promise<void> | undefined
  ): Promise<void> {
    const event = this.observerTail.then(async () => publish());
    this.observerTail = event.catch(() => undefined);
    return event;
  }
}
