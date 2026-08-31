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
  readonly queued: number;
  readonly inFlight: number;
  readonly timedOut: number;
  readonly cancelled: number;
}

export interface RunExecutionObserver {
  onAttempt?(attempt: RequestAttempt): Promise<void>;
  onProgress?(progress: RunProgress): Promise<void>;
  onCircuitBreaker?(event: {
    readonly completedRequests: number;
    readonly failedRequests: number;
    readonly errorRate: number;
    readonly action: 'pause';
  }): Promise<void>;
}

export interface RunExecutionHandle {
  readonly completion: Promise<RunSummary>;
  pause(): void;
  resume(): void;
  cancel(): void;
  setThrottlePercent(throttlePercent: number): void;
  getStatus(): 'running' | 'paused' | 'cancelled' | 'completed';
}

class RunControl {
  private status: 'running' | 'paused' | 'cancelled' | 'completed' = 'running';
  private resumeWaiters: Array<() => void> = [];
  private throttlePercent = 100;
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

  setThrottlePercent(throttlePercent: number): void {
    this.throttlePercent = Math.max(10, Math.min(100, throttlePercent));
  }

  getThrottlePercent(): number {
    return this.throttlePercent;
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
    private readonly getIntervalMs: () => number
  ) {}

  reserve(additionalDelayMs = 0, signal?: AbortSignal): Promise<void> {
    const reservation = this.tail.then(async () => {
      if (this.hasDispatchedAttempt) {
        await this.clock.sleep(
          Math.max(this.getIntervalMs(), additionalDelayMs),
          signal
        );
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
    control.setThrottlePercent(snapshot.throttlePercent ?? 100);
    return {
      completion: this.executeControlled(snapshot, control),
      pause: () => control.pause(),
      resume: () => control.resume(),
      cancel: () => control.cancel(),
      setThrottlePercent: (throttlePercent) =>
        control.setThrottlePercent(throttlePercent),
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
    const runStartedAtMs = this.clock.now();
    const attemptsLog: RequestAttempt[] = [];
    let succeeded = 0;
    let failed = 0;
    let dispatchedLogicalRequests = 0;
    let inFlight = 0;
    let timedOut = 0;
    let circuitBreakerTripped = false;
    const circuitBreaker = snapshot.circuitBreaker ?? {
      minCompletedRequests: 20,
      errorRateThreshold: 0.2,
      action: 'pause' as const,
    };
    const baseIntervalMs = 60_000 / snapshot.requestsPerMinute;
    const rateGate = new RateGate(this.clock, () =>
      snapshot.rateStrategy === 'burst'
        ? 0
        : baseIntervalMs * (100 / control.getThrottlePercent())
    );
    let nextLogicalRequestSequence = 1;

    const evaluateCircuitBreaker = async (): Promise<void> => {
      const completedRequests = succeeded + failed;
      if (
        circuitBreakerTripped ||
        completedRequests < circuitBreaker.minCompletedRequests ||
        failed / completedRequests < circuitBreaker.errorRateThreshold
      ) {
        return;
      }
      circuitBreakerTripped = true;
      control.pause();
      await this.publishObserverEvent(() =>
        this.observer?.onCircuitBreaker?.({
          completedRequests,
          failedRequests: failed,
          errorRate: failed / completedRequests,
          action: circuitBreaker.action,
        })
      );
    };

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
        if (attemptNumber === 1 && snapshot.rateStrategy === 'burst') {
          await this.waitForBurstWave(
            snapshot,
            logicalRequestSequence,
            runStartedAtMs,
            control
          );
        }
        await rateGate.reserve(
          attemptNumber > 1
            ? snapshot.retry.backoffMs +
                Math.floor(
                  snapshot.retry.backoffMs *
                    0.2 *
                    this.seededFraction(
                      snapshot.randomSeed,
                      logicalRequestSequence,
                      attemptNumber
                    )
                )
            : 0,
          control.abortController.signal
        );
        // A pause can arrive while this lane waits for its rate reservation.
        await control.waitUntilRunnable();
        if (control.getStatus() === 'cancelled') {
          return;
        }

        const startedAtMs = this.clock.now();
        if (attemptNumber === 1) dispatchedLogicalRequests += 1;
        inFlight += 1;
        await this.publishProgress({
          attempts: attemptsLog.length,
          succeeded,
          failed,
          queued: snapshot.totalLogicalRequests - dispatchedLogicalRequests,
          inFlight,
          timedOut,
          cancelled: 0,
        });
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
        inFlight -= 1;
        if (result.errorType === 'timeout') timedOut += 1;
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
          await this.publishProgress({
            attempts: attemptsLog.length,
            succeeded,
            failed,
            queued: snapshot.totalLogicalRequests - dispatchedLogicalRequests,
            inFlight,
            timedOut,
            cancelled: 0,
          });
          await evaluateCircuitBreaker();
          break;
        }
        if (control.getStatus() === 'cancelled') {
          return;
        }
        if (attemptNumber === snapshot.retry.maxAttempts) {
          failed += 1;
          await this.publishProgress({
            attempts: attemptsLog.length,
            succeeded,
            failed,
            queued: snapshot.totalLogicalRequests - dispatchedLogicalRequests,
            inFlight,
            timedOut,
            cancelled: 0,
          });
          await evaluateCircuitBreaker();
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

    const durationMs = Math.max(0, this.clock.now() - runStartedAtMs);
    const latencies = attemptsLog.map((attempt) => attempt.result.latencyMs);
    return {
      status: wasCancelled ? 'cancelled' : 'completed',
      logicalRequests: snapshot.totalLogicalRequests,
      attempts: attemptsLog.length,
      succeeded,
      failed,
      cancelled: wasCancelled
        ? snapshot.totalLogicalRequests - succeeded - failed
        : 0,
      durationMs,
      actualRequestsPerSecond:
        durationMs === 0
          ? attemptsLog.length
          : attemptsLog.length / (durationMs / 1_000),
      latencyPercentiles: {
        p50: this.percentile(latencies, 50),
        p90: this.percentile(latencies, 90),
        p95: this.percentile(latencies, 95),
        p99: this.percentile(latencies, 99),
      },
      errorBreakdown: attemptsLog.reduce<Record<string, number>>(
        (breakdown, attempt) => {
          const key =
            attempt.result.errorType ??
            (attempt.result.statusCode === undefined
              ? 'unknown'
              : String(attempt.result.statusCode));
          if (
            attempt.result.error !== undefined ||
            (attempt.result.statusCode !== undefined &&
              (attempt.result.statusCode < 200 ||
                attempt.result.statusCode >= 300))
          ) {
            breakdown[key] = (breakdown[key] ?? 0) + 1;
          }
          return breakdown;
        },
        {}
      ),
      attemptsLog,
    };
  }

  private async waitForBurstWave(
    snapshot: TestRunSnapshot,
    logicalRequestSequence: number,
    runStartedAtMs: number,
    control: RunControl
  ): Promise<void> {
    const waveCount = Math.min(10, snapshot.totalLogicalRequests);
    if (waveCount <= 1) return;
    const waveSize = Math.ceil(snapshot.totalLogicalRequests / waveCount);
    const waveIndex = Math.floor((logicalRequestSequence - 1) / waveSize);
    const durationMs =
      snapshot.durationMs ??
      (snapshot.totalLogicalRequests / snapshot.requestsPerMinute) * 60_000;
    while (control.getStatus() !== 'cancelled') {
      const targetOffsetMs =
        ((durationMs * waveIndex) / (waveCount - 1)) *
        (100 / control.getThrottlePercent());
      const delayMs = runStartedAtMs + targetOffsetMs - this.clock.now();
      if (delayMs <= 0) return;
      await this.clock.sleep(
        Math.min(delayMs, 1_000),
        control.abortController.signal
      );
    }
  }

  private percentile(values: readonly number[], percentile: number): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((left, right) => left - right);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)] ?? 0;
  }

  private seededFraction(
    seed: number,
    sequence: number,
    attemptNumber: number
  ): number {
    let state = (seed ^ sequence ^ (attemptNumber << 16)) >>> 0;
    state = (state * 1_664_525 + 1_013_904_223) >>> 0;
    return state / 4_294_967_296;
  }

  private async publishProgress(progress: RunProgress): Promise<void> {
    await this.publishObserverEvent(() =>
      this.observer?.onProgress?.(progress)
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
