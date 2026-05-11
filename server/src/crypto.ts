import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';
import { logger } from './logger.js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const ENCRYPTED_PREFIX = 'enc:';
const KEY_LENGTH = 32;

let cachedKey: Buffer | null = null;

function getEncryptionKey(): Buffer | null {
  if (cachedKey) return cachedKey;

  const secret = process.env.SECRET_ENCRYPTION_KEY;
  if (!secret) {
    logger.warn('SECRET_ENCRYPTION_KEY not set - sensitive data will not be encrypted');
    return null;
  }

  if (secret.length < 16) {
    logger.error('SECRET_ENCRYPTION_KEY too short - must be at least 16 characters');
    return null;
  }

  try {
    cachedKey = scryptSync(secret, 'theme-studio-salt', KEY_LENGTH);
    return cachedKey;
  } catch (err) {
    logger.error('Failed to derive encryption key', err);
    return null;
  }
}

export function isEncrypted(value: string): boolean {
  return value.startsWith(ENCRYPTED_PREFIX);
}

export function encrypt(plaintext: string): string {
  if (!plaintext || plaintext.length === 0) return '';

  const key = getEncryptionKey();
  if (!key) return plaintext;

  try {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, key, iv);

    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);

    const authTag = cipher.getAuthTag();

    const combined = Buffer.concat([iv, authTag, encrypted]);
    return ENCRYPTED_PREFIX + combined.toString('base64');
  } catch (err) {
    logger.error('Encryption failed', err);
    return plaintext;
  }
}

export function decrypt(ciphertext: string): string {
  if (!ciphertext || ciphertext.length === 0) return '';

  if (!isEncrypted(ciphertext)) {
    return ciphertext;
  }

  const key = getEncryptionKey();
  if (!key) {
    logger.warn('Attempting to decrypt but no encryption key available');
    return ciphertext;
  }

  try {
    const data = Buffer.from(ciphertext.slice(ENCRYPTED_PREFIX.length), 'base64');

    const iv = data.subarray(0, IV_LENGTH);
    const authTag = data.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const encrypted = data.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);

    return decrypted.toString('utf8');
  } catch (err) {
    logger.error('Decryption failed - data may be corrupted or key changed', err);
    return '';
  }
}

export function encryptIfNeeded(value: string): string {
  if (!value || value.length === 0) return '';
  if (isEncrypted(value)) return value;
  return encrypt(value);
}

export function decryptIfNeeded(value: string): string {
  if (!value || value.length === 0) return '';
  if (!isEncrypted(value)) return value;
  return decrypt(value);
}

export function hasEncryptionKey(): boolean {
  return getEncryptionKey() !== null;
}
