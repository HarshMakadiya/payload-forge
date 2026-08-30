import {
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  CreateEnvironmentDto,
  UpdateEnvironmentDto,
} from './environments.dto.js';
import { SecretsService } from './secrets.service.js';

@Controller()
export class EnvironmentsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly secrets: SecretsService
  ) {}

  @Get('projects/:projectId/environments')
  async list(
    @Param('projectId') projectId: string
  ): Promise<{ data: unknown; error: null }> {
    const environments = await this.prisma.environment.findMany({
      where: { projectId },
      select: {
        id: true,
        projectId: true,
        name: true,
        baseUrl: true,
        kind: true,
        variables: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return { data: environments, error: null };
  }

  @Post('environments')
  async create(
    @Body() input: CreateEnvironmentDto
  ): Promise<{ data: unknown; error: null }> {
    const environment = await this.prisma.environment.create({
      data: {
        projectId: input.projectId,
        name: input.name,
        baseUrl: input.baseUrl,
        kind: input.isProduction === true ? 'PRODUCTION' : 'DEVELOPMENT',
        variables: input.variables ?? {},
        encryptedSecrets:
          input.secrets === undefined
            ? null
            : this.secrets.encrypt(input.secrets),
      },
      select: {
        id: true,
        projectId: true,
        name: true,
        baseUrl: true,
        kind: true,
        variables: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return { data: environment, error: null };
  }

  @Get('environments/:environmentId')
  async get(
    @Param('environmentId') environmentId: string
  ): Promise<{ data: unknown; error: null }> {
    return {
      data: await this.prisma.environment.findUniqueOrThrow({
        where: { id: environmentId },
        select: {
          id: true,
          projectId: true,
          name: true,
          baseUrl: true,
          kind: true,
          variables: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      error: null,
    };
  }

  @Patch('environments/:environmentId')
  async update(
    @Param('environmentId') environmentId: string,
    @Body() input: UpdateEnvironmentDto
  ): Promise<{ data: unknown; error: null }> {
    const environment = await this.prisma.environment.update({
      where: { id: environmentId },
      data: {
        ...(input.name === undefined ? {} : { name: input.name }),
        ...(input.baseUrl === undefined ? {} : { baseUrl: input.baseUrl }),
        ...(input.isProduction === undefined
          ? {}
          : { kind: input.isProduction ? 'PRODUCTION' : 'DEVELOPMENT' }),
        ...(input.variables === undefined
          ? {}
          : { variables: input.variables }),
        ...(input.secrets === undefined
          ? {}
          : { encryptedSecrets: this.secrets.encrypt(input.secrets) }),
      },
      select: {
        id: true,
        projectId: true,
        name: true,
        baseUrl: true,
        kind: true,
        variables: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return { data: environment, error: null };
  }

  @Delete('environments/:environmentId')
  async remove(
    @Param('environmentId') environmentId: string
  ): Promise<{ data: unknown; error: null }> {
    const usedByRun = await this.prisma.testRun.findFirst({
      where: { environmentId },
      select: { id: true },
    });
    if (usedByRun !== null) {
      throw new ConflictException({
        code: 'ENVIRONMENT_HAS_TEST_RUNS',
        message: 'Delete Test Run data before deleting an Environment',
      });
    }
    const environment = await this.prisma.environment.delete({
      where: { id: environmentId },
      select: {
        id: true,
        projectId: true,
        name: true,
        baseUrl: true,
        kind: true,
        variables: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return { data: environment, error: null };
  }
}
