import type { TestRunSnapshot } from '@payload-forge/shared';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HttpRequestExecutor } from './http-request.executor.js';

describe('HttpRequestExecutor', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('does not send or persist a body for GET requests', async () => {
    vi.stubEnv('TARGET_HOST_ALLOWLIST', 'example.test');
    let requestOptions: RequestInit | undefined;
    const fetchMock = vi.fn(
      (_input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
        requestOptions = init;
        return Promise.resolve(new Response('healthy'));
      }
    );
    vi.stubGlobal('fetch', fetchMock);
    const storedKeys: string[] = [];
    const bodyStore = {
      put: vi.fn((key: string): Promise<string> => {
        storedKeys.push(key);
        return Promise.resolve('body-reference');
      }),
    };
    const snapshot: TestRunSnapshot = {
      id: 'run-get',
      endpoint: {
        method: 'GET',
        url: 'https://example.test/health',
        headers: {},
        timeoutMs: 5_000,
      },
      totalLogicalRequests: 1,
      requestsPerMinute: 1,
      rateStrategy: 'constant',
      maxConcurrency: 1,
      retry: { maxAttempts: 1, backoffMs: 0 },
      payloads: [{ stale: 'sample payload' }],
      environmentVariables: {},
      redactFields: [],
      workerVersion: 'test',
      targetAuthorizationAcknowledged: true,
      productionConfirmed: false,
      randomSeed: 1,
    };

    const executor = new HttpRequestExecutor(bodyStore as never);
    const result = await executor.execute({
      snapshot,
      logicalRequestSequence: 1,
      attemptNumber: 1,
      payload: { stale: 'sample payload' },
      signal: new AbortController().signal,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.test/health',
      expect.objectContaining({ method: 'GET' })
    );
    expect(requestOptions).toBeDefined();
    expect(requestOptions).not.toHaveProperty('body');
    expect(bodyStore.put).toHaveBeenCalledTimes(1);
    expect(storedKeys).toEqual([expect.stringContaining('-response.txt')]);
    expect(result.requestBodyRef).toBeUndefined();
  });
});
