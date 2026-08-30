import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateEnvironmentDto } from './environments.dto.js';
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
}
