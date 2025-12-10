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

  /**
   * Check if running in Catalyst environment
   */
  private isCatalystEnvironment(): boolean {
    const hasApiDomain = !!process.env.X_ZOHO_CATALYST_CONSOLE_URL;
    const hasProjectId = !!process.env.CATALYST_PROJECT_ID;
    const hasHttpReq = !!this.httpReq;

    return hasApiDomain && hasProjectId && hasHttpReq;
  }

  private getApiUrl(): string | null {
    const apiDomain = process.env.X_ZOHO_CATALYST_CONSOLE_URL;
    const projectId = process.env.CATALYST_PROJECT_ID;

    if (!apiDomain || !projectId) {
      return null;
    }

    const apiPath = `/baas/v1/project/${projectId}/segment/Default/cache`;
    return apiDomain + apiPath;
  }

  private getReqHeaders(): Record<string, string> | null {
    if (!this.httpReq) {
      return null;
    }

    const oauthToken =
      this.httpReq.headers['x-zc-user-cred-token'] ||
      this.httpReq.catalystHeaders?.['x-zc-user-cred-token'];
    const projectKey =
      this.httpReq.headers['x-zc-project-key'] ||
      this.httpReq.catalystHeaders?.['x-zc-project-key'];

    if (!oauthToken || !projectKey) {
      return null;
    }

    return {
      Authorization: `Bearer ${oauthToken}`,
      PROJECT_ID: projectKey as string,
      'Content-Type': 'application/json',
    };
  }
  async getCache(key: string): Promise<string | null> {
    if (!this.isCatalystEnvironment()) {
      this.logger.debug('Not in Catalyst environment, skipping cache get operation');
      return null;
    }

    const apiUrl = this.getApiUrl();
    const reqHeaders = this.getReqHeaders();

    if (!reqHeaders) {
      this.logger.debug('Missing Catalyst request headers, skipping cache get');
      return null;
    }

    try {
      const fullUrl = apiUrl + `?cacheKey=${key}`;
      const response = await this.httpClient.get<CatalystCacheResponse>(fullUrl, reqHeaders);

      if (response.data && response.data.status === 'success' && response.data.data) {
        return response.data.data.cache_value;
      }
      return null;
    } catch (error) {
      this.logger.debug(
        `Failed to get cache: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      return null;
    }
  }

  async setCache(key: string, value: string): Promise<void> {
    if (!this.isCatalystEnvironment()) {
      this.logger.debug('Not in Catalyst environment, skipping cache set operation');
      return;
    }

    const apiUrl = this.getApiUrl();
    const reqHeaders = this.getReqHeaders();

    if (!reqHeaders) {
      this.logger.debug('Missing Catalyst request headers, skipping cache set');
      return;
    }

    try {
      const reqBody = {
        cache_name: key,
        cache_value: value,
        expiry_in_hours: '1',
      };

      await this.httpClient.post<CatalystCacheResponse>(
        apiUrl!,
        JSON.stringify(reqBody),
        reqHeaders
      );
    } catch (error) {
      this.logger.debug(
        `Failed to set cache: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      // Don't throw, just silently fail
    }
  }

  /**
   * Save token to Catalyst cache
   */
  async saveToken(tokenData: TokenData): Promise<void> {
    if (!this.isCatalystEnvironment()) {
      this.logger.debug('Not in Catalyst environment, skipping token save');
      return;
    }

    try {
      this.logger.debug(`Saving token to Catalyst cache with key: ${this.key}`);

      const dataString = JSON.stringify(tokenData);
      const dataToStore = await this.encryptIfNeeded(dataString);
      await this.setCache(this.key, dataToStore);

      this.logger.debug('Token saved to Catalyst cache successfully');
    } catch (error) {
      this.logger.debug(
        `Failed to save token to Catalyst cache: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      // Don't throw, gracefully degrade
    }
  }

  /**
   * Load token from Catalyst cache
   */
  async loadToken(): Promise<TokenData | null> {
    if (!this.isCatalystEnvironment()) {
      this.logger.debug('Not in Catalyst environment, skipping token load');
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
        this.logger.debug('Failed to parse token data from Catalyst cache');
        return null;
      }
      this.logger.debug(
        `Failed to load token from Catalyst cache: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      return null;
    }
  }

  /**
   * Delete token from Catalyst cache
   */
  async deleteToken(): Promise<void> {
    if (!this.isCatalystEnvironment()) {
      this.logger.debug('Not in Catalyst environment, skipping token delete');
      return;
    }

    try {
      this.logger.debug(`Deleting token from Catalyst cache with key: ${this.key}`);
      await this.setCache(this.key, '');

      this.logger.debug('Token deleted from Catalyst cache successfully');
    } catch (error) {
      this.logger.debug(
        `Failed to delete token from Catalyst cache: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      // Don't throw, gracefully degrade
    }
  }
}
