import { TokenData } from './types';
import { OAuthService } from './services/oauth-service';
import { StorageStrategy } from './strategies/storage-strategy';
import { Logger, LogLevel } from './utils/logger';

/**
 * Token manager handles token refresh, expiry checks, and background sync
 */
export class TokenManager {
  private oauthService: OAuthService;
  private storageStrategy: StorageStrategy;
  private logger: Logger;
  private backgroundSyncInterval?: NodeJS.Timeout;
  private backgroundSyncIntervalMinutes?: number;
  private graceExpiryTimeSecs: number; // seconds before expiry to refresh

  constructor(
    oauthService: OAuthService,
    storageStrategy: StorageStrategy,
    backgroundSyncInterval?: number, // minutes - if provided, sync is enabled
    graceExpiryTimeInSecs?: number, // seconds - default 0 (refresh only when expired)
    logger?: Logger
  ) {
    this.oauthService = oauthService;
    this.storageStrategy = storageStrategy;
    this.backgroundSyncIntervalMinutes = backgroundSyncInterval;
    this.graceExpiryTimeSecs = graceExpiryTimeInSecs || 0; // Default to 0 if not provided
    this.logger = logger || new Logger(LogLevel.INFO);
  }

  /**
   * Check if token is expired or within grace period
   */
  private isTokenExpired(tokenData: TokenData): boolean {
    if (!tokenData.expiresAt) {
      return true; // No expiry info, consider expired
    }

    const now = Date.now();
    const gracePeriodMs = this.graceExpiryTimeSecs * 1000; // Convert seconds to milliseconds
    const effectiveExpiryTime = tokenData.expiresAt - gracePeriodMs;

    return now >= effectiveExpiryTime;
  }

  /**
   * Get valid access token, refreshing if necessary
   */
  async getAccessToken(): Promise<string> {
    try {
      // Load token from storage
      let tokenData = await this.storageStrategy.loadToken();

      // If no token or expired, refresh it
      if (!tokenData || this.isTokenExpired(tokenData)) {
        this.logger.debug('Token expired or missing, refreshing...');

        // Get refresh token from storage or fallback to config
        const refreshToken = tokenData?.refreshToken || this.oauthService.getRefreshToken();

        if (!refreshToken) {
          throw new Error('No refresh token available. Please re-authenticate.');
        }

        // Refresh token
        tokenData = await this.oauthService.refreshAccessToken(refreshToken);

        // Save refreshed token
        await this.storageStrategy.saveToken(tokenData);
        this.logger.debug('Token refreshed and saved');
      }

      return tokenData.accessToken;
    } catch (error) {
      this.logger.error(`Failed to get access token: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * Manually refresh token
   */
  async refreshToken(): Promise<TokenData> {
    try {
      const tokenData = await this.storageStrategy.loadToken();

      // Get refresh token from storage or fallback to config
      const refreshToken = tokenData?.refreshToken || this.oauthService.getRefreshToken();

      if (!refreshToken) {
        throw new Error('No refresh token available. Please re-authenticate.');
      }

      this.logger.debug('Manually refreshing token...');
      const newTokenData = await this.oauthService.refreshAccessToken(refreshToken);
      await this.storageStrategy.saveToken(newTokenData);
      this.logger.debug('Token manually refreshed and saved');

      return newTokenData;
    } catch (error) {
      this.logger.error(`Failed to refresh token: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * Start background token sync
   */
  startBackgroundSync(): void {
    if (this.backgroundSyncInterval) {
      this.logger.debug('Background sync already running');
      return;
    }

    if (!this.backgroundSyncIntervalMinutes) {
      this.logger.debug('Background sync is not configured');
      return;
    }

    this.logger.debug(`Starting background sync (interval: ${this.backgroundSyncIntervalMinutes} minutes)`);
    
    const intervalMs = this.backgroundSyncIntervalMinutes * 60 * 1000;
    this.backgroundSyncInterval = setInterval(async () => {
      try {
        this.logger.debug('Background sync: checking token...');
        const tokenData = await this.storageStrategy.loadToken();

        if (tokenData && this.isTokenExpired(tokenData)) {
          this.logger.debug('Background sync: token expired, refreshing...');
          
          // Get refresh token from storage or fallback to config
          const refreshToken = tokenData.refreshToken || this.oauthService.getRefreshToken();
          
          if (refreshToken) {
            const newTokenData = await this.oauthService.refreshAccessToken(refreshToken);
            await this.storageStrategy.saveToken(newTokenData);
            this.logger.debug('Background sync: token refreshed successfully');
          } else {
            this.logger.warn('Background sync: no refresh token available');
          }
        } else {
          this.logger.debug('Background sync: token still valid');
        }
      } catch (error) {
        this.logger.error(`Background sync error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }, intervalMs);
  }

  /**
   * Stop background token sync
   */
  stopBackgroundSync(): void {
    if (this.backgroundSyncInterval) {
      clearInterval(this.backgroundSyncInterval);
      this.backgroundSyncInterval = undefined;
      this.logger.debug('Background sync stopped');
    }
  }

  /**
   * Get current token data
   */
  async getTokenData(): Promise<TokenData | null> {
    return await this.storageStrategy.loadToken();
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.stopBackgroundSync();
  }
}

