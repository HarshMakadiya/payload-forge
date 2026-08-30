import 'reflect-metadata';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { ConsoleLogger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { validateApiEnvironment } from './config.js';

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

validateApiEnvironment();
const { AppModule } = await import('./app.module.js');

const app = await NestFactory.create(AppModule, {
  logger: new ConsoleLogger({ json: true }),
});
app.setGlobalPrefix('v1');
app.enableCors({ origin: process.env.WEB_ORIGIN ?? 'http://localhost:3000' });
app.useGlobalPipes(
  new ValidationPipe({
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
    whitelist: true,
  })
);
await app.listen(Number(process.env.PORT ?? 4000));
