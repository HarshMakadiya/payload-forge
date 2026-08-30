import { Injectable } from '@nestjs/common';
import {
  decodeEncryptionKey,
  decryptSecretMap,
  encryptSecretMap,
} from '@payload-forge/shared';

@Injectable()
export class SecretsService {
  private readonly key: Buffer;

  constructor() {
    this.key = decodeEncryptionKey(process.env.SECRETS_ENCRYPTION_KEY);
  }

  encrypt(value: Record<string, string>): string {
    return encryptSecretMap(value, this.key);
  }

  decrypt(value: string): Record<string, string> {
    return decryptSecretMap(value, this.key);
  }
}
