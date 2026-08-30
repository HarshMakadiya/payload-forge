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
    sample: Record<string, unknown>,
    seedCount: number
  ): { estimatedInputTokens: number; estimatedOutputTokens: number } {
    const sampleCharacters = JSON.stringify(sample).length;
    return {
      estimatedInputTokens: Math.ceil(sampleCharacters / 4) + 250,
      estimatedOutputTokens: Math.ceil((sampleCharacters * seedCount) / 4),
    };
  }

  async generate(input: {
    readonly sample: Record<string, unknown>;
    readonly schema?: Record<string, unknown>;
    readonly count: number;
    readonly seedCount: number;
    readonly edgeCasePercent: number;
    readonly randomSeed: number;
  }): Promise<GenerationResult> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (apiKey === undefined) {
      throw new BadRequestException(
        'ANTHROPIC_API_KEY is required for AI payload generation'
      );
    }
    const seedCount = Math.min(input.seedCount, input.count);
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-20250514',
      max_tokens: 8_192,
      messages: [
        {
          role: 'user',
          content: [
            `Generate ${seedCount} realistic JSON payloads as one JSON array.`,
            'Return JSON only. Never include real personal data or secrets.',
            `Sample: ${JSON.stringify(input.sample)}`,
            input.schema === undefined
              ? ''
              : `JSON Schema: ${JSON.stringify(input.schema)}`,
          ].join('\n'),
        },
      ],
    });
    const text = response.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('');
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
