import { Connector, LocalAuthStrategy, ZohoOAuth } from '../src/index';
import type { ZohoOauthConfig } from '../src/index';

/**
 * Example: Using Local File Strategy with Zoho OAuth
 */
async function example() {
  // Configure local file persistence
  const persistenceConfig = new LocalAuthStrategy({
    filePath: './tokens.json',
    encryptionKey: 'your-encryption-key-here',
  });

  // Configure Zoho OAuth
  // URLs are built automatically: https://accounts.zoho.com/oauth/v2/auth and https://accounts.zoho.com/oauth/v2/token
  const oauthConfig: ZohoOauthConfig = {
    clientId: 'your-client-id',
    clientSecret: 'your-client-secret',
    accountsDomain: 'accounts.zoho.com', // or 'accounts.zoho.eu', 'accounts.zoho.in', etc.
    refreshToken: 'initial-refresh-token',
  };

  const serviceConfig = new ZohoOAuth(oauthConfig);

  // Create connector
  const connector = new Connector(serviceConfig, persistenceConfig, {
    debug: true,
    backgroundSync: true,
    refreshTime: 30,
  });

  // Set up callbacks
  connector.onFetchingAccessToken = () => {
    console.log('Fetching access token...');
  };

  connector.onTokenRefreshed = (token) => {
    console.log('Token refreshed:', {
      expiresAt: new Date(token.expiresAt).toISOString(),
      tokenType: token.tokenType,
    });
  };

  connector.onTokenError = (error) => {
    console.error('Token error:', error.message);
  };

  try {
    // Get access token (auto-refreshes if expired)
    const token = await connector.getAccessToken();
    console.log('Access token:', token.substring(0, 20) + '...');

    // Get token data
    const tokenData = await connector.getTokenData();
    console.log('Token data:', {
      expiresAt: tokenData ? new Date(tokenData.expiresAt).toISOString() : null,
      hasRefreshToken: !!tokenData?.refreshToken,
    });
  } catch (error) {
    console.error('Error:', error);
  } finally {
    // Cleanup
    connector.destroy();
  }
}

// Run example
example().catch(console.error);

