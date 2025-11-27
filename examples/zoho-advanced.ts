import { Connector, LocalStorageStrategy, ZohoOAuth } from '../src/index';
import type { ZohoOauthConfig } from '../src/index';

/**
 * Advanced Zoho OAuth example
 * 
 * This example demonstrates advanced features:
 * - Background sync
 * - Grace expiry time
 * - Callbacks (onFetchingAccessToken, onTokenRefreshed, onTokenError)
 * - Authorization code flow
 * - Token data inspection
 */
async function advancedExample() {
  // Step 1: Configure storage
  const storageConfig = new LocalStorageStrategy({
    filePath: './zoho-tokens.json',
    encryptionKey: 'default-encryption-key',
  });

  // Step 2: Configure Zoho OAuth
  // Note: URLs are built automatically from accountsDomain
  // Supported domains: accounts.zoho.com, accounts.zoho.eu, accounts.zoho.in, etc.
  const oauthConfig: ZohoOauthConfig = {
    clientId: 'your-client-id',
    clientSecret: 'your-client-secret',
    accountsDomain: 'accounts.zoho.com', // or 'accounts.zoho.eu', 'accounts.zoho.in', etc.
    refreshToken: 'your-refresh-token', // Optional if using authorization code flow
  };

  const serviceConfig = new ZohoOAuth(oauthConfig);

  // Step 3: Create connector with advanced options
  const connector = new Connector(serviceConfig, storageConfig, {
    instanceId: 'zoho-main',
    backgroundSyncIntervalInSecs: 1800, // Check every 30 minutes (1800 seconds)
    graceExpiryTimeInSecs: 300, // Refresh token 5 minutes (300 seconds) before it expires
    debug: process.env.NODE_ENV === 'development',
  });

  try {
    const token = await connector.getAccessToken();
    console.log('✅ Access token retrieved:', token.substring(0, 30) + '...');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    // Cleanup
    console.log('\n🧹 Cleaning up...');
    connector.destroy();
  }
}

