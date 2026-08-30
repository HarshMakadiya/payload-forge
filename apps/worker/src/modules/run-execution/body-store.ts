import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

export class BodyStore {
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

  async put(key: string, body: string, contentType: string): Promise<string> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      })
    );
    return `s3://${this.bucket}/${key}`;
  }
}
