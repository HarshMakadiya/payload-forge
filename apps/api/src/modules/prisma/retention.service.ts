import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaService } from './prisma.service.js';

const DAY_MS = 24 * 60 * 60 * 1_000;

@Injectable()
export class RetentionService implements OnModuleInit, OnModuleDestroy {
  private cleanupInterval: NodeJS.Timeout | undefined;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit(): void {
    this.cleanupInterval = setInterval(() => void this.cleanup(), DAY_MS);
    this.cleanupInterval.unref();
  }

  onModuleDestroy(): void {
    if (this.cleanupInterval !== undefined) {
      clearInterval(this.cleanupInterval);
    }
  }

  private async cleanup(): Promise<void> {
    const retentionDays = Number(process.env.METADATA_RETENTION_DAYS ?? 30);
    await this.prisma.requestAttempt.deleteMany({
      where: {
        createdAt: {
          lt: new Date(Date.now() - retentionDays * DAY_MS),
        },
      },
    });
  }
}
