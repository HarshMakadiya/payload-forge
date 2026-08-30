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
import type { Prisma } from '@payload-forge/prisma';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateEndpointDto, UpdateEndpointDto } from './endpoints.dto.js';

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

  @Get('endpoints/:endpointId')
  async get(
    @Param('endpointId') endpointId: string
  ): Promise<{ data: unknown; error: null }> {
    return {
      data: await this.prisma.endpoint.findUniqueOrThrow({
        where: { id: endpointId },
      }),
      error: null,
    };
  }

  @Patch('endpoints/:endpointId')
  async update(
    @Param('endpointId') endpointId: string,
    @Body() input: UpdateEndpointDto
  ): Promise<{ data: unknown; error: null }> {
    const endpoint = await this.prisma.endpoint.update({
      where: { id: endpointId },
      data: {
        ...(input.name === undefined ? {} : { name: input.name }),
        ...(input.method === undefined ? {} : { method: input.method }),
        ...(input.path === undefined ? {} : { path: input.path }),
        ...(input.headers === undefined ? {} : { headers: input.headers }),
        ...(input.payloadSample === undefined
          ? {}
          : { payloadSample: input.payloadSample as Prisma.InputJsonValue }),
        ...(input.payloadSchema === undefined
          ? {}
          : { payloadSchema: input.payloadSchema as Prisma.InputJsonValue }),
        ...(input.timeoutMs === undefined
          ? {}
          : { timeoutMs: input.timeoutMs }),
      },
    });
    return { data: endpoint, error: null };
  }

  @Delete('endpoints/:endpointId')
  async remove(
    @Param('endpointId') endpointId: string
  ): Promise<{ data: unknown; error: null }> {
    const usedByRun = await this.prisma.testRun.findFirst({
      where: { endpointId },
      select: { id: true },
    });
    if (usedByRun !== null) {
      throw new ConflictException({
        code: 'ENDPOINT_HAS_TEST_RUNS',
        message: 'Delete Test Run data before deleting an Endpoint',
      });
    }
    const endpoint = await this.prisma.endpoint.delete({
      where: { id: endpointId },
    });
    return { data: endpoint, error: null };
  }
}
