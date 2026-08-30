import { BadRequestException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { RunsService } from './runs.service.js';

describe('RunsService control', () => {
  it('rejects a missing run', async () => {
    const service = new RunsService(
      { testRun: { findUnique: vi.fn().mockResolvedValue(null) } } as never,
      {} as never
    );
    await expect(service.control('missing', 'pause')).rejects.toBeInstanceOf(
      NotFoundException
    );
  });

  it('rejects an invalid status transition', async () => {
    const service = new RunsService(
      {
        testRun: {
          findUnique: vi.fn().mockResolvedValue({ status: 'COMPLETED' }),
        },
      } as never,
      {} as never
    );
    await expect(service.control('run-1', 'pause')).rejects.toBeInstanceOf(
      BadRequestException
    );
  });

  it('publishes and persists a valid pause', async () => {
    const update = vi.fn().mockResolvedValue({ status: 'PAUSED' });
    const control = vi.fn().mockResolvedValue(undefined);
    const service = new RunsService(
      {
        testRun: {
          findUnique: vi.fn().mockResolvedValue({ status: 'RUNNING' }),
          update,
        },
      } as never,
      { control } as never
    );

    await service.control('run-1', 'pause');
    expect(control).toHaveBeenCalledWith('run-1', 'pause');
    expect(update).toHaveBeenCalledWith({
      where: { id: 'run-1' },
      data: { status: 'PAUSED' },
    });
  });
});
