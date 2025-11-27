import { StorageStrategy } from './storage-strategy';
import { TokenData, GlobalStorageConfig } from '../types';
import { Logger } from '../utils/logger';

/**
 * In-memory global variable storage strategy
 */
export class GlobalStorageStrategy extends StorageStrategy {
  private static tokenStore: Map<string, string> = new Map();
  private instanceId: string;

  constructor(config: GlobalStorageConfig = {}, logger?: Logger) {
    super(config.encryptionKey, logger);
    // Use a default instance ID or generate one
    this.instanceId = 'default';
  }

  /**
   * Set instance ID for multi-instance support
   */
  setInstanceId(instanceId: string): void {
    this.instanceId = instanceId;
  }

  /**
   * Get storage key for this instance
   */
  private getStorageKey(): string {
    return `connector_token_${this.instanceId}`;
  }

  /**
   * Save token to in-memory storage
   */
  async saveToken(tokenData: TokenData): Promise<void> {
    try {
      this.logger.debug(`Saving token to global storage (instance: ${this.instanceId})`);
      const data = JSON.stringify(tokenData);
      const encrypted = await this.encryptIfNeeded(data);
      GlobalStorageStrategy.tokenStore.set(this.getStorageKey(), encrypted);
      this.logger.debug('Token saved to global storage successfully');
    } catch (error) {
      this.logger.error(`Failed to save token: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * Load token from in-memory storage
   */
  async loadToken(): Promise<TokenData | null> {
    try {
      this.logger.debug(`Loading token from global storage (instance: ${this.instanceId})`);
      const encrypted = GlobalStorageStrategy.tokenStore.get(this.getStorageKey());
      
      if (!encrypted) {
        this.logger.debug('No token found in global storage');
        return null;
      }

      const decrypted = await this.decryptIfNeeded(encrypted);
      const tokenData = JSON.parse(decrypted) as TokenData;
      this.logger.debug('Token loaded from global storage successfully');
      return tokenData;
    } catch (error) {
      this.logger.error(`Failed to load token: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * Delete token from in-memory storage
   */
  async deleteToken(): Promise<void> {
    try {
      this.logger.debug(`Deleting token from global storage (instance: ${this.instanceId})`);
      GlobalStorageStrategy.tokenStore.delete(this.getStorageKey());
      this.logger.debug('Token deleted from global storage successfully');
    } catch (error) {
      this.logger.error(`Failed to delete token: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * Clear all tokens (useful for testing)
   */
  static clearAll(): void {
    GlobalStorageStrategy.tokenStore.clear();
  }
}

