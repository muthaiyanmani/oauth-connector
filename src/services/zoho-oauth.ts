import { OAuthService } from './oauth-service';
import { ZohoOauthConfig, ConnectorConfig, TokenData } from '../types';
import { Logger } from '../utils/logger';

/**
 * Zoho OAuth service implementation
 */
export class ZohoOAuth extends OAuthService {
  private zohoConfig: ZohoOauthConfig;
  private authUrl: string;
  private refreshUrl: string;

  constructor(config: ZohoOauthConfig, logger?: Logger) {
    // Build URLs from accountsDomain
    const baseUrl = `https://${config.accountsDomain}`;
    const connectorConfig: ConnectorConfig = {
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      authUrl: `${baseUrl}/oauth/v2/auth`,
      refreshUrl: `${baseUrl}/oauth/v2/token`,
      refreshToken: config.refreshToken,
    };
    super(connectorConfig, logger);
    this.zohoConfig = config;
    this.authUrl = connectorConfig.authUrl;
    this.refreshUrl = connectorConfig.refreshUrl;
  }

  /**
   * Refresh access token using Zoho's refresh token endpoint
   */
  async refreshAccessToken(refreshToken: string): Promise<TokenData> {
    this.logger.debug('Refreshing Zoho access token');

    const params = {
      refresh_token: refreshToken,
      client_id: this.zohoConfig.clientId,
      client_secret: this.zohoConfig.clientSecret,
      grant_type: 'refresh_token',
    };

    const response = await this.makeTokenRequest(this.refreshUrl, params);
    const tokenData = this.convertToTokenData(response);

    // Zoho may not return a new refresh token, so preserve the old one if not provided
    if (!tokenData.refreshToken) {
      tokenData.refreshToken = refreshToken;
    }

    this.logger.debug('Zoho access token refreshed successfully');
    return tokenData;
  }

  /**
   * Get Zoho authorization URL
   */
  getAuthorizationUrl(redirectUri: string, scopes: string[] = ['ZohoCRM.modules.ALL']): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.zohoConfig.clientId,
      scope: scopes.join(','),
      redirect_uri: redirectUri,
      access_type: 'offline',
      prompt: 'consent',
    });

    return `${this.authUrl}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(code: string, redirectUri: string): Promise<TokenData> {
    this.logger.debug('Exchanging Zoho authorization code for tokens');

    const params = {
      grant_type: 'authorization_code',
      client_id: this.zohoConfig.clientId,
      client_secret: this.zohoConfig.clientSecret,
      redirect_uri: redirectUri,
      code,
    };

    const response = await this.makeTokenRequest(this.refreshUrl, params);
    const tokenData = this.convertToTokenData(response);

    this.logger.debug('Zoho tokens obtained successfully');
    return tokenData;
  }
}
