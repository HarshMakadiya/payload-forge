import { Module } from '@nestjs/common';
import { PayloadGeneratorService } from './payload-generator.service.js';
import { PayloadsController } from './payloads.controller.js';

@Module({
  controllers: [PayloadsController],
  providers: [PayloadGeneratorService],
})
export class PayloadsModule {}
