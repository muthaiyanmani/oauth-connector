import { OAuthService } from './oauth-service';
import { ConnectorConfig, TokenData } from '../types';
import { Logger } from '../utils/logger';

/**
 * Generic OAuth service implementation
 */
export class OAuth extends OAuthService {
  constructor(config: ConnectorConfig, logger?: Logger) {
    super(config, logger);
  }

  /**
   * Refresh access token using generic OAuth refresh flow
   */
  async refreshAccessToken(refreshToken: string): Promise<TokenData> {
    this.logger.debug('Refreshing access token (generic OAuth)');

    const params = {
      refresh_token: refreshToken,
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      grant_type: 'refresh_token',
    };

    const response = await this.makeTokenRequest(this.config.refreshUrl, params);
    const tokenData = this.convertToTokenData(response);

    // Preserve refresh token if not provided in response
    if (!tokenData.refreshToken) {
      tokenData.refreshToken = refreshToken;
    }

    this.logger.debug('Access token refreshed successfully (generic OAuth)');
    return tokenData;
  }

  /**
   * Get authorization URL (generic implementation)
   */
  getAuthorizationUrl(redirectUri: string, scopes: string[] = []): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.clientId,
      redirect_uri: redirectUri,
      access_type: 'offline',
      prompt: 'consent',
    });

    if (scopes.length > 0) {
      params.append('scope', scopes.join(' '));
    }

    return `${this.config.authUrl}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(code: string, redirectUri: string): Promise<TokenData> {
    this.logger.debug('Exchanging authorization code for tokens (generic OAuth)');

    const params = {
      grant_type: 'authorization_code',
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      redirect_uri: redirectUri,
      code,
    };

    const response = await this.makeTokenRequest(this.config.refreshUrl, params);
    const tokenData = this.convertToTokenData(response);

    this.logger.debug('Tokens obtained successfully (generic OAuth)');
    return tokenData;
  }
}
