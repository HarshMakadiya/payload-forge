import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service.js';
import { RetentionService } from './retention.service.js';

@Global()
@Module({
  providers: [PrismaService, RetentionService],
  exports: [PrismaService],
})
export class PrismaModule {}
