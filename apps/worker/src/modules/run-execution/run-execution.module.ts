import { Module } from '@nestjs/common';
import { RunWorkerService } from './run-worker.service.js';

@Module({ providers: [RunWorkerService] })
export class RunExecutionModule {}
