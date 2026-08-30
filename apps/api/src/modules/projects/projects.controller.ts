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
import { CreateProjectDto, UpdateProjectDto } from './projects.dto.js';

@Controller('projects')
export class ProjectsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(): Promise<{ data: unknown; error: null }> {
    const projects = await this.prisma.project.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    return { data: projects, error: null };
  }

  @Post()
  async create(
    @Body() input: CreateProjectDto
  ): Promise<{ data: unknown; error: null }> {
    const project = await this.prisma.project.create({
      data: {
        name: input.name,
        description: input.description ?? null,
        redactFields: input.redactFields ?? [],
      },
    });
    return { data: project, error: null };
  }

  @Get(':projectId')
  async get(
    @Param('projectId') projectId: string
  ): Promise<{ data: unknown; error: null }> {
    return {
      data: await this.prisma.project.findFirstOrThrow({
        where: { id: projectId, deletedAt: null },
      }),
      error: null,
    };
  }

  @Patch(':projectId')
  async update(
    @Param('projectId') projectId: string,
    @Body() input: UpdateProjectDto
  ): Promise<{ data: unknown; error: null }> {
    await this.prisma.project.findFirstOrThrow({
      where: { id: projectId, deletedAt: null },
      select: { id: true },
    });
    const project = await this.prisma.project.update({
      where: { id: projectId },
      data: {
        ...(input.name === undefined ? {} : { name: input.name }),
        ...(input.description === undefined
          ? {}
          : { description: input.description }),
        ...(input.redactFields === undefined
          ? {}
          : { redactFields: input.redactFields }),
      },
    });
    return { data: project, error: null };
  }

  @Delete(':projectId')
  async remove(
    @Param('projectId') projectId: string
  ): Promise<{ data: unknown; error: null }> {
    await this.prisma.project.findFirstOrThrow({
      where: { id: projectId, deletedAt: null },
      select: { id: true },
    });
    const activeRun = await this.prisma.testRun.findFirst({
      where: { projectId, status: { in: ['QUEUED', 'RUNNING', 'PAUSED'] } },
      select: { id: true },
    });
    if (activeRun !== null) {
      throw new ConflictException({
        code: 'PROJECT_HAS_ACTIVE_RUNS',
        message: 'Cancel active Test Runs before deleting a Project',
      });
    }
    const project = await this.prisma.project.update({
      where: { id: projectId },
      data: { deletedAt: new Date() },
    });
    return { data: project, error: null };
  }
}
