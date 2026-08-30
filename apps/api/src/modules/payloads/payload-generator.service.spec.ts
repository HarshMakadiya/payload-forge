import { afterEach, describe, expect, it } from 'vitest';
import { PayloadGeneratorService } from './payload-generator.service.js';

const previousAiKey = process.env.AI_API_KEY;

afterEach(() => {
  if (previousAiKey === undefined) delete process.env.AI_API_KEY;
  else process.env.AI_API_KEY = previousAiKey;
});

describe('PayloadGeneratorService', () => {
  it('estimates token use for a seed batch', () => {
    const estimate = new PayloadGeneratorService().estimate({ name: 'A' }, 2);
    expect(estimate.estimatedInputTokens).toBeGreaterThan(250);
    expect(estimate.estimatedOutputTokens).toBeGreaterThan(0);
  });

  it('fails before any network call when no AI API key is configured', async () => {
    delete process.env.AI_API_KEY;

    await expect(
      new PayloadGeneratorService().generate({
        sample: { name: 'A' },
        count: 1,
        seedCount: 1,
        edgeCasePercent: 0,
        randomSeed: 1,
      })
    ).rejects.toThrow('AI_API_KEY');
  });
});
