import type { AttemptResult } from '@payload-forge/shared';
import { BodyStore } from './body-store.js';
import type {
  ExecuteRequest,
  RequestExecutor,
} from './run-execution.service.js';
import { assertTargetAllowed, TargetPolicyError } from './target-policy.js';
import {
  redactBodyText,
  redactLiterals,
  redactUrl,
  redactValue,
} from './redaction.js';

export class HttpRequestExecutor implements RequestExecutor {
  constructor(private readonly bodyStore: BodyStore) {}

  async execute(request: ExecuteRequest): Promise<AttemptResult> {
    const startedAt = Date.now();
    const controller = new AbortController();
    let hasTimedOut = false;
    const abort = (): void => controller.abort();
    request.signal.addEventListener('abort', abort, { once: true });
    const timeout = setTimeout(() => {
      hasTimedOut = true;
      abort();
    }, request.snapshot.endpoint.timeoutMs);
    const payloadText =
      request.payload === null || request.payload === undefined
        ? undefined
        : JSON.stringify(request.payload);
    const persistedPayloadTextRaw =
      request.payload === null || request.payload === undefined
        ? undefined
        : JSON.stringify(
            redactValue(request.payload, request.snapshot.redactFields)
          );
    const bodyLimit = Number(process.env.MAX_CAPTURED_BODY_BYTES ?? 262_144);
    const captureBodies = process.env.CAPTURE_BODIES !== 'false';
    let requestBodyRef: string | undefined;
    const sensitiveFields = [
      ...request.snapshot.redactFields,
      'authorization',
      'cookie',
      'set-cookie',
      'x-api-key',
    ];
    const requestMetadata = {
      requestMethod: request.snapshot.endpoint.method,
      requestUrl: redactUrl(request.snapshot.endpoint.url, sensitiveFields),
      requestHeaders: redactValue(
        request.snapshot.endpoint.headers,
        sensitiveFields
      ) as Record<string, string>,
    };
    const secretLiterals = Object.entries(request.snapshot.endpoint.headers)
      .filter(([key]) =>
        sensitiveFields.some(
          (field) => field.toLowerCase() === key.toLowerCase()
        )
      )
      .map(([, value]) => value);
    const persistedPayloadText =
      persistedPayloadTextRaw === undefined
        ? undefined
        : redactLiterals(persistedPayloadTextRaw, secretLiterals);
    try {
      await assertTargetAllowed(new URL(request.snapshot.endpoint.url));
      if (captureBodies && persistedPayloadText !== undefined) {
        requestBodyRef = await this.bodyStore.put(
          `runs/${request.snapshot.id}/${request.logicalRequestSequence}-${request.attemptNumber}-request.json`,
          persistedPayloadText.slice(0, bodyLimit),
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
      const persistedResponseText = redactLiterals(
        redactBodyText(responseText, request.snapshot.redactFields),
        secretLiterals
      );
      const bodyTruncated =
        persistedResponseText.length > bodyLimit ||
        (persistedPayloadText?.length ?? 0) > bodyLimit;
      const responseBodyRef = captureBodies
        ? await this.bodyStore.put(
            `runs/${request.snapshot.id}/${request.logicalRequestSequence}-${request.attemptNumber}-response.txt`,
            persistedResponseText.slice(0, bodyLimit),
            response.headers.get('content-type') ?? 'text/plain'
          )
        : undefined;
      return {
        ...requestMetadata,
        statusCode: response.status,
        latencyMs: Date.now() - startedAt,
        ...(requestBodyRef === undefined ? {} : { requestBodyRef }),
        ...(responseBodyRef === undefined ? {} : { responseBodyRef }),
        bodyTruncated,
        searchText:
          `${persistedPayloadText ?? ''} ${persistedResponseText}`.slice(
            0,
            4_096
          ),
        responseHeaders: redactValue(
          Object.fromEntries(response.headers.entries()),
          sensitiveFields
        ) as Record<string, string>,
      };
    } catch (error: unknown) {
      const isCancelled = request.signal.aborted && !hasTimedOut;
      const message =
        error instanceof Error ? error.message : 'Unknown network error';
      return {
        ...requestMetadata,
        error: message,
        errorType: hasTimedOut
          ? 'timeout'
          : isCancelled
            ? 'cancelled'
            : error instanceof TargetPolicyError
              ? 'target-policy'
              : 'network',
        latencyMs: Date.now() - startedAt,
        ...(requestBodyRef === undefined ? {} : { requestBodyRef }),
        ...(persistedPayloadText === undefined
          ? {}
          : { searchText: persistedPayloadText.slice(0, 4_096) }),
      };
    } finally {
      clearTimeout(timeout);
      request.signal.removeEventListener('abort', abort);
    }
  }
}
