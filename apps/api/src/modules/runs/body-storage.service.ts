import { Injectable, NotFoundException } from '@nestjs/common';
import {
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  S3Client,
} from '@aws-sdk/client-s3';

@Injectable()
export class BodyStorageService {
  private readonly client = new S3Client({
    endpoint: process.env.S3_ENDPOINT ?? 'http://localhost:9000',
    region: process.env.S3_REGION ?? 'us-east-1',
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY ?? 'payload-forge',
      secretAccessKey: process.env.S3_SECRET_KEY ?? 'payload-forge-local',
    },
  });
  private readonly bucket = process.env.S3_BUCKET ?? 'payload-forge-bodies';

  async get(reference: string): Promise<string> {
    const prefix = `s3://${this.bucket}/`;
    if (!reference.startsWith(prefix)) {
      throw new NotFoundException({
        code: 'BODY_NOT_FOUND',
        message: 'Captured body reference is invalid',
      });
    }
    const result = await this.client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: reference.slice(prefix.length),
      })
    );
    if (result.Body === undefined) {
      throw new NotFoundException({
        code: 'BODY_NOT_FOUND',
        message: 'Captured body no longer exists',
      });
    }
    return result.Body.transformToString();
  }

  async purgeRuns(runIds: readonly string[]): Promise<void> {
    for (const runId of runIds) {
      let continuationToken: string | undefined;
      do {
        const page = await this.client.send(
          new ListObjectsV2Command({
            Bucket: this.bucket,
            Prefix: `runs/${runId}/`,
            ...(continuationToken === undefined
              ? {}
              : { ContinuationToken: continuationToken }),
          })
        );
        const objects = (page.Contents ?? []).flatMap((item) =>
          item.Key === undefined ? [] : [{ Key: item.Key }]
        );
        if (objects.length > 0) {
          await this.client.send(
            new DeleteObjectsCommand({
              Bucket: this.bucket,
              Delete: { Objects: objects },
            })
          );
        }
        continuationToken = page.NextContinuationToken;
      } while (continuationToken !== undefined);
    }
  }
}
