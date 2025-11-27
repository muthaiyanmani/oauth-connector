import { TokenData } from '../types';
import { EncryptionService, defaultEncryptionService } from '../utils/encryption';
import { Logger, defaultLogger } from '../utils/logger';

/**
 * Abstract base class for storage strategies
 */
export abstract class StorageStrategy {
  protected encryptionService: EncryptionService;
  protected logger: Logger;
  protected encryptionKey?: string;

  constructor(encryptionKey?: string, logger?: Logger) {
    this.encryptionKey = encryptionKey;
    this.encryptionService = defaultEncryptionService;
    this.logger = logger || defaultLogger;
  }

  /**
   * Save token data
   */
  abstract saveToken(tokenData: TokenData): Promise<void>;

  /**
   * Load token data
   */
  abstract loadToken(): Promise<TokenData | null>;

  /**
   * Delete token data
   */
  abstract deleteToken(): Promise<void>;

  /**
   * Encrypt token data if encryption key is provided
   */
  protected async encryptIfNeeded(data: string): Promise<string> {
    if (this.encryptionKey) {
      return await this.encryptionService.encrypt(data, this.encryptionKey);
    }
    return data;
  }

  /**
   * Decrypt token data if encryption key is provided
   */
  protected async decryptIfNeeded(data: string): Promise<string> {
    if (this.encryptionKey) {
      return await this.encryptionService.decrypt(data, this.encryptionKey);
    }
    return data;
  }
}

