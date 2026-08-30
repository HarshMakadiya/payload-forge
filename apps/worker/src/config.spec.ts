import { describe, expect, it } from 'vitest';
import { validateWorkerEnvironment } from './config.js';

const validEnvironment = {
  DATABASE_URL: 'postgresql://localhost/test',
  REDIS_URL: 'redis://localhost:6379',
  S3_ENDPOINT: 'http://localhost:9000',
  S3_REGION: 'us-east-1',
  S3_BUCKET: 'test',
  S3_ACCESS_KEY: 'test',
  S3_SECRET_KEY: 'test',
  SECRETS_ENCRYPTION_KEY: Buffer.alloc(32).toString('base64'),
  WORKER_RUN_CONCURRENCY: '2',
  MAX_CAPTURED_BODY_BYTES: '262144',
  CAPTURE_BODIES: 'true',
  WORKER_VERSION: 'test',
};

describe('validateWorkerEnvironment', () => {
  it('accepts complete valid configuration', () => {
    expect(() => validateWorkerEnvironment(validEnvironment)).not.toThrow();
  });

  it('rejects missing required configuration', () => {
    expect(() =>
      validateWorkerEnvironment({ ...validEnvironment, S3_BUCKET: undefined })
    ).toThrow('S3_BUCKET');
  });

  it('rejects invalid concurrency', () => {
    expect(() =>
      validateWorkerEnvironment({
        ...validEnvironment,
        WORKER_RUN_CONCURRENCY: '0',
      })
    ).toThrow('WORKER_RUN_CONCURRENCY');
  });
});
