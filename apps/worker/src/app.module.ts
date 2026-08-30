import { Module } from '@nestjs/common';
import { RunExecutionModule } from './modules/run-execution/run-execution.module.js';

@Module({ imports: [RunExecutionModule] })
export class AppModule {}
