import { encrypt, decrypt } from '../services/encryption';

describe('Encryption Utility Unit Tests', () => {
  const secretKey = 'my-super-secret-password-12345!';

  test('should successfully encrypt and decrypt a string', () => {
    const encrypted = encrypt(secretKey);
    expect(encrypted).not.toBe(secretKey);
    expect(encrypted).toContain(':');
    
    const parts = encrypted.split(':');
    expect(parts.length).toBe(3); // iv, authTag, content

    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(secretKey);
  });

  test('should return empty string if input is empty', () => {
    expect(encrypt('')).toBe('');
    expect(decrypt('')).toBe('');
  });

  test('should return raw input if decrypted string format is invalid', () => {
    const rawText = 'unencrypted-plain-text';
    expect(decrypt(rawText)).toBe(rawText);
  });
});
