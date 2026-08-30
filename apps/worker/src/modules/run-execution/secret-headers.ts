import { decodeEncryptionKey, decryptSecretMap } from '@payload-forge/shared';

export function decryptSecretHeaders(value: string): Record<string, string> {
  const key = decodeEncryptionKey(process.env.SECRETS_ENCRYPTION_KEY);
  return decryptSecretMap(value, key);
}
