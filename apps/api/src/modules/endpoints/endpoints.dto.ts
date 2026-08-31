import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

const MAX_OPENAPI_SOURCE_LENGTH = 2_000_000;

export class CreateEndpointDto {
  @IsUUID()
  projectId!: string;

  @IsString()
  name!: string;

  @IsIn(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'])
  method!: string;

  @IsString()
  path!: string;

  @IsOptional()
  @IsObject()
  headers?: Record<string, string>;

  @IsOptional()
  payloadSample?: unknown;

  @IsOptional()
  @IsObject()
  payloadSchema?: Record<string, unknown>;

  @IsOptional()
  @IsInt()
  @Min(100)
  @Max(120_000)
  timeoutMs?: number;
}

export class UpdateEndpointDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsIn(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'])
  method?: string;

  @IsOptional()
  @IsString()
  path?: string;

  @IsOptional()
  @IsObject()
  headers?: Record<string, string>;

  @IsOptional()
  payloadSample?: unknown;

  @IsOptional()
  @IsObject()
  payloadSchema?: Record<string, unknown>;

  @IsOptional()
  @IsInt()
  @Min(100)
  @Max(120_000)
  timeoutMs?: number;
}

export class PreviewOpenApiDto {
  @IsString()
  @MaxLength(MAX_OPENAPI_SOURCE_LENGTH)
  spec!: string;
}

export class ImportOpenApiDto extends PreviewOpenApiDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @ArrayUnique()
  @IsString({ each: true })
  operationKeys!: string[];
}
