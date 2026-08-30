import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsUUID,
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
  payloads?: unknown[];

  @IsOptional()
  @IsBoolean()
  productionConfirmed?: boolean;
}

export class ListAttemptsQuery {
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(200)
  pageSize?: number;

  @IsOptional()
  @IsInt()
  @Min(100)
  statusCode?: number;
}
