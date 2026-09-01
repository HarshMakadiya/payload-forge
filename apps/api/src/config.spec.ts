import { describe, expect, it } from 'vitest';
import { validateApiEnvironment } from './config.js';

const validEnvironment = {
  DATABASE_URL: 'postgresql://localhost/test',
  REDIS_URL: 'redis://localhost:6379',
  S3_ENDPOINT: 'http://localhost:9000',
  S3_REGION: 'us-east-1',
  S3_BUCKET: 'test',
  S3_ACCESS_KEY: 'test',
  S3_SECRET_KEY: 'test',
  SECRETS_ENCRYPTION_KEY: Buffer.alloc(32).toString('base64'),
  WEB_ORIGIN: 'http://localhost:3002',
  WORKER_VERSION: 'test',
  METADATA_RETENTION_DAYS: '30',
  PRODUCTION_MAX_REQUESTS_PER_MINUTE: '1000',
  PRODUCTION_MAX_CONCURRENCY: '50',
};

describe('validateApiEnvironment', () => {
  it('accepts complete valid configuration', () => {
    expect(() => validateApiEnvironment(validEnvironment)).not.toThrow();
  });

  it('rejects missing required configuration', () => {
    expect(() =>
      validateApiEnvironment({ ...validEnvironment, REDIS_URL: undefined })
    ).toThrow('REDIS_URL');
  });

  it('rejects invalid numeric configuration', () => {
    expect(() =>
      validateApiEnvironment({ ...validEnvironment, PORT: 'not-a-number' })
    ).toThrow('PORT');
  });
});
