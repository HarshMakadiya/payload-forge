import { Module } from '@nestjs/common';
import { EnvironmentsController } from './environments.controller.js';
import { ProjectsController } from './projects.controller.js';
import { SecretsService } from './secrets.service.js';

@Module({
  controllers: [ProjectsController, EnvironmentsController],
  providers: [SecretsService],
  exports: [SecretsService],
})
export class ProjectsModule {}
