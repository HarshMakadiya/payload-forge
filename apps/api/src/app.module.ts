import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { HealthController } from './health.controller.js';
import { HttpExceptionFilter } from './http-exception.filter.js';
import { EndpointsModule } from './modules/endpoints/endpoints.module.js';
import { PayloadsModule } from './modules/payloads/payloads.module.js';
import { PrismaModule } from './modules/prisma/prisma.module.js';
import { ProjectsModule } from './modules/projects/projects.module.js';
import { RunsModule } from './modules/runs/runs.module.js';

@Module({
  imports: [
    PrismaModule,
    ProjectsModule,
    EndpointsModule,
    RunsModule,
    PayloadsModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_FILTER, useClass: HttpExceptionFilter }],
})
export class AppModule {}
