import type { ExecutionClock } from './run-execution.service.js';

export class RealClock implements ExecutionClock {
  now(): number {
    return Date.now();
  }

  async sleep(durationMs: number, signal?: AbortSignal): Promise<void> {
    if (signal?.aborted === true) {
      return;
    }
    await new Promise<void>((resolve) => {
      const timeout = setTimeout(resolve, durationMs);
      signal?.addEventListener(
        'abort',
        () => {
          clearTimeout(timeout);
          resolve();
        },
        { once: true }
      );
    });
  }
}
