import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
} from '@nestjs/common';
import type { Prisma } from '@payload-forge/prisma';
import { PrismaService } from '../prisma/prisma.service.js';
import { SavePayloadTemplateDto } from './payloads.dto.js';

@Controller()
export class PayloadTemplatesController {
  constructor(private readonly prisma: PrismaService) {}

  @Post('payload-templates')
  async save(
    @Body() input: SavePayloadTemplateDto
  ): Promise<{ data: unknown; error: null }> {
    const endpoint = await this.prisma.endpoint.findUnique({
      where: { id: input.endpointId },
    });
    if (endpoint === null || endpoint.projectId !== input.projectId) {
      throw new BadRequestException({
        code: 'PAYLOAD_TEMPLATE_ENDPOINT_MISMATCH',
        message: 'Endpoint must belong to the selected Project',
      });
    }
    const latest = await this.prisma.payloadTemplate.aggregate({
      where: { endpointId: input.endpointId, name: input.name },
      _max: { version: true },
    });
    const template = await this.prisma.payloadTemplate.create({
      data: {
        projectId: input.projectId,
        endpointId: input.endpointId,
        name: input.name,
        version: (latest._max.version ?? 0) + 1,
        payloads: input.payloads as Prisma.InputJsonValue,
        source: input.source,
      },
    });
    return { data: template, error: null };
  }

  @Get('endpoints/:endpointId/payload-templates')
  async list(
    @Param('endpointId') endpointId: string
  ): Promise<{ data: unknown; error: null }> {
    const templates = await this.prisma.payloadTemplate.findMany({
      where: { endpointId },
      orderBy: [{ name: 'asc' }, { version: 'desc' }],
    });
    return { data: templates, error: null };
  }
}
