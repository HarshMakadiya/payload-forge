import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import type { Prisma } from '@payload-forge/prisma';
import { PrismaService } from '../prisma/prisma.service.js';
import { BodyStorageService } from './body-storage.service.js';
import {
  CreateRunDto,
  ListAttemptsQuery,
  PurgeProjectRunDataDto,
  UpdateRunDto,
} from './runs.dto.js';
import { RunsService } from './runs.service.js';

@Controller()
export class RunsController {
  constructor(
    private readonly runs: RunsService,
    private readonly prisma: PrismaService,
    private readonly bodies: BodyStorageService
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
    const where: Prisma.RequestAttemptWhereInput = {
      testRunId: runId,
      ...(query.statusCode === undefined
        ? query.statusGroup === '2xx'
          ? { statusCode: { gte: 200, lt: 300 } }
          : query.statusGroup === 'errors'
            ? { statusCode: { gte: 400, lt: 600 } }
            : {}
        : { statusCode: query.statusCode }),
      ...(query.minLatencyMs === undefined && query.maxLatencyMs === undefined
        ? {}
        : {
            latencyMs: {
              ...(query.minLatencyMs === undefined
                ? {}
                : { gte: query.minLatencyMs }),
              ...(query.maxLatencyMs === undefined
                ? {}
                : { lte: query.maxLatencyMs }),
            },
          }),
      ...(query.keyword === undefined || query.keyword.trim() === ''
        ? {}
        : {
            searchText: { contains: query.keyword.trim(), mode: 'insensitive' },
          }),
      ...(query.errorType === undefined || query.errorType === ''
        ? query.statusGroup === 'timeouts'
          ? { errorType: 'timeout' }
          : {}
        : { errorType: query.errorType }),
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

  @Get('runs/:runId/logs/:attemptId/:kind/body')
  async body(
    @Param('runId') runId: string,
    @Param('attemptId') attemptId: string,
    @Param('kind') kind: string
  ): Promise<{ data: unknown; error: null }> {
    const attempt = await this.prisma.requestAttempt.findFirstOrThrow({
      where: { id: attemptId, testRunId: runId },
      select: { requestBodyRef: true, responseBodyRef: true },
    });
    const reference =
      kind === 'request'
        ? attempt.requestBodyRef
        : kind === 'response'
          ? attempt.responseBodyRef
          : null;
    if (reference === null) {
      return { data: { content: null }, error: null };
    }
    return { data: { content: await this.bodies.get(reference) }, error: null };
  }

  @Delete('projects/:projectId/run-data')
  async purgeProjectRunData(
    @Param('projectId') projectId: string,
    @Body() input: PurgeProjectRunDataDto
  ): Promise<{ data: unknown; error: null }> {
    if (!input.confirmed) {
      throw new BadRequestException({
        code: 'PURGE_CONFIRMATION_REQUIRED',
        message: 'Manual run-data purge requires explicit confirmation',
      });
    }
    const activeRun = await this.prisma.testRun.findFirst({
      where: { projectId, status: { in: ['QUEUED', 'RUNNING', 'PAUSED'] } },
      select: { id: true },
    });
    if (activeRun !== null) {
      throw new BadRequestException({
        code: 'PROJECT_HAS_ACTIVE_RUNS',
        message: 'Cancel active Test Runs before purging project data',
      });
    }
    const runs = await this.prisma.testRun.findMany({
      where: { projectId },
      select: { id: true },
    });
    await this.bodies.purgeRuns(runs.map((run) => run.id));
    const deleted = await this.prisma.testRun.deleteMany({
      where: { projectId },
    });
    return { data: { deletedRuns: deleted.count }, error: null };
  }

  @Patch('runs/:runId')
  async control(
    @Param('runId') runId: string,
    @Body() input: UpdateRunDto
  ): Promise<{ data: unknown; error: null }> {
    if (
      (input.status === undefined) ===
      (input.throttlePercent === undefined)
    ) {
      throw new BadRequestException({
        code: 'RUN_UPDATE_INVALID',
        message: 'Provide exactly one of status or throttlePercent',
      });
    }
    if (input.throttlePercent !== undefined) {
      return {
        data: await this.runs.throttle(runId, input.throttlePercent),
        error: null,
      };
    }
    const action =
      input.status === 'PAUSED'
        ? 'pause'
        : input.status === 'RUNNING'
          ? 'resume'
          : 'cancel';
    return { data: await this.runs.control(runId, action), error: null };
  }
}
