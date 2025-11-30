import { StorageStrategy } from './storage-strategy';
import { TokenData, CatalystCacheStorageConfig, CatalystIncomingMessage } from '../types';
import { Logger } from '../utils/logger';
import { HttpClient } from '../utils/http-client';

/**
 * Catalyst Cache API response structure
 */
interface CatalystCacheResponse {
  status: string;
  data: {
    cache_name: string;
    cache_value: string | null;
  };
}

/**
 * Catalyst Cache storage strategy
 *
 * Stores tokens in Catalyst cache using HTTP requests
 */
export class CatalystCacheStorageStrategy extends StorageStrategy {
  private httpReq?: CatalystIncomingMessage;
  private key: string = 'token';
  private httpClient: HttpClient;

  constructor(config?: CatalystCacheStorageConfig, logger?: Logger) {
    super(config?.encryptionKey, logger);
    this.httpReq = config?.httpReq;
    this.key = config?.key ?? 'token';
    this.httpClient = new HttpClient(this.logger);
  }

  private getApiUrl(): string {
    const apiDomain = process.env.X_ZOHO_CATALYST_CONSOLE_URL;
    const projectId = process.env.CATALYST_PROJECT_ID;
    const apiPath = `/baas/v1/project/${projectId}/segment/Default/cache`;
    return apiDomain + apiPath;
  }

  private getReqHeaders(): Record<string, string> {
    const oauthToken = this.httpReq?.headers['x-zc-user-cred-token'] || this.httpReq?.catalystHeaders?.['x-zc-user-cred-token'];
    const projectKey = this.httpReq?.headers['x-zc-project-key'] || this.httpReq?.catalystHeaders?.['x-zc-project-key'];
    return {
      Authorization: `Bearer ${oauthToken}`,
      PROJECT_ID: projectKey as string,
      'Content-Type': 'application/json',
    };
  }
  async getCache(key: string): Promise<string | null> {
    try {
      const apiUrl = this.getApiUrl() + `?cacheKey=${key}`;
      const reqHeaders = this.getReqHeaders();

      const response = await this.httpClient.get<CatalystCacheResponse>(apiUrl, reqHeaders);

      if (response.data && response.data.status === 'success' && response.data.data) {
        return response.data.data.cache_value;
      }
      return null;
    } catch (error) {
      this.logger.error(
        `Failed to get cache: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      return null;
    }
  }

  async setCache(key: string, value: string): Promise<void> {
    try {
      const apiUrl = this.getApiUrl();
      const reqHeaders = this.getReqHeaders();
      const reqBody = {
        cache_name: key,
        cache_value: value,
        expiry_in_hours: '1',
      };

      await this.httpClient.post<CatalystCacheResponse>(
        apiUrl,
        JSON.stringify(reqBody),
        reqHeaders
      );
    } catch (error) {
      this.logger.error(
        `Failed to set cache: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      throw error;
    }
  }

  /**
   * Save token to Catalyst cache
   */
  async saveToken(tokenData: TokenData): Promise<void> {
    if(!this.httpReq) {
      this.logger.warn('HTTP request object is null and strategy is not supported');
      return;
    }

    try {
      this.logger.debug(`Saving token to Catalyst cache with key: ${this.key}`);

      const dataString = JSON.stringify(tokenData);
      const dataToStore = await this.encryptIfNeeded(dataString);
      await this.setCache(this.key, dataToStore);

      this.logger.debug('Token saved to Catalyst cache successfully');
    } catch (error) {
      this.logger.error(
        `Failed to save token to Catalyst cache: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      throw error;
    }
  }

  /**
   * Load token from Catalyst cache
   */
  async loadToken(): Promise<TokenData | null> {

    if(!this.httpReq) {
      this.logger.warn('HTTP request object is null and strategy is not supported');
      return null;
    }

    try {
      this.logger.debug(`Loading token from Catalyst cache with key: ${this.key}`);
      const cachedValue = await this.getCache(this.key);

      if (!cachedValue) {
        this.logger.debug('No token found in Catalyst cache');
        return null;
      }

      const decrypted = await this.decryptIfNeeded(cachedValue);
      const tokenData = JSON.parse(decrypted) as TokenData;
      this.logger.debug('Token loaded from Catalyst cache successfully');
      return tokenData;
    } catch (error) {
      // Handle JSON parse errors gracefully
      if (error instanceof SyntaxError) {
        this.logger.error('Failed to parse token data from Catalyst cache');
        return null;
      }
      this.logger.error(
        `Failed to load token from Catalyst cache: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      throw error;
    }
  }

  /**
   * Delete token from Catalyst cache
   */
  async deleteToken(): Promise<void> {

    if(!this.httpReq) {
      this.logger.warn('HTTP request object is null and strategy is not supported');
      return;
    }

    try {
      this.logger.debug(`Deleting token from Catalyst cache with key: ${this.key}`);
      await this.setCache(this.key, '');

      this.logger.debug('Token deleted from Catalyst cache successfully');
    } catch (error) {
      this.logger.error(
        `Failed to delete token from Catalyst cache: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      throw error;
    }
  }
}
