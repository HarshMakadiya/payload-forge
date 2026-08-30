import type { AttemptResult } from '@payload-forge/shared';
import { BodyStore } from './body-store.js';
import type {
  ExecuteRequest,
  RequestExecutor,
} from './run-execution.service.js';
import { assertTargetAllowed } from './target-policy.js';

export class HttpRequestExecutor implements RequestExecutor {
  constructor(private readonly bodyStore: BodyStore) {}

  async execute(request: ExecuteRequest): Promise<AttemptResult> {
    const startedAt = Date.now();
    const controller = new AbortController();
    const abort = (): void => controller.abort();
    request.signal.addEventListener('abort', abort, { once: true });
    const timeout = setTimeout(abort, request.snapshot.endpoint.timeoutMs);
    const payloadText =
      request.payload === null || request.payload === undefined
        ? undefined
        : JSON.stringify(request.payload);
    const bodyLimit = Number(process.env.MAX_CAPTURED_BODY_BYTES ?? 262_144);
    const captureBodies = process.env.CAPTURE_BODIES !== 'false';
    let requestBodyRef: string | undefined;
    try {
      await assertTargetAllowed(new URL(request.snapshot.endpoint.url));
      if (captureBodies && payloadText !== undefined) {
        requestBodyRef = await this.bodyStore.put(
          `runs/${request.snapshot.id}/${request.logicalRequestSequence}-${request.attemptNumber}-request.json`,
          payloadText.slice(0, bodyLimit),
          'application/json'
        );
      }
      const response = await fetch(request.snapshot.endpoint.url, {
        method: request.snapshot.endpoint.method,
        headers: {
          'content-type': 'application/json',
          ...request.snapshot.endpoint.headers,
        },
        ...(payloadText === undefined ? {} : { body: payloadText }),
        signal: controller.signal,
        redirect: 'error',
      });
      const responseText = await response.text();
      const bodyTruncated = responseText.length > bodyLimit;
      const responseBodyRef = captureBodies
        ? await this.bodyStore.put(
            `runs/${request.snapshot.id}/${request.logicalRequestSequence}-${request.attemptNumber}-response.txt`,
            responseText.slice(0, bodyLimit),
            response.headers.get('content-type') ?? 'text/plain'
          )
        : undefined;
      return {
        statusCode: response.status,
        latencyMs: Date.now() - startedAt,
        ...(requestBodyRef === undefined ? {} : { requestBodyRef }),
        ...(responseBodyRef === undefined ? {} : { responseBodyRef }),
        bodyTruncated,
      };
    } catch (error: unknown) {
      return {
        error: error instanceof Error ? error.message : 'Unknown network error',
        latencyMs: Date.now() - startedAt,
        ...(requestBodyRef === undefined ? {} : { requestBodyRef }),
      };
    } finally {
      clearTimeout(timeout);
      request.signal.removeEventListener('abort', abort);
    }
  }
}
