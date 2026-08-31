import { describe, expect, it, vi } from 'vitest';
import { RunsController } from './runs.controller.js';

describe('RunsController attempt filters', () => {
  it.each([
    ['2xx', { statusCode: { gte: 200, lt: 300 } }],
    ['errors', { statusCode: { gte: 400, lt: 600 } }],
    ['timeouts', { errorType: 'timeout' }],
  ] as const)(
    'maps %s to an accurate database filter',
    async (group, filter) => {
      const findMany = vi
        .fn<(input: { where: Record<string, unknown> }) => Promise<unknown[]>>()
        .mockResolvedValue([]);
      const count = vi
        .fn<(input: { where: Record<string, unknown> }) => Promise<number>>()
        .mockResolvedValue(0);
      const controller = new RunsController(
        {} as never,
        { requestAttempt: { findMany, count } } as never,
        {} as never
      );

      await controller.attempts('run-1', { statusGroup: group });

      expect(findMany.mock.calls[0]?.[0].where).toMatchObject({
        testRunId: 'run-1',
        ...filter,
      });
      expect(count.mock.calls[0]?.[0].where).toMatchObject({
        testRunId: 'run-1',
        ...filter,
      });
    }
  );
});
