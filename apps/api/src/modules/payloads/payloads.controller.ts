import { Body, Controller, Post } from '@nestjs/common';
import { GeneratePayloadsDto } from './payloads.dto.js';
import { PayloadGeneratorService } from './payload-generator.service.js';

@Controller('payloads')
export class PayloadsController {
  constructor(private readonly generator: PayloadGeneratorService) {}

  @Post('estimate')
  estimate(@Body() input: GeneratePayloadsDto): { data: unknown; error: null } {
    return {
      data: this.generator.estimate(input.sample, input.seedCount ?? 25),
      error: null,
    };
  }

  @Post('generate')
  async generate(
    @Body() input: GeneratePayloadsDto
  ): Promise<{ data: unknown; error: null }> {
    return {
      data: await this.generator.generate({
        sample: input.sample,
        ...(input.schema === undefined ? {} : { schema: input.schema }),
        count: input.count,
        seedCount: input.seedCount ?? 25,
        edgeCasePercent: input.edgeCasePercent ?? 0,
        randomSeed: input.seed ?? Date.now(),
      }),
      error: null,
    };
  }
}
