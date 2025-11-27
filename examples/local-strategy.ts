import { Connector, LocalStorageStrategy, ZohoOAuth } from 'oauth-connector';
import type { ZohoOauthConfig } from 'oauth-connector';

/**
 * Example: Using Local File Storage Strategy with Zoho OAuth
 */
async function example() {
  const persistenceConfig = new LocalStorageStrategy({
    filePath: './token.json',
    encryptionKey: '123z2DSDW',
  });

  const oauthConfig: ZohoOauthConfig = {
    clientId: 'your-client-id',
    clientSecret: 'your-client-secret',
    accountsDomain: 'accounts.zoho.com', // or 'accounts.zoho.eu', 'accounts.zoho.in', etc.
    refreshToken: 'initial-refresh-token',
  };

  const serviceConfig = new ZohoOAuth(oauthConfig);

  const connector = new Connector(serviceConfig, persistenceConfig, {
    debug: true,
    backgroundSyncIntervalInSecs: 1800
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
    const token = await connector.getAccessToken();
    console.log('Access token:', token);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    connector.destroy();
  }
}

example().catch(console.error);
