import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import type { Prisma } from '@payload-forge/prisma';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateEndpointDto } from './endpoints.dto.js';

@Controller()
export class EndpointsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('projects/:projectId/endpoints')
  async list(
    @Param('projectId') projectId: string
  ): Promise<{ data: unknown; error: null }> {
    const endpoints = await this.prisma.endpoint.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
    return { data: endpoints, error: null };
  }

  @Post('endpoints')
  async create(
    @Body() input: CreateEndpointDto
  ): Promise<{ data: unknown; error: null }> {
    const endpoint = await this.prisma.endpoint.create({
      data: {
        projectId: input.projectId,
        name: input.name,
        method: input.method,
        path: input.path,
        headers: input.headers ?? {},
        ...(input.payloadSample === undefined
          ? {}
          : { payloadSample: input.payloadSample as Prisma.InputJsonValue }),
        ...(input.payloadSchema === undefined
          ? {}
          : { payloadSchema: input.payloadSchema as Prisma.InputJsonValue }),
        timeoutMs: input.timeoutMs ?? 5_000,
      },
    });
    return { data: endpoint, error: null };
  }
}
