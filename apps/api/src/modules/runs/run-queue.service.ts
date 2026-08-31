import { Injectable, OnModuleDestroy } from '@nestjs/common';
import type {
  RunControlCommand,
  RunJobData,
  TestRunSnapshot,
} from '@payload-forge/shared';
import { Queue } from 'bullmq';
import { Redis } from 'ioredis';

@Injectable()
export class RunQueueService implements OnModuleDestroy {
  private readonly connection = new Redis(
    process.env.REDIS_URL ?? 'redis://localhost:6379',
    { maxRetriesPerRequest: null }
  );
  private readonly queue = new Queue<RunJobData>('payload-forge-test-runs', {
    connection: this.connection,
  });
  private readonly controlPublisher = this.connection.duplicate();

  async enqueue(
    snapshot: TestRunSnapshot,
    encryptedSecretHeaders: string | null
  ): Promise<void> {
    await this.queue.add(
      'run-execute',
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

  async control(runId: string, command: RunControlCommand): Promise<void> {
    await this.controlPublisher.publish(
      `run-control:${runId}`,
      JSON.stringify(command)
    );
  }

  async health(): Promise<{
    redis: string;
    queue: Readonly<Record<string, number>>;
    workerHeartbeat: string | null;
    droppedRealtimeEvents: number;
  }> {
    const [redis, jobs, workerHeartbeat, droppedRealtimeEvents] =
      await Promise.all([
        this.connection.ping(),
        this.queue.getJobCounts('waiting', 'active', 'delayed', 'failed'),
        this.connection.get('payload-forge:worker-heartbeat'),
        this.connection.get('payload-forge:dropped-realtime-events'),
      ]);
    return {
      redis,
      queue: jobs,
      workerHeartbeat,
      droppedRealtimeEvents: Number(droppedRealtimeEvents ?? 0),
    };
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue.close();
    await this.controlPublisher.quit();
    await this.connection.quit();
  }
}
