import { createDecipheriv } from 'node:crypto';

export function decryptSecretHeaders(value: string): Record<string, string> {
  const encodedKey = process.env.SECRETS_ENCRYPTION_KEY;
  if (encodedKey === undefined) {
    throw new Error('SECRETS_ENCRYPTION_KEY is required');
  }
  const key = Buffer.from(encodedKey, 'base64');
  if (key.length !== 32) {
    throw new Error('SECRETS_ENCRYPTION_KEY must decode to 32 bytes');
  }
  const [initializationVector, authenticationTag, encrypted] = value.split('.');
  if (
    initializationVector === undefined ||
    authenticationTag === undefined ||
    encrypted === undefined
  ) {
    throw new Error('Encrypted secret value is invalid');
  }
  const decipher = createDecipheriv(
    'aes-256-gcm',
    key,
    Buffer.from(initializationVector, 'base64')
  );
  decipher.setAuthTag(Buffer.from(authenticationTag, 'base64'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encrypted, 'base64')),
    decipher.final(),
  ]).toString('utf8');
  return JSON.parse(decrypted) as Record<string, string>;
}
