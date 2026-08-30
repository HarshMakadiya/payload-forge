import 'reflect-metadata';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { ConsoleLogger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { validateWorkerEnvironment } from './config.js';

const candidateEnvFiles = [
  resolve(process.cwd(), '.env'),
  resolve(process.cwd(), '../../.env'),
];
for (const envFile of candidateEnvFiles) {
  if (existsSync(envFile)) {
    try {
      process.loadEnvFile(envFile);
    } catch {
      // Ignore if env file cannot be parsed
    }
  }
}

validateWorkerEnvironment();
const { AppModule } = await import('./app.module.js');

const application = await NestFactory.createApplicationContext(AppModule, {
  logger: new ConsoleLogger({ json: true }),
});
application.enableShutdownHooks();
