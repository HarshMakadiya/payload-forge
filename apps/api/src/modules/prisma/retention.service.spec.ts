import { afterEach, describe, expect, it, vi } from 'vitest';
import { RetentionService } from './retention.service.js';

afterEach(() => vi.useRealTimers());

describe('RetentionService', () => {
  it('runs scheduled cleanup and stops scheduling after destruction', async () => {
    vi.useFakeTimers();
    const deleteMany = vi.fn().mockResolvedValue({ count: 0 });
    const service = new RetentionService({
      requestAttempt: { deleteMany },
    } as never);

    service.onModuleInit();
    await vi.advanceTimersByTimeAsync(24 * 60 * 60 * 1_000);
    expect(deleteMany).toHaveBeenCalledTimes(1);

    service.onModuleDestroy();
    await vi.advanceTimersByTimeAsync(24 * 60 * 60 * 1_000);
    expect(deleteMany).toHaveBeenCalledTimes(1);
  });
});
