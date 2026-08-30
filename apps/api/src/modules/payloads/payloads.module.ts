import { Module } from '@nestjs/common';
import { PayloadGeneratorService } from './payload-generator.service.js';
import { PayloadTemplatesController } from './payload-templates.controller.js';
import { PayloadsController } from './payloads.controller.js';

@Module({
  controllers: [PayloadsController, PayloadTemplatesController],
  providers: [PayloadGeneratorService],
})
export class PayloadsModule {}
