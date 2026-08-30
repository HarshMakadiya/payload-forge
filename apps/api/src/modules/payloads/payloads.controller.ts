import { BadRequestException, Body, Controller, Post } from '@nestjs/common';
import { GeneratePayloadsDto } from './payloads.dto.js';
import { PayloadGeneratorService } from './payload-generator.service.js';

@Controller('payloads')
export class PayloadsController {
  constructor(private readonly generator: PayloadGeneratorService) {}

  @Post('estimate')
  estimate(@Body() input: GeneratePayloadsDto): { data: unknown; error: null } {
    const source = this.requireSource(input);
    return {
      data: this.generator.estimate(
        source,
        input.seedCount ?? 25,
        input.description
      ),
      error: null,
    };
  }

  @Post('generate')
  async generate(
    @Body() input: GeneratePayloadsDto
  ): Promise<{ data: unknown; error: null }> {
    const source = this.requireSource(input);
    return {
      data: await this.generator.generate({
        sample: source,
        ...(input.description === undefined ? {} : { description: input.description }),
        ...(input.schema === undefined ? {} : { schema: input.schema }),
        ...(input.fieldRules === undefined
          ? {}
          : { fieldRules: input.fieldRules }),
        count: input.count,
        seedCount: input.seedCount ?? 25,
        edgeCasePercent: input.edgeCasePercent ?? 0,
        randomSeed: input.seed ?? Date.now(),
      }),
      error: null,
    };
  }

  private requireSource(
    input: GeneratePayloadsDto
  ): Record<string, unknown> {
    const source = input.sample ?? input.schema;
    if (source === undefined && (!input.description || input.description.trim() === '')) {
      throw new BadRequestException({
        code: 'PAYLOAD_SOURCE_REQUIRED',
        message: 'Provide either a description of the payload, a sample JSON, or a JSON Schema',
      });
    }
    return source ?? {};
  }
}
