import { TokenData } from './types';
import { OAuthService } from './services/oauth-service';
import { StorageStrategy } from './strategies/storage-strategy';
import { Logger, LogLevel } from './utils/logger';

/**
 * Token manager handles token refresh, expiry checks, and background sync
 */
export class TokenManager {
  private oauthService: OAuthService;
  private storageStrategy?: StorageStrategy;
  private logger: Logger;
  private backgroundSyncInterval?: NodeJS.Timeout;
  private backgroundSyncIntervalSecs?: number;
  private graceExpiryTimeSecs: number; // seconds before expiry to refresh
  private cachedTokenData: TokenData | null = null; // In-memory cache

  constructor(
    oauthService: OAuthService,
    storageStrategy?: StorageStrategy, // Make optional
    backgroundSyncIntervalInSecs?: number, // seconds - if provided, sync is enabled
    graceExpiryTimeInSecs?: number, // seconds - default 0 (refresh only when expired)
    logger?: Logger
  ) {
    this.oauthService = oauthService;
    this.storageStrategy = storageStrategy;
    this.backgroundSyncIntervalSecs = backgroundSyncIntervalInSecs;
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
   * Checks in-memory cache first for performance
   */
  async getAccessToken(): Promise<string> {
    try {
      // Step 1: Check in-memory cache first
      if (this.cachedTokenData && !this.isTokenExpired(this.cachedTokenData)) {
        this.logger.debug('Returning token from cache');
        return this.cachedTokenData.accessToken;
      }

      // Step 2: Cache miss or expired - load from storage (if available)
      let tokenData: TokenData | null = null;
      if (this.storageStrategy) {
        tokenData = await this.storageStrategy.loadToken();
      } else {
        // No storage strategy - use cache only
        tokenData = this.cachedTokenData;
      }

      // Step 3: If no token or expired, refresh it
      if (!tokenData || this.isTokenExpired(tokenData)) {
        this.logger.debug('Token expired or missing, refreshing...');

        const refreshToken = tokenData?.refreshToken || this.oauthService.getRefreshToken();
        if (!refreshToken) {
          throw new Error('No refresh token available. Please re-authenticate.');
        }

        // Refresh token
        tokenData = await this.oauthService.refreshAccessToken(refreshToken);

        // Save to storage (if available)
        if (this.storageStrategy) {
          await this.storageStrategy.saveToken(tokenData);
        }
        this.logger.debug('Token refreshed and saved');
      }

      // Step 4: Update cache
      this.cachedTokenData = tokenData;
      this.logger.debug('Token cached in memory');

      return tokenData.accessToken;
    } catch (error) {
      // Clear cache on error
      this.cachedTokenData = null;
      this.logger.error(`Failed to get access token: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * Manually refresh token
   */
  async refreshToken(): Promise<TokenData> {
    try {
      // Load from storage or cache
      let tokenData: TokenData | null = null;
      if (this.storageStrategy) {
        tokenData = await this.storageStrategy.loadToken();
      } else {
        tokenData = this.cachedTokenData;
      }

      const refreshToken = tokenData?.refreshToken || this.oauthService.getRefreshToken();
      if (!refreshToken) {
        throw new Error('No refresh token available. Please re-authenticate.');
      }

      this.logger.debug('Manually refreshing token...');
      const newTokenData = await this.oauthService.refreshAccessToken(refreshToken);
      
      // Update storage (if available) and cache
      if (this.storageStrategy) {
        await this.storageStrategy.saveToken(newTokenData);
      }
      this.cachedTokenData = newTokenData;
      
      this.logger.debug('Token manually refreshed and saved');
      return newTokenData;
    } catch (error) {
      this.cachedTokenData = null;
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

    if (!this.backgroundSyncIntervalSecs) {
      this.logger.debug('Background sync is not configured');
      return;
    }

    this.logger.debug(`Starting background sync (interval: ${this.backgroundSyncIntervalSecs} seconds)`);
    
    const intervalMs = this.backgroundSyncIntervalSecs * 1000;
    this.backgroundSyncInterval = setInterval(async () => {
      try {
        this.logger.debug('Background sync: checking token...');
        
        // Check cache first, fallback to storage
        let tokenData: TokenData | null = this.cachedTokenData;
        if (!tokenData && this.storageStrategy) {
          tokenData = await this.storageStrategy.loadToken();
        }

        if (tokenData && this.isTokenExpired(tokenData)) {
          this.logger.debug('Background sync: token expired, refreshing...');
          
          const refreshToken = tokenData.refreshToken || this.oauthService.getRefreshToken();
          
          if (refreshToken) {
            const newTokenData = await this.oauthService.refreshAccessToken(refreshToken);
            if (this.storageStrategy) {
              await this.storageStrategy.saveToken(newTokenData);
            }
            this.cachedTokenData = newTokenData;
            this.logger.debug('Background sync: token refreshed successfully');
          } else {
            this.logger.warn('Background sync: no refresh token available');
          }
        } else {
          this.logger.debug('Background sync: token still valid');
        }
      } catch (error) {
        this.cachedTokenData = null;
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
   * Get current token data (uses cache)
   */
  async getTokenData(): Promise<TokenData | null> {
    // Return from cache if available
    if (this.cachedTokenData) {
      return this.cachedTokenData;
    }
    
    // Otherwise load from storage (if available)
    if (this.storageStrategy) {
      const tokenData = await this.storageStrategy.loadToken();
      if (tokenData) {
        this.cachedTokenData = tokenData; // Cache it
      }
      return tokenData;
    }
    
    return null;
  }

  /**
   * Set cached token (used after exchangeCodeForTokens)
   */
  setCachedToken(tokenData: TokenData): void {
    this.cachedTokenData = tokenData;
    this.logger.debug('Token cached in memory');
  }

  /**
   * Clear cached token
   */
  clearCache(): void {
    this.cachedTokenData = null;
    this.logger.debug('Token cache cleared');
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.stopBackgroundSync();
    this.clearCache();
  }
}

