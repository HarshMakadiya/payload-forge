import { describe, expect, it } from 'vitest';
import {
  decodeEncryptionKey,
  decryptSecretMap,
  encryptSecretMap,
} from './secret-crypto.js';

describe('secret crypto', () => {
  it('round-trips an encrypted secret map', () => {
    const key = Buffer.alloc(32, 7);
    const encrypted = encryptSecretMap({ authorization: 'Bearer secret' }, key);

    expect(decryptSecretMap(encrypted, key)).toEqual({
      authorization: 'Bearer secret',
    });
  });

  it('rejects missing and malformed encryption keys', () => {
    expect(() => decodeEncryptionKey(undefined)).toThrow('required');
    expect(() => decodeEncryptionKey('bad')).toThrow('32 bytes');
  });

  it('rejects malformed encrypted values', () => {
    expect(() => decryptSecretMap('bad', Buffer.alloc(32))).toThrow('invalid');
  });
});
