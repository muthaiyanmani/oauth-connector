import { promises as fs } from 'fs';
import { dirname } from 'path';
import { AuthStrategy } from './auth-strategy';
import { TokenData, LocalAuthConfig } from '../types';
import { Logger } from '../utils/logger';

/**
 * Local file system authentication strategy
 */
export class LocalAuthStrategy extends AuthStrategy {
  private filePath: string;

  constructor(config: LocalAuthConfig, logger?: Logger) {
    super(config.encryptionKey, logger);
    this.filePath = config.filePath;
  }

  /**
   * Save token to local file
   */
  async saveToken(tokenData: TokenData): Promise<void> {
    try {
      this.logger.debug(`Saving token to local file: ${this.filePath}`);
      const data = JSON.stringify(tokenData);
      const encrypted = await this.encryptIfNeeded(data);

      // Ensure directory exists
      const dir = dirname(this.filePath);
      await fs.mkdir(dir, { recursive: true });

      // Write to file
      await fs.writeFile(this.filePath, encrypted, 'utf8');
      this.logger.debug('Token saved successfully');
    } catch (error) {
      this.logger.error(`Failed to save token: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * Load token from local file
   */
  async loadToken(): Promise<TokenData | null> {
    try {
      this.logger.debug(`Loading token from local file: ${this.filePath}`);
      const data = await fs.readFile(this.filePath, 'utf8');
      const decrypted = await this.decryptIfNeeded(data);
      const tokenData = JSON.parse(decrypted) as TokenData;
      this.logger.debug('Token loaded successfully');
      return tokenData;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        this.logger.debug('Token file does not exist');
        return null;
      }
      this.logger.error(`Failed to load token: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * Delete token file
   */
  async deleteToken(): Promise<void> {
    try {
      this.logger.debug(`Deleting token file: ${this.filePath}`);
      await fs.unlink(this.filePath);
      this.logger.debug('Token file deleted successfully');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        this.logger.debug('Token file does not exist, nothing to delete');
        return;
      }
      this.logger.error(`Failed to delete token: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }
}

