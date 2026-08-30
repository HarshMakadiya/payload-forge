import { afterEach, describe, expect, it } from 'vitest';
import { SecretsService } from './secrets.service.js';

const previousKey = process.env.SECRETS_ENCRYPTION_KEY;

afterEach(() => {
  if (previousKey === undefined) delete process.env.SECRETS_ENCRYPTION_KEY;
  else process.env.SECRETS_ENCRYPTION_KEY = previousKey;
});

describe('SecretsService', () => {
  it('encrypts and decrypts secret headers', () => {
    process.env.SECRETS_ENCRYPTION_KEY = Buffer.alloc(32, 4).toString('base64');
    const service = new SecretsService();
    const encrypted = service.encrypt({ authorization: 'Bearer test' });

    expect(service.decrypt(encrypted)).toEqual({
      authorization: 'Bearer test',
    });
  });

  it('rejects malformed encrypted values', () => {
    process.env.SECRETS_ENCRYPTION_KEY = Buffer.alloc(32, 4).toString('base64');
    expect(() => new SecretsService().decrypt('bad')).toThrow('invalid');
  });
});
