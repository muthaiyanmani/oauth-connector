import { OAuthService } from './oauth-service';
import { ConnectorConfig, TokenData } from '../types';
import { Logger } from '../utils/logger';

/**
 * Google OAuth service implementation
 */
export class GoogleOAuth extends OAuthService {
  constructor(config: ConnectorConfig, logger?: Logger) {
    super(config, logger);
  }

  /**
   * Refresh access token using Google's refresh token endpoint
   */
  async refreshAccessToken(refreshToken: string): Promise<TokenData> {
    this.logger.debug('Refreshing Google access token');

    const params = {
      refresh_token: refreshToken,
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      grant_type: 'refresh_token',
    };

    const response = await this.makeTokenRequest(this.config.refreshUrl, params);
    const tokenData = this.convertToTokenData(response);

    // Google doesn't return a new refresh token, preserve the old one
    if (!tokenData.refreshToken) {
      tokenData.refreshToken = refreshToken;
    }

    this.logger.debug('Google access token refreshed successfully');
    return tokenData;
  }

  /**
   * Get Google authorization URL
   */
  getAuthorizationUrl(
    redirectUri: string,
    scopes: string[] = ['openid', 'email', 'profile']
  ): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.clientId,
      scope: scopes.join(' '),
      redirect_uri: redirectUri,
      access_type: 'offline',
      prompt: 'consent',
    });

    return `${this.config.authUrl}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(code: string, redirectUri: string): Promise<TokenData> {
    this.logger.debug('Exchanging Google authorization code for tokens');

    const params = {
      grant_type: 'authorization_code',
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      redirect_uri: redirectUri,
      code,
    };

    const response = await this.makeTokenRequest(this.config.refreshUrl, params);
    const tokenData = this.convertToTokenData(response);

    this.logger.debug('Google tokens obtained successfully');
    return tokenData;
  }
}
