import { Connector, LocalStorageStrategy, ZohoOAuth } from '../src/index';
import type { ZohoOauthConfig } from '../src/index';

/**
 * Simple Zoho OAuth example
 * 
 * This example shows the basic usage of the connector with Zoho OAuth.
 * It demonstrates how to:
 * - Configure storage strategy
 * - Set up OAuth service
 * - Get access token
 */
async function simpleExample() {
  // Step 1: Configure storage (optional - can be undefined for in-memory only)
  const storageConfig = new LocalStorageStrategy({
    filePath: './zoho-tokens.json',
    encryptionKey: process.env.ENCRYPTION_KEY || 'default-encryption-key',
  });

  // Step 2: Configure Zoho OAuth
  const oauthConfig: ZohoOauthConfig = {
    clientId: 'your-client-id',
    clientSecret: 'your-client-secret',
    accountsDomain: 'accounts.zoho.com', // or 'accounts.zoho.eu', 'accounts.zoho.in', etc.
    refreshToken: 'your-refresh-token', // Initial refresh token
  };

  const serviceConfig = new ZohoOAuth(oauthConfig);

  // Step 3: Create connector
  const connector = new Connector(serviceConfig, storageConfig);

  try {
    // Step 4: Get access token (auto-refreshes if expired)
    const token = await connector.getAccessToken();
    console.log('✅ Access token retrieved:', token.substring(0, 30) + '...');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    // Cleanup
    connector.destroy();
  }
}


