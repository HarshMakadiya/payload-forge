import { BadRequestException, Injectable } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { Ajv } from 'ajv';

interface GenerationResult {
  readonly payloads: readonly Record<string, unknown>[];
  readonly seedCount: number;
  readonly estimatedInputTokens: number;
}

@Injectable()
export class PayloadGeneratorService {
  private readonly ajv = new Ajv({ allErrors: true, strict: false });

  estimate(
    sample: Record<string, unknown> | undefined,
    seedCount: number,
    description?: string
  ): { estimatedInputTokens: number; estimatedOutputTokens: number } {
    const sampleCharacters =
      JSON.stringify(sample ?? {}).length + (description?.length ?? 0);
    return {
      estimatedInputTokens: Math.ceil(sampleCharacters / 4) + 250,
      estimatedOutputTokens: Math.max(
        100,
        Math.ceil((Math.max(50, sampleCharacters) * seedCount) / 4)
      ),
    };
  }

  async generate(input: {
    readonly sample?: Record<string, unknown>;
    readonly schema?: Record<string, unknown>;
    readonly fieldRules?: Record<string, unknown>;
    readonly description?: string;
    readonly count: number;
    readonly seedCount: number;
    readonly edgeCasePercent: number;
    readonly randomSeed: number;
  }): Promise<GenerationResult> {
    const apiKey = process.env.AI_API_KEY;

    if (!apiKey) {
      throw new BadRequestException(
        'AI_API_KEY is required for AI payload generation'
      );
    }

    const seedCount = Math.min(input.seedCount, input.count);
    const hasSample = input.sample && Object.keys(input.sample).length > 0;
    const promptContent = [
      `Generate ${seedCount} realistic JSON payloads as one JSON array.`,
      'Return JSON only. Never include real personal data or secrets.',
      input.description && input.description.trim() !== ''
        ? `Payload Type / Purpose / Instructions: ${input.description.trim()}`
        : '',
      hasSample ? `Sample Seed Data: ${JSON.stringify(input.sample)}` : '',
      input.schema === undefined
        ? ''
        : `JSON Schema: ${JSON.stringify(input.schema)}`,
      input.fieldRules === undefined
        ? ''
        : `Field rules & constraints: ${JSON.stringify(input.fieldRules)}`,
    ]
      .filter(Boolean)
      .join('\n');

    let text = '';
    const provider = this.resolveProvider();

    if (provider === 'anthropic') {
      const client = new Anthropic({ apiKey });
      const model = process.env.AI_MODEL || 'claude-3-5-sonnet-latest';

      const response = await client.messages.create({
        model,
        max_tokens: 8_192,
        messages: [{ role: 'user', content: promptContent }],
      });
      text = response.content
        .filter((block) => block.type === 'text')
        .map((block) => block.text)
        .join('');
    } else {
      // Generic OpenAI / OpenAI-Compatible (OpenAI, Ollama, OpenRouter, Groq, Mistral, LocalAI, vLLM)
      const baseUrl = (
        process.env.AI_BASE_URL || 'https://api.openai.com/v1'
      ).replace(/\/+$/u, '');
      const model = process.env.AI_MODEL || 'gpt-4o-mini';

      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${apiKey}`,
          'HTTP-Referer': process.env.WEB_ORIGIN || 'http://localhost:3000',
          'X-Title': 'Payload Forge',
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'system',
              content:
                'You are a high-speed synthetic data generator that outputs strictly valid JSON arrays of objects.',
            },
            {
              role: 'user',
              content: promptContent,
            },
          ],
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new BadRequestException(
          `AI Generation Provider error (${response.status}): ${errorBody || response.statusText}`
        );
      }

      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      text = data.choices?.[0]?.message?.content ?? '';
    }

    const seeds = this.parseSeeds(text);
    const validate =
      input.schema === undefined ? undefined : this.ajv.compile(input.schema);
    if (validate !== undefined) {
      for (const payload of seeds) {
        if (!validate(payload)) {
          throw new BadRequestException({
            code: 'AI_PAYLOAD_SCHEMA_INVALID',
            errors: validate.errors,
          });
        }
      }
    }

    const random = this.createRandom(input.randomSeed);
    const payloads = Array.from({ length: input.count }, (_, index) => {
      const source = seeds[index % seeds.length];
      if (source === undefined) {
        throw new BadRequestException('AI returned no payload seeds');
      }
      return this.mutate(
        source,
        index,
        random,
        random() * 100 < input.edgeCasePercent
      ) as Record<string, unknown>;
    });

    if (validate !== undefined) {
      const validPayloads = payloads.filter((payload) => validate(payload));
      if (validPayloads.length !== payloads.length) {
        throw new BadRequestException({
          code: 'EXPANDED_PAYLOAD_SCHEMA_INVALID',
          message: 'Programmatic expansion produced an invalid payload',
        });
      }
    }

    const estimate = this.estimate(input.sample, seedCount);
    return {
      payloads,
      seedCount,
      estimatedInputTokens: estimate.estimatedInputTokens,
    };
  }

  private resolveProvider(): 'anthropic' | 'openai-compatible' {
    const specified = process.env.AI_PROVIDER?.toLowerCase().trim();
    if (specified === 'anthropic') return 'anthropic';
    return 'openai-compatible';
  }

  private parseSeeds(text: string): Record<string, unknown>[] {
    const normalized = text
      .trim()
      .replace(/^```(?:json)?\s*/u, '')
      .replace(/\s*```$/u, '');
    let parsed: unknown;
    try {
      parsed = JSON.parse(normalized);
    } catch {
      throw new BadRequestException('AI returned invalid JSON');
    }
    if (
      !Array.isArray(parsed) ||
      parsed.some(
        (item) =>
          typeof item !== 'object' || item === null || Array.isArray(item)
      )
    ) {
      throw new BadRequestException('AI response must be an array of objects');
    }
    return parsed as Record<string, unknown>[];
  }

  private createRandom(seed: number): () => number {
    let state = seed >>> 0;
    return () => {
      state = (state * 1_664_525 + 1_013_904_223) >>> 0;
      return state / 4_294_967_296;
    };
  }

  private mutate(
    value: unknown,
    index: number,
    random: () => number,
    injectEdgeCase: boolean
  ): unknown {
    if (value === null) {
      return value;
    }
    if (Array.isArray(value)) {
      return value.map((item) =>
        this.mutate(item, index, random, injectEdgeCase)
      );
    }
    if (typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value).map(([key, item]) => [
          key,
          this.mutate(item, index, random, injectEdgeCase),
        ])
      );
    }
    if (typeof value === 'string') {
      if (injectEdgeCase && random() < 0.15) {
        return '';
      }
      if (value.includes('@')) {
        return `test-${index}-${Math.floor(random() * 1_000_000)}@example.test`;
      }
      return `${value}-${index}-${Math.floor(random() * 10_000)}`;
    }
    if (typeof value === 'number') {
      if (injectEdgeCase && random() < 0.15) {
        return 0;
      }
      return value + index + Math.floor(random() * 10);
    }
    return value;
  }
}
