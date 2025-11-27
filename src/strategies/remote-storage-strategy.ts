import { StorageStrategy } from './storage-strategy';
import { TokenData, RemoteStorageConfig } from '../types';
import { Logger } from '../utils/logger';

/**
 * Remote storage strategy
 */
export class RemoteStorageStrategy extends StorageStrategy {
  private onUpload: (data: TokenData) => Promise<void>;
  private onDownload: () => Promise<TokenData | null>;

  constructor(config: RemoteStorageConfig, logger?: Logger) {
    super(config.encryptionKey, logger);
    this.onUpload = config.onUpload;
    this.onDownload = config.onDownload;
  }

  /**
   * Save token using remote upload callback
   */
  async saveToken(tokenData: TokenData): Promise<void> {
    try {
      this.logger.debug('Saving token to remote storage');

      // Encrypt token data if encryption key is provided
      // We encrypt the entire TokenData as JSON, then wrap it in a special format
      let dataToUpload = tokenData;
      if (this.encryptionKey) {
        const dataString = JSON.stringify(tokenData);
        const encrypted = await this.encryptIfNeeded(dataString);
        // Store encrypted data in a wrapper with a marker
        // The user's onUpload will receive this, and they can store it as-is
        dataToUpload = {
          _encrypted: true,
          _data: encrypted,
        } as unknown as TokenData;
      }

      await this.onUpload(dataToUpload);
      this.logger.debug('Token saved to remote storage successfully');
    } catch (error) {
      this.logger.error(
        `Failed to save token to remote storage: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      throw error;
    }
  }

  /**
   * Load token using remote download callback
   */
  async loadToken(): Promise<TokenData | null> {
    try {
      this.logger.debug('Loading token from remote storage');
      const tokenData = await this.onDownload();

      if (!tokenData) {
        this.logger.debug('No token found in remote storage');
        return null;
      }

      // Check if data is encrypted (has our special marker)
      const encryptedData = tokenData as unknown as { _encrypted?: boolean; _data?: string };
      if (this.encryptionKey && encryptedData._encrypted && encryptedData._data) {
        try {
          const decrypted = await this.decryptIfNeeded(encryptedData._data);
          const parsed = JSON.parse(decrypted) as TokenData;
          this.logger.debug('Token decrypted and loaded from remote storage successfully');
          return parsed;
        } catch (error) {
          this.logger.error(
            `Failed to decrypt token: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
          throw error;
        }
      }

      // Not encrypted or no encryption key, return as-is
      this.logger.debug('Token loaded from remote storage successfully');
      return tokenData;
    } catch (error) {
      this.logger.error(
        `Failed to load token from remote storage: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      throw error;
    }
  }

  /**
   * Delete token from remote storage
   * Note: This requires onUpload to handle deletion (upload null/empty)
   */
  async deleteToken(): Promise<void> {
    try {
      this.logger.debug('Deleting token from remote storage');
      // Upload null to indicate deletion
      await this.onUpload(null as unknown as TokenData);
      this.logger.debug('Token deleted from remote storage successfully');
    } catch (error) {
      this.logger.error(
        `Failed to delete token from remote storage: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      throw error;
    }
  }
}
