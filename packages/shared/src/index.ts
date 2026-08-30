export type RunStatus =
  'queued' | 'running' | 'paused' | 'completed' | 'cancelled' | 'interrupted';

export interface EndpointSnapshot {
  readonly method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  readonly url: string;
  readonly headers: Readonly<Record<string, string>>;
  readonly timeoutMs: number;
}

export interface TestRunSnapshot {
  readonly id: string;
  readonly endpoint: EndpointSnapshot;
  readonly totalLogicalRequests: number;
  readonly requestsPerMinute: number;
  readonly maxConcurrency: number;
  readonly retry: {
    readonly maxAttempts: number;
    readonly backoffMs: number;
  };
  readonly payloads: readonly unknown[];
  readonly randomSeed: number;
}

export interface RunJobData {
  readonly snapshot: TestRunSnapshot;
  readonly encryptedSecretHeaders?: string;
}

export interface AttemptResult {
  readonly statusCode?: number;
  readonly error?: string;
  readonly latencyMs: number;
  readonly requestBodyRef?: string;
  readonly responseBodyRef?: string;
  readonly bodyTruncated?: boolean;
}

export interface RequestAttempt {
  readonly logicalRequestSequence: number;
  readonly attemptNumber: number;
  readonly startedAtMs: number;
  readonly result: AttemptResult;
}

export interface RunSummary {
  readonly status: RunStatus;
  readonly logicalRequests: number;
  readonly attempts: number;
  readonly succeeded: number;
  readonly failed: number;
  readonly cancelled: number;
  readonly attemptsLog: readonly RequestAttempt[];
}
