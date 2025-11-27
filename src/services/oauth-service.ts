import { ConnectorConfig, OAuthTokenResponse, TokenData } from '../types';
import { Logger, defaultLogger } from '../utils/logger';
import { HttpClient } from '../utils/http-client';

/**
 * Abstract base class for OAuth services
 */
export abstract class OAuthService {
  protected config: ConnectorConfig;
  protected logger: Logger;
  protected httpClient: HttpClient;

  constructor(config: ConnectorConfig, logger?: Logger) {
    this.config = config;
    this.logger = logger || defaultLogger;
    this.httpClient = new HttpClient(this.logger);
  }

  /**
   * Get refresh token from config (if available)
   */
  getRefreshToken(): string | undefined {
    return this.config.refreshToken;
  }

  /**
   * Refresh access token using refresh token
   */
  abstract refreshAccessToken(refreshToken: string): Promise<TokenData>;

  /**
   * Get authorization URL for initial OAuth flow
   */
  abstract getAuthorizationUrl(redirectUri: string, scopes?: string[]): string;

  /**
   * Exchange authorization code for tokens
   */
  abstract exchangeCodeForTokens(code: string, redirectUri: string): Promise<TokenData>;

  /**
   * Make token refresh request
   */
  protected async makeTokenRequest(
    url: string,
    params: Record<string, string>
  ): Promise<OAuthTokenResponse> {
    try {
      this.logger.debug(`Making token request to: ${url}`);

      const formData = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        formData.append(key, value);
      });

      const response = await this.httpClient.post<OAuthTokenResponse>(url, formData.toString(), {
        'Content-Type': 'application/x-www-form-urlencoded',
      });

      this.logger.debug('Token request successful');
      return response.data;
    } catch (error) {
      this.logger.error(
        `Token request error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      throw error;
    }
  }

  /**
   * Convert OAuth response to TokenData
   */
  protected convertToTokenData(response: OAuthTokenResponse): TokenData {
    const expiresIn = response.expires_in || 3600; // Default to 1 hour
    const expiresAt = Date.now() + expiresIn * 1000;

    return {
      accessToken: response.access_token,
      refreshToken: response.refresh_token,
      expiresAt,
      tokenType: response.token_type || 'Bearer',
      scope: response.scope,
    };
  }
}
