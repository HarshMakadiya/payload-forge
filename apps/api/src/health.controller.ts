import { Controller, Get } from '@nestjs/common';
import { PrismaService } from './modules/prisma/prisma.service.js';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async health(): Promise<{ data: unknown; error: null }> {
    await this.prisma.$queryRaw`SELECT 1`;
    return {
      data: { status: 'ok', timestamp: new Date().toISOString() },
      error: null,
    };
  }
}
