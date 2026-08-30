import 'reflect-metadata';
import { ConsoleLogger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { validateApiEnvironment } from './config.js';

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
    whitelist: true,
  })
);
await app.listen(Number(process.env.PORT ?? 4000));
