import { Type } from 'class-transformer';
import {
  IsArray,
  ArrayMinSize,
  IsBoolean,
  IsInt,
  IsOptional,
  IsUUID,
  IsString,
  IsIn,
  Max,
  Min,
} from 'class-validator';

export class CreateRunDto {
  @IsUUID()
  projectId!: string;

  @IsUUID()
  environmentId!: string;

  @IsUUID()
  endpointId!: string;

  @IsInt()
  @Min(1)
  @Max(1_000_000)
  totalLogicalRequests!: number;

  @IsInt()
  @Min(1)
  durationMinutes!: number;

  @IsIn(['constant', 'burst'])
  rateStrategy: 'constant' | 'burst' = 'constant';

  @IsInt()
  @Min(1)
  @Max(500)
  maxConcurrency!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  maxAttempts?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(60_000)
  retryBackoffMs?: number;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  payloads?: unknown[];

  @IsOptional()
  @IsUUID()
  payloadTemplateId?: string;

  @IsBoolean()
  ownershipAcknowledged!: boolean;

  @IsOptional()
  @IsBoolean()
  productionConfirmed?: boolean;
}

export class ListAttemptsQuery {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  pageSize?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(100)
  statusCode?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minLatencyMs?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxLatencyMs?: number;

  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsString()
  errorType?: string;
}

export class UpdateRunStatusDto {
  @IsIn(['PAUSED', 'RUNNING', 'CANCELLED'])
  status!: 'PAUSED' | 'RUNNING' | 'CANCELLED';
}

export class PurgeProjectRunDataDto {
  @IsBoolean()
  confirmed!: boolean;
}
