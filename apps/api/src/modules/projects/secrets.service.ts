import { Injectable } from '@nestjs/common';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

@Injectable()
export class SecretsService {
  private readonly key: Buffer;

  constructor() {
    const encodedKey = process.env.SECRETS_ENCRYPTION_KEY;
    if (encodedKey === undefined) {
      throw new Error('SECRETS_ENCRYPTION_KEY is required');
    }
    this.key = Buffer.from(encodedKey, 'base64');
    if (this.key.length !== 32) {
      throw new Error('SECRETS_ENCRYPTION_KEY must decode to 32 bytes');
    }
  }

  encrypt(value: Record<string, string>): string {
    const initializationVector = randomBytes(12);
    const cipher = createCipheriv(
      'aes-256-gcm',
      this.key,
      initializationVector
    );
    const encrypted = Buffer.concat([
      cipher.update(JSON.stringify(value), 'utf8'),
      cipher.final(),
    ]);
    return [
      initializationVector.toString('base64'),
      cipher.getAuthTag().toString('base64'),
      encrypted.toString('base64'),
    ].join('.');
  }

  decrypt(value: string): Record<string, string> {
    const [initializationVector, authenticationTag, encrypted] =
      value.split('.');
    if (
      initializationVector === undefined ||
      authenticationTag === undefined ||
      encrypted === undefined
    ) {
      throw new Error('Encrypted secret value is invalid');
    }
    const decipher = createDecipheriv(
      'aes-256-gcm',
      this.key,
      Buffer.from(initializationVector, 'base64')
    );
    decipher.setAuthTag(Buffer.from(authenticationTag, 'base64'));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encrypted, 'base64')),
      decipher.final(),
    ]).toString('utf8');
    return JSON.parse(decrypted) as Record<string, string>;
  }
}
