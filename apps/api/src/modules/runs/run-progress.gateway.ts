import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Redis } from 'ioredis';
import type { Server } from 'socket.io';

@Injectable()
@WebSocketGateway({
  cors: { origin: process.env.WEB_ORIGIN ?? 'http://localhost:3000' },
})
export class RunProgressGateway implements OnModuleInit, OnModuleDestroy {
  @WebSocketServer()
  private server!: Server;

  private readonly subscriber = new Redis(
    process.env.REDIS_URL ?? 'redis://localhost:6379',
    { maxRetriesPerRequest: null }
  );

  async onModuleInit(): Promise<void> {
    await this.subscriber.subscribe('run-progress');
    this.subscriber.on('message', (_channel, message) => {
      this.server.emit('run-progress', JSON.parse(message) as unknown);
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.subscriber.quit();
  }
}
