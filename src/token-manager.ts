import { TokenData } from './types';
import { OAuthService } from './services/oauth-service';
import { AuthStrategy } from './strategies/auth-strategy';
import { Logger, LogLevel } from './utils/logger';

/**
 * Token manager handles token refresh, expiry checks, and background sync
 */
export class TokenManager {
  private oauthService: OAuthService;
  private authStrategy: AuthStrategy;
  private logger: Logger;
  private refreshIn: number; // minutes before expiry
  private backgroundSyncInterval?: NodeJS.Timeout;
  private backgroundSyncEnabled: boolean;
  private refreshTime: number; // minutes between background syncs

  constructor(
    oauthService: OAuthService,
    authStrategy: AuthStrategy,
    refreshIn: number = 30,
    backgroundSync: boolean = false,
    refreshTime: number = 30,
    logger?: Logger
  ) {
    this.oauthService = oauthService;
    this.authStrategy = authStrategy;
    this.refreshIn = refreshIn;
    this.backgroundSyncEnabled = backgroundSync;
    this.refreshTime = refreshTime;
    this.logger = logger || new Logger(LogLevel.INFO);
  }

  /**
   * Check if token is expired or about to expire
   */
  private isTokenExpiredOrExpiring(tokenData: TokenData): boolean {
    if (!tokenData.expiresAt) {
      return true; // No expiry info, consider expired
    }

    const now = Date.now();
    const refreshThreshold = this.refreshIn * 60 * 1000; // Convert minutes to milliseconds
    const timeUntilExpiry = tokenData.expiresAt - now;

    return timeUntilExpiry <= refreshThreshold;
  }

  /**
   * Get valid access token, refreshing if necessary
   */
  async getAccessToken(): Promise<string> {
    try {
      // Load token from storage
      let tokenData = await this.authStrategy.loadToken();

      // If no token or expired, refresh it
      if (!tokenData || this.isTokenExpiredOrExpiring(tokenData)) {
        this.logger.debug('Token expired or missing, refreshing...');

        if (!tokenData?.refreshToken) {
          throw new Error('No refresh token available. Please re-authenticate.');
        }

        // Refresh token
        tokenData = await this.oauthService.refreshAccessToken(tokenData.refreshToken);

        // Save refreshed token
        await this.authStrategy.saveToken(tokenData);
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
      const tokenData = await this.authStrategy.loadToken();

      if (!tokenData?.refreshToken) {
        throw new Error('No refresh token available. Please re-authenticate.');
      }

      this.logger.debug('Manually refreshing token...');
      const newTokenData = await this.oauthService.refreshAccessToken(tokenData.refreshToken);
      await this.authStrategy.saveToken(newTokenData);
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

    if (!this.backgroundSyncEnabled) {
      this.logger.debug('Background sync is disabled');
      return;
    }

    this.logger.debug(`Starting background sync (interval: ${this.refreshTime} minutes)`);
    
    const intervalMs = this.refreshTime * 60 * 1000;
    this.backgroundSyncInterval = setInterval(async () => {
      try {
        this.logger.debug('Background sync: checking token...');
        const tokenData = await this.authStrategy.loadToken();

        if (tokenData && this.isTokenExpiredOrExpiring(tokenData)) {
          this.logger.debug('Background sync: token expiring, refreshing...');
          if (tokenData.refreshToken) {
            const newTokenData = await this.oauthService.refreshAccessToken(tokenData.refreshToken);
            await this.authStrategy.saveToken(newTokenData);
            this.logger.debug('Background sync: token refreshed successfully');
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
    return await this.authStrategy.loadToken();
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.stopBackgroundSync();
  }
}

