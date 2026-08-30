import { IsInt, IsObject, IsOptional, Max, Min } from 'class-validator';

export class GeneratePayloadsDto {
  @IsObject()
  sample!: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  schema?: Record<string, unknown>;

  @IsInt()
  @Min(1)
  @Max(10_000)
  count!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  seedCount?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  edgeCasePercent?: number;

  @IsOptional()
  @IsInt()
  seed?: number;
}
