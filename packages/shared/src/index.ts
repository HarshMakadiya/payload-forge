export type RunStatus =
  'queued' | 'running' | 'paused' | 'completed' | 'cancelled' | 'interrupted';

export {
  decodeEncryptionKey,
  decryptSecretMap,
  encryptSecretMap,
} from './secret-crypto.js';

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
  readonly rateStrategy: 'constant' | 'burst';
  readonly maxConcurrency: number;
  readonly retry: {
    readonly maxAttempts: number;
    readonly backoffMs: number;
  };
  readonly payloads: readonly unknown[];
  readonly environmentVariables: Readonly<Record<string, unknown>>;
  readonly redactFields: readonly string[];
  readonly payloadTemplateVersion?: number;
  readonly assertionVersion?: number;
  readonly workerVersion: string;
  readonly targetAuthorizationAcknowledged: true;
  readonly productionConfirmed: boolean;
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
  readonly errorType?: 'timeout' | 'network' | 'cancelled' | 'target-policy';
  readonly searchText?: string;
  readonly requestMethod?: string;
  readonly requestUrl?: string;
  readonly requestHeaders?: Readonly<Record<string, string>>;
  readonly responseHeaders?: Readonly<Record<string, string>>;
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
  readonly durationMs: number;
  readonly actualRequestsPerSecond: number;
  readonly latencyPercentiles: {
    readonly p50: number;
    readonly p90: number;
    readonly p95: number;
    readonly p99: number;
  };
  readonly errorBreakdown: Readonly<Record<string, number>>;
  readonly attemptsLog: readonly RequestAttempt[];
}
