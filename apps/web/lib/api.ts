export interface Project {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
}

export interface Environment {
  readonly id: string;
  readonly name: string;
  readonly baseUrl: string;
  readonly kind: 'DEVELOPMENT' | 'STAGING' | 'PRODUCTION';
}

export interface Endpoint {
  readonly id: string;
  readonly name: string;
  readonly method: string;
  readonly path: string;
}

export interface TestRun {
  readonly id: string;
  readonly status: string;
  readonly totalLogicalRequests: number;
  readonly requestsPerMinute: number;
  readonly succeeded: number;
  readonly failed: number;
  readonly cancelled: number;
  readonly attemptCount: number;
  readonly queued: number;
  readonly inFlight: number;
  readonly timedOut: number;
  readonly createdAt: string;
  readonly summary: {
    readonly actualRequestsPerSecond: number;
    readonly latencyPercentiles: {
      readonly p50: number;
      readonly p90: number;
      readonly p95: number;
      readonly p99: number;
    };
    readonly errorBreakdown: Readonly<Record<string, number>>;
  } | null;
}

export interface PayloadTemplate {
  readonly id: string;
  readonly name: string;
  readonly version: number;
  readonly endpointId: string;
  readonly payloads: readonly unknown[];
}

export interface RequestAttempt {
  readonly id: string;
  readonly logicalRequestSequence: number;
  readonly attemptNumber: number;
  readonly startedAt: string;
  readonly statusCode: number | null;
  readonly requestMethod: string;
  readonly requestUrl: string;
  readonly requestHeaders: Readonly<Record<string, string>>;
  readonly responseHeaders: Readonly<Record<string, string>> | null;
  readonly error: string | null;
  readonly errorType: string | null;
  readonly latencyMs: number;
  readonly requestBodyRef: string | null;
  readonly responseBodyRef: string | null;
  readonly bodyTruncated: boolean;
}

interface ApiEnvelope<T> {
  readonly data: T;
  readonly error: { readonly code: string; readonly message: string } | null;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/v1';
export const API_ORIGIN =
  process.env.NEXT_PUBLIC_API_ORIGIN ?? 'http://localhost:4000';

export async function apiRequest<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'content-type': 'application/json',
      ...options?.headers,
    },
  });
  const envelope = (await response.json()) as ApiEnvelope<T>;
  if (!response.ok || envelope.error !== null) {
    throw new Error(
      envelope.error?.message ?? `Request failed: ${response.status}`
    );
  }
  return envelope.data;
}
