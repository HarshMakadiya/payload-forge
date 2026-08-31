import {
  Body,
  ConflictException,
  Controller,
  Delete,
  BadRequestException,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import type { Prisma } from '@payload-forge/prisma';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  CreateEndpointDto,
  ImportOpenApiDto,
  PreviewOpenApiDto,
  UpdateEndpointDto,
} from './endpoints.dto.js';
import {
  OpenApiImportService,
  type ParsedOpenApiOperation,
} from './openapi-import.service.js';

interface PreparedOpenApiOperation extends ParsedOpenApiOperation {
  readonly duplicate: boolean;
}

@Controller()
export class EndpointsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly openApiImport: OpenApiImportService
  ) {}

  private prepareImport(
    operations: readonly ParsedOpenApiOperation[],
    existing: readonly { name: string; method: string; path: string }[]
  ): readonly PreparedOpenApiOperation[] {
    const existingKeys = new Set(
      existing.map(
        (endpoint) => `${endpoint.method.toUpperCase()} ${endpoint.path}`
      )
    );
    const usedNames = new Set(existing.map((endpoint) => endpoint.name));

    return operations.map((operation) => {
      const duplicate = existingKeys.has(operation.operationKey);
      let name = operation.name;
      let suffix = 2;
      while (!duplicate && usedNames.has(name)) {
        name = `${operation.name} (${suffix})`;
        suffix += 1;
      }
      if (!duplicate) usedNames.add(name);
      return { ...operation, name, duplicate };
    });
  }

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

  @Post('projects/:projectId/endpoints/import/preview')
  async previewOpenApi(
    @Param('projectId') projectId: string,
    @Body() input: PreviewOpenApiDto
  ): Promise<{ data: unknown; error: null }> {
    await this.prisma.project.findFirstOrThrow({
      where: { id: projectId, deletedAt: null },
      select: { id: true },
    });
    const document = this.openApiImport.parse(input.spec);
    const existing = await this.prisma.endpoint.findMany({
      where: { projectId },
      select: { name: true, method: true, path: true },
    });
    return {
      data: {
        title: document.title,
        version: document.version,
        ignoredMethodCount: document.ignoredMethodCount,
        operations: this.prepareImport(document.operations, existing).map(
          (operation) => ({
            operationKey: operation.operationKey,
            name: operation.name,
            method: operation.method,
            path: operation.path,
            duplicate: operation.duplicate,
            hasRequestBody: operation.payloadSchema !== undefined,
          })
        ),
      },
      error: null,
    };
  }

  @Post('projects/:projectId/endpoints/import')
  async importOpenApi(
    @Param('projectId') projectId: string,
    @Body() input: ImportOpenApiDto
  ): Promise<{ data: unknown; error: null }> {
    await this.prisma.project.findFirstOrThrow({
      where: { id: projectId, deletedAt: null },
      select: { id: true },
    });
    const document = this.openApiImport.parse(input.spec);
    const existing = await this.prisma.endpoint.findMany({
      where: { projectId },
      select: { name: true, method: true, path: true },
    });
    const prepared = this.prepareImport(document.operations, existing);
    const knownKeys = new Set(
      prepared.map((operation) => operation.operationKey)
    );
    const unknownKeys = input.operationKeys.filter(
      (key) => !knownKeys.has(key)
    );
    if (unknownKeys.length > 0) {
      throw new BadRequestException({
        code: 'OPENAPI_OPERATION_UNKNOWN',
        message: `The selected operation is no longer present: ${unknownKeys[0]}`,
      });
    }

    const selectedKeys = new Set(input.operationKeys);
    const selected = prepared.filter(
      (operation) =>
        selectedKeys.has(operation.operationKey) && !operation.duplicate
    );
    if (selected.length > 0) {
      await this.prisma.endpoint.createMany({
        data: selected.map((operation) => ({
          projectId,
          name: operation.name,
          method: operation.method,
          path: operation.path,
          headers: {},
          ...(operation.payloadSample === undefined
            ? {}
            : {
                payloadSample: operation.payloadSample as Prisma.InputJsonValue,
              }),
          ...(operation.payloadSchema === undefined
            ? {}
            : {
                payloadSchema: operation.payloadSchema as Prisma.InputJsonValue,
              }),
          timeoutMs: 5_000,
        })),
      });
    }

    return {
      data: {
        importedCount: selected.length,
        skippedCount: input.operationKeys.length - selected.length,
      },
      error: null,
    };
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
