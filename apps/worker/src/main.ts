import 'reflect-metadata';
import { ConsoleLogger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { validateWorkerEnvironment } from './config.js';

validateWorkerEnvironment();
const { AppModule } = await import('./app.module.js');

const application = await NestFactory.createApplicationContext(AppModule, {
  logger: new ConsoleLogger({ json: true }),
});
application.enableShutdownHooks();
