import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 12 bytes IV is standard for GCM

// Ensure we have a consistent 32-byte key derived from the environment variable
const getEncryptionKey = (): Buffer => {
  const secret = process.env.BACKEND_ENCRYPTION_KEY || 'dev-fallback-secret-key-change-this';
  if (!process.env.BACKEND_ENCRYPTION_KEY && process.env.NODE_ENV === 'production') {
    console.warn('⚠️ WARNING: BACKEND_ENCRYPTION_KEY is not defined in production. Using fallback key.');
  }
  return crypto.scryptSync(secret, 'bucketbackup-salt', 32);
};

let keyCache: Buffer | null = null;
const getCachedKey = (): Buffer => {
  if (!keyCache) {
    keyCache = getEncryptionKey();
  }
  return keyCache;
};

/**
 * Encrypts a plaintext string using AES-256-GCM.
 * Returns a colon-separated string: iv:authTag:encryptedContent
 */
export function encrypt(text: string): string {
  if (!text) return '';
  try {
    const key = getCachedKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag().toString('hex');
    const ivHex = iv.toString('hex');

    return `${ivHex}:${authTag}:${encrypted}`;
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Encryption process failed.');
  }
}

/**
 * Decrypts a colon-separated string (iv:authTag:encryptedContent) using AES-256-GCM.
 * If the string does not match the encrypted pattern, it returns the input string unchanged (fallback).
 */
export function decrypt(encryptedText: string): string {
  if (!encryptedText) return '';

  const parts = encryptedText.split(':');
  if (parts.length !== 3) {
    // Return original string if it is not encrypted or format is invalid
    return encryptedText;
  }

  const [ivHex, tagHex, contentHex] = parts;
  if (!ivHex || !tagHex || !contentHex) {
    return encryptedText;
  }

  try {
    const key = getCachedKey();
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(tagHex, 'hex');
    const encrypted = Buffer.from(contentHex, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted.toString('utf8');
  } catch (error: any) {
    // If decryption fails (e.g. wrong key), log error and return original (or throw in strict environments)
    console.error('Decryption failed, check BACKEND_ENCRYPTION_KEY:', error.message);
    return encryptedText;
  }
}
