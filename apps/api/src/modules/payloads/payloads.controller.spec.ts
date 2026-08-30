import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { PayloadsController } from './payloads.controller.js';

describe('PayloadsController', () => {
  it('accepts a natural-language payload description without sample JSON', () => {
    const estimate = vi.fn().mockReturnValue({ estimatedInputTokens: 250 });
    const controller = new PayloadsController({ estimate } as never);

    expect(
      controller.estimate({
        description: 'Synthetic checkout customer',
        count: 10,
      })
    ).toEqual({ data: { estimatedInputTokens: 250 }, error: null });
    expect(estimate).toHaveBeenCalledWith(
      {},
      25,
      'Synthetic checkout customer'
    );
  });

  it('rejects generation with no description, sample, or schema', async () => {
    const controller = new PayloadsController({} as never);

    await expect(controller.generate({ count: 1 })).rejects.toBeInstanceOf(
      BadRequestException
    );
  });
});
