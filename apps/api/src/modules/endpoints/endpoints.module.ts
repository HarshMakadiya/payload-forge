import { Module } from '@nestjs/common';
import { EndpointsController } from './endpoints.controller.js';

@Module({ controllers: [EndpointsController] })
export class EndpointsModule {}
