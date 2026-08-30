import {
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

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
