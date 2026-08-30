import { Body, Controller, Get, Post } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateProjectDto } from './projects.dto.js';

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
}
