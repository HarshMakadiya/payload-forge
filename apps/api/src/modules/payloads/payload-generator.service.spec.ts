import { afterEach, describe, expect, it, vi } from 'vitest';
import { PayloadGeneratorService } from './payload-generator.service.js';

const previousEnvironment = {
  AI_API_KEY: process.env.AI_API_KEY,
  AI_BASE_URL: process.env.AI_BASE_URL,
  AI_MODEL: process.env.AI_MODEL,
  AI_PROVIDER: process.env.AI_PROVIDER,
  WEB_ORIGIN: process.env.WEB_ORIGIN,
};

afterEach(() => {
  vi.unstubAllGlobals();
  for (const [name, value] of Object.entries(previousEnvironment)) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
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

  it('generates schema-valid payloads through an OpenAI-compatible provider', async () => {
    process.env.AI_API_KEY = 'test-key';
    process.env.AI_PROVIDER = 'openai';
    process.env.AI_BASE_URL = 'https://provider.example/v1/';
    process.env.AI_MODEL = 'test-model';
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          choices: [
            {
              message: {
                content: '[{"email":"person@example.test"}]',
              },
            },
          ],
        }),
    } as Response);
    vi.stubGlobal('fetch', fetchMock);

    const result = await new PayloadGeneratorService().generate({
      description: 'Synthetic checkout customer',
      schema: {
        type: 'object',
        required: ['email'],
        properties: { email: { type: 'string' } },
      },
      count: 2,
      seedCount: 1,
      edgeCasePercent: 0,
      randomSeed: 7,
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [requestUrl, requestOptions] = fetchMock.mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(requestUrl).toBe('https://provider.example/v1/chat/completions');
    expect(requestOptions.headers).toMatchObject({
      authorization: 'Bearer test-key',
    });
    expect(result.payloads).toHaveLength(2);
    expect(
      result.payloads.every((payload) => typeof payload.email === 'string')
    ).toBe(true);
  });

  it('surfaces an OpenAI-compatible provider failure', async () => {
    process.env.AI_API_KEY = 'test-key';
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>().mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        text: () => Promise.resolve('quota exceeded'),
      } as Response)
    );

    await expect(
      new PayloadGeneratorService().generate({
        description: 'Synthetic checkout customer',
        count: 1,
        seedCount: 1,
        edgeCasePercent: 0,
        randomSeed: 7,
      })
    ).rejects.toThrow('AI Generation Provider error (429): quota exceeded');
  });
});
