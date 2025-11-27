/**
 * Base OAuth configuration (shared fields)
 */
export interface BaseOAuthConfig {
  clientId: string; // OAuth Client ID
  clientSecret: string; // OAuth Client Secret
  refreshToken?: string; // Initial refresh token (optional)
}

/**
 * Zoho-specific OAuth configuration
 */
export interface ZohoOauthConfig {
  clientId: string; // OAuth Client ID
  clientSecret: string; // OAuth Client Secret
  accountsDomain: string; // e.g., "accounts.zoho.com", "accounts.zoho.eu", "accounts.zoho.in"
  refreshToken?: string; // Initial refresh token (optional)
  // URLs are built internally: https://${accountsDomain}/oauth/v2/auth and https://${accountsDomain}/oauth/v2/token
}

/**
 * Generic OAuth connector configuration (for Google and others)
 */
export interface ConnectorConfig extends BaseOAuthConfig {
  authUrl: string; // OAuth authorization URL
  refreshUrl: string; // Token refresh URL
}

/**
 * Token data structure
 */
export interface TokenData {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number; // timestamp in milliseconds
  tokenType?: string;
  scope?: string;
}

/**
 * Remote storage strategy configuration
 */
export interface RemoteStorageConfig {
  onUpload: (data: TokenData) => Promise<void>;
  onDownload: () => Promise<TokenData | null>;
  encryptionKey?: string;
}

/**
 * Local storage strategy configuration
 */
export interface LocalStorageConfig {
  filePath: string;
  encryptionKey?: string;
}

/**
 * Connector options
 */
export interface ConnectorOptions {
  instanceId?: string;
  backgroundSyncIntervalInSecs?: number; // seconds - if provided, background sync is enabled automatically
  graceExpiryTimeInSecs?: number; // seconds - refresh token when expiresAt - graceExpiryTimeInSecs is reached
  debug?: boolean;
}

/**
 * OAuth token response
 */
export interface OAuthTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number; // seconds
  token_type?: string;
  scope?: string;
}

/**
 * Callback function types
 */
export type OnFetchingAccessTokenCallback = () => void | Promise<void>;
export type OnTokenRefreshedCallback = (token: TokenData) => void | Promise<void>;
export type OnTokenErrorCallback = (error: Error) => void | Promise<void>;
