import { Connector, ZohoOAuth } from '../src/index';
import type { ZohoOauthConfig } from '../src/index';

/**
 * Example: Using Connector without storage strategy (in-memory only)
 * 
 * This example shows how to use the connector with only in-memory caching.
 * Tokens are cached in memory for performance but not persisted to disk.
 * Useful for short-lived processes or when persistence isn't needed.
 */
async function example() {
  // Configure Zoho OAuth
  // Note: You must provide refreshToken in config since there's no storage
  const oauthConfig: ZohoOauthConfig = {
    clientId: 'your-client-id',
    clientSecret: 'your-client-secret',
    accountsDomain: 'accounts.zoho.com',
    refreshToken: 'initial-refresh-token', // Required when no storage strategy
  };

  const serviceConfig = new ZohoOAuth(oauthConfig);

  // Create connector WITHOUT storage strategy (in-memory only)
  const connector = new Connector(serviceConfig, undefined, {
    instanceId: 'in-memory-connector',
    backgroundSyncInterval: 30, // Check every 30 minutes
    graceExpiryTimeInSecs: 300, // Refresh 5 minutes before expiry
    debug: true,
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
    // Get access token (cached in memory after first call)
    const token1 = await connector.getAccessToken();
    console.log('First call - Access token:', token1.substring(0, 20) + '...');

    // Second call - returns from cache (no storage read)
    const token2 = await connector.getAccessToken();
    console.log('Second call - Access token (from cache):', token2.substring(0, 20) + '...');

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

