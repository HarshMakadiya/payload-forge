import { Module } from '@nestjs/common';
import { EndpointsController } from './endpoints.controller.js';
import { OpenApiImportService } from './openapi-import.service.js';

@Module({
  controllers: [EndpointsController],
  providers: [OpenApiImportService],
})
export class EndpointsModule {}
