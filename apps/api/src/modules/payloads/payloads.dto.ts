import {
  IsArray,
  ArrayMinSize,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class GeneratePayloadsDto {
  @IsOptional()
  @IsObject()
  sample?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  schema?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  fieldRules?: Record<string, unknown>;

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

export class SavePayloadTemplateDto {
  @IsUUID()
  projectId!: string;

  @IsUUID()
  endpointId!: string;

  @IsString()
  name!: string;

  @IsArray()
  @ArrayMinSize(1)
  payloads!: unknown[];

  @IsString()
  source!: string;
}
