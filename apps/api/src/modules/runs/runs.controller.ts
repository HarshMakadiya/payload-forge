import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateRunDto, ListAttemptsQuery } from './runs.dto.js';
import { RunsService } from './runs.service.js';

@Controller()
export class RunsController {
  constructor(
    private readonly runs: RunsService,
    private readonly prisma: PrismaService
  ) {}

  @Post('runs')
  async create(
    @Body() input: CreateRunDto
  ): Promise<{ data: unknown; error: null }> {
    return { data: await this.runs.create(input), error: null };
  }

  @Get('projects/:projectId/runs')
  async list(
    @Param('projectId') projectId: string
  ): Promise<{ data: unknown; error: null }> {
    const runs = await this.prisma.testRun.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return { data: runs, error: null };
  }

  @Get('runs/:runId')
  async get(
    @Param('runId') runId: string
  ): Promise<{ data: unknown; error: null }> {
    return {
      data: await this.prisma.testRun.findUniqueOrThrow({
        where: { id: runId },
      }),
      error: null,
    };
  }

  @Get('runs/:runId/logs')
  async attempts(
    @Param('runId') runId: string,
    @Query() query: ListAttemptsQuery
  ): Promise<{ data: unknown; error: null }> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 50;
    const where = {
      testRunId: runId,
      ...(query.statusCode === undefined
        ? {}
        : { statusCode: query.statusCode }),
    };
    const [items, total] = await Promise.all([
      this.prisma.requestAttempt.findMany({
        where,
        orderBy: [{ logicalRequestSequence: 'asc' }, { attemptNumber: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.requestAttempt.count({ where }),
    ]);
    return { data: { items, total, page, pageSize }, error: null };
  }

  @Post('runs/:runId/:action')
  async control(
    @Param('runId') runId: string,
    @Param('action') action: string
  ): Promise<{ data: unknown; error: null }> {
    if (action !== 'pause' && action !== 'resume' && action !== 'cancel') {
      throw new BadRequestException('Unsupported run action');
    }
    return { data: await this.runs.control(runId, action), error: null };
  }
}
