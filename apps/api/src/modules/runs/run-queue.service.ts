import { Injectable, OnModuleDestroy } from '@nestjs/common';
import type { RunJobData, TestRunSnapshot } from '@payload-forge/shared';
import { Queue } from 'bullmq';
import { Redis } from 'ioredis';

@Injectable()
export class RunQueueService implements OnModuleDestroy {
  private readonly connection = new Redis(
    process.env.REDIS_URL ?? 'redis://localhost:6379',
    { maxRetriesPerRequest: null }
  );
  private readonly queue = new Queue<RunJobData>('test-runs', {
    connection: this.connection,
  });
  private readonly controlPublisher = this.connection.duplicate();

  async enqueue(
    snapshot: TestRunSnapshot,
    encryptedSecretHeaders: string | null
  ): Promise<void> {
    await this.queue.add(
      'execute-run',
      {
        snapshot,
        ...(encryptedSecretHeaders === null ? {} : { encryptedSecretHeaders }),
      },
      {
        jobId: snapshot.id,
        attempts: 1,
        removeOnComplete: 100,
        removeOnFail: 500,
      }
    );
  }

  async control(
    runId: string,
    action: 'pause' | 'resume' | 'cancel'
  ): Promise<void> {
    await this.controlPublisher.publish(
      `run-control:${runId}`,
      JSON.stringify({ action })
    );
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue.close();
    await this.controlPublisher.quit();
    await this.connection.quit();
  }
}
