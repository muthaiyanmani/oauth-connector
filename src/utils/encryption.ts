import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scrypt,
  CipherGCM,
  DecipherGCM,
} from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

/**
 * Encryption service using AES-256-GCM
 */
export class EncryptionService {
  private algorithm = 'aes-256-gcm';
  private keyLength = 32; // 256 bits
  private ivLength = 16; // 128 bits
  private saltLength = 16;
  private tagLength = 16;

  /**
   * Derive key from password using scrypt
   */
  private async deriveKey(password: string, salt: Buffer): Promise<Buffer> {
    return (await scryptAsync(password, salt, this.keyLength)) as Buffer;
  }

  /**
   * Encrypt data
   */
  async encrypt(data: string, password: string): Promise<string> {
    try {
      // Generate salt and IV
      const salt = randomBytes(this.saltLength);
      const iv = randomBytes(this.ivLength);

      // Derive key from password
      const key = await this.deriveKey(password, salt);

      // Create cipher (GCM mode returns CipherGCM which has getAuthTag method)
      const cipher = createCipheriv(this.algorithm, key, iv) as CipherGCM;

      // Encrypt data
      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      // Get auth tag
      const tag = cipher.getAuthTag();

      // Combine salt + iv + tag + encrypted data
      const result = Buffer.concat([salt, iv, tag, Buffer.from(encrypted, 'hex')]).toString(
        'base64'
      );

      return result;
    } catch (error) {
      throw new Error(
        `Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Decrypt data
   */
  async decrypt(encryptedData: string, password: string): Promise<string> {
    try {
      // Decode base64
      const data = Buffer.from(encryptedData, 'base64');

      // Extract components
      const salt = data.subarray(0, this.saltLength);
      const iv = data.subarray(this.saltLength, this.saltLength + this.ivLength);
      const tag = data.subarray(
        this.saltLength + this.ivLength,
        this.saltLength + this.ivLength + this.tagLength
      );
      const encrypted = data.subarray(this.saltLength + this.ivLength + this.tagLength);

      // Derive key from password
      const key = await this.deriveKey(password, salt);

      // Create decipher (GCM mode returns DecipherGCM which has setAuthTag method)
      const decipher = createDecipheriv(this.algorithm, key, iv) as DecipherGCM;
      decipher.setAuthTag(tag);

      // Decrypt data
      let decrypted = decipher.update(encrypted, undefined, 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      throw new Error(
        `Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}

/**
 * Default encryption service instance
 */
export const defaultEncryptionService = new EncryptionService();
