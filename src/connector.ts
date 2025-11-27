import { OAuthService } from './services/oauth-service';
import { AuthStrategy } from './strategies/auth-strategy';
import { TokenManager } from './token-manager';
import {
  ConnectorOptions,
  TokenData,
  OnFetchingAccessTokenCallback,
  OnTokenRefreshedCallback,
  OnTokenErrorCallback,
} from './types';
import { Logger, LogLevel } from './utils/logger';

/**
 * Main Connector class that orchestrates OAuth service and persistence strategy
 */
export class Connector {
  private oauthService: OAuthService;
  private authStrategy: AuthStrategy;
  private tokenManager: TokenManager;
  private logger: Logger;

  // Callbacks
  public onFetchingAccessToken?: OnFetchingAccessTokenCallback;
  public onTokenRefreshed?: OnTokenRefreshedCallback;
  public onTokenError?: OnTokenErrorCallback;

  constructor(
    oauthService: OAuthService,
    authStrategy: AuthStrategy,
    options: ConnectorOptions = {}
  ) {
    this.oauthService = oauthService;
    this.authStrategy = authStrategy;

    // Setup logger
    const logLevel = options.debug ? LogLevel.DEBUG : LogLevel.INFO;
    this.logger = new Logger(logLevel, options.instanceId);

    // Set instance ID for global strategy if applicable
    if (options.instanceId && 'setInstanceId' in authStrategy) {
      (authStrategy as any).setInstanceId(options.instanceId);
    }

    // Create token manager
    const refreshIn = options.refreshTime || 30;
    const backgroundSync = options.backgroundSync || false;
    const refreshTime = options.refreshTime || 30;

    this.tokenManager = new TokenManager(
      this.oauthService,
      this.authStrategy,
      refreshIn,
      backgroundSync,
      refreshTime,
      this.logger
    );

    // Start background sync if enabled
    if (backgroundSync) {
      this.tokenManager.startBackgroundSync();
    }

    this.logger.debug(`Connector initialized (instance: ${options.instanceId || 'default'})`);
  }

  /**
   * Get access token (auto-refreshes if expired)
   */
  async getAccessToken(): Promise<string> {
    try {
      // Trigger callback
      if (this.onFetchingAccessToken) {
        await this.onFetchingAccessToken();
      }

      const token = await this.tokenManager.getAccessToken();

      // Trigger callback if token was refreshed
      const tokenData = await this.tokenManager.getTokenData();
      if (tokenData) {
        // Check if token was just refreshed (heuristic: expiresAt is far in future)
        const timeUntilExpiry = tokenData.expiresAt - Date.now();
        if (timeUntilExpiry > 25 * 60 * 1000) {
          // More than 25 minutes, likely just refreshed
          if (this.onTokenRefreshed) {
            await this.onTokenRefreshed(tokenData);
          }
        }
      }

      return token;
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      
      if (this.onTokenError) {
        await this.onTokenError(err);
      }

      this.logger.error(`Failed to get access token: ${err.message}`);
      throw err;
    }
  }

  /**
   * Manually refresh token
   */
  async refreshToken(): Promise<TokenData> {
    try {
      if (this.onFetchingAccessToken) {
        await this.onFetchingAccessToken();
      }

      const tokenData = await this.tokenManager.refreshToken();

      if (this.onTokenRefreshed) {
        await this.onTokenRefreshed(tokenData);
      }

      return tokenData;
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      
      if (this.onTokenError) {
        await this.onTokenError(err);
      }

      this.logger.error(`Failed to refresh token: ${err.message}`);
      throw err;
    }
  }

  /**
   * Get current token data
   */
  async getTokenData(): Promise<TokenData | null> {
    return await this.tokenManager.getTokenData();
  }

  /**
   * Get authorization URL for initial OAuth flow
   */
  getAuthorizationUrl(redirectUri: string, scopes?: string[]): string {
    return this.oauthService.getAuthorizationUrl(redirectUri, scopes);
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(code: string, redirectUri: string): Promise<TokenData> {
    try {
      this.logger.debug('Exchanging authorization code for tokens');
      const tokenData = await this.oauthService.exchangeCodeForTokens(code, redirectUri);
      await this.authStrategy.saveToken(tokenData);
      this.logger.debug('Tokens obtained and saved');
      return tokenData;
    } catch (error) {
      this.logger.error(`Failed to exchange code for tokens: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * Delete stored token
   */
  async deleteToken(): Promise<void> {
    try {
      await this.authStrategy.deleteToken();
      this.logger.debug('Token deleted');
    } catch (error) {
      this.logger.error(`Failed to delete token: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * Start background sync
   */
  startBackgroundSync(): void {
    this.tokenManager.startBackgroundSync();
  }

  /**
   * Stop background sync
   */
  stopBackgroundSync(): void {
    this.tokenManager.stopBackgroundSync();
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.tokenManager.destroy();
    this.logger.debug('Connector destroyed');
  }
}

