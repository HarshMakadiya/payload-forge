import { IsArray, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateProjectDto {
  @IsString()
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1_000)
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  redactFields?: string[];
}

export class UpdateProjectDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1_000)
  description?: string | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  redactFields?: string[];
}
