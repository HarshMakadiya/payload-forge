import { afterEach, describe, expect, it } from 'vitest';
import { PayloadGeneratorService } from './payload-generator.service.js';

const previousApiKey = process.env.ANTHROPIC_API_KEY;

afterEach(() => {
  if (previousApiKey === undefined) delete process.env.ANTHROPIC_API_KEY;
  else process.env.ANTHROPIC_API_KEY = previousApiKey;
});

describe('PayloadGeneratorService', () => {
  it('estimates token use for a seed batch', () => {
    const estimate = new PayloadGeneratorService().estimate({ name: 'A' }, 2);
    expect(estimate.estimatedInputTokens).toBeGreaterThan(250);
    expect(estimate.estimatedOutputTokens).toBeGreaterThan(0);
  });

  it('fails before any network call when the Anthropic key is absent', async () => {
    delete process.env.ANTHROPIC_API_KEY;
    await expect(
      new PayloadGeneratorService().generate({
        sample: { name: 'A' },
        count: 1,
        seedCount: 1,
        edgeCasePercent: 0,
        randomSeed: 1,
      })
    ).rejects.toThrow('ANTHROPIC_API_KEY');
  });
});
