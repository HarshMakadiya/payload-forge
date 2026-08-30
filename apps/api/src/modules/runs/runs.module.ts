import { Module } from '@nestjs/common';
import { BodyStorageService } from './body-storage.service.js';
import { RunQueueService } from './run-queue.service.js';
import { RunProgressGateway } from './run-progress.gateway.js';
import { RunsController } from './runs.controller.js';
import { RunsService } from './runs.service.js';

@Module({
  controllers: [RunsController],
  providers: [
    RunsService,
    RunQueueService,
    BodyStorageService,
    RunProgressGateway,
  ],
  exports: [RunQueueService],
})
export class RunsModule {}
