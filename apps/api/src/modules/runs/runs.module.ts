import { Module } from '@nestjs/common';
import { RunQueueService } from './run-queue.service.js';
import { RunsController } from './runs.controller.js';
import { RunsService } from './runs.service.js';

@Module({
  controllers: [RunsController],
  providers: [RunsService, RunQueueService],
})
export class RunsModule {}
