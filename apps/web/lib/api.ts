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
  readonly createdAt: string;
}

interface ApiEnvelope<T> {
  readonly data: T;
  readonly error: { readonly code: string; readonly message: string } | null;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/v1';

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
