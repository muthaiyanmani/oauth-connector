import { Connector, LocalAuthStrategy, ZohoOAuth } from '../src/index';
import type { ZohoOauthConfig } from '../src/index';

/**
 * Complete Zoho OAuth example with authorization flow
 */
async function zohoExample() {
  // Step 1: Configure persistence
  const persistenceConfig = new LocalAuthStrategy({
    filePath: './zoho-tokens.json',
    encryptionKey: process.env.ENCRYPTION_KEY || 'default-encryption-key',
  });

  // Step 2: Configure Zoho OAuth
  // Note: URLs are built automatically from accountsDomain
  // Supported domains: accounts.zoho.com, accounts.zoho.eu, accounts.zoho.in, etc.
  const oauthConfig: ZohoOauthConfig = {
    clientId: process.env.ZOHO_CLIENT_ID || 'your-client-id',
    clientSecret: process.env.ZOHO_CLIENT_SECRET || 'your-client-secret',
    accountsDomain: 'accounts.zoho.com', // or 'accounts.zoho.eu', 'accounts.zoho.in', etc.
    refreshToken: process.env.ZOHO_REFRESH_TOKEN, // Optional, for initial setup
  };

  const serviceConfig = new ZohoOAuth(oauthConfig);

  // Step 3: Create connector
  const connector = new Connector(serviceConfig, persistenceConfig, {
    instanceId: 'zoho-main',
    backgroundSync: true,
    refreshTime: 30,
    debug: process.env.NODE_ENV === 'development',
  });

  // Step 4: Set up callbacks
  connector.onFetchingAccessToken = () => {
    console.log('🔄 Fetching access token...');
  };

  connector.onTokenRefreshed = (token) => {
    console.log('✅ Token refreshed successfully');
    console.log(`   Expires at: ${new Date(token.expiresAt).toLocaleString()}`);
  };

  connector.onTokenError = (error) => {
    console.error('❌ Token error:', error.message);
  };

  try {
    // If you have a refresh token, you can use it directly
    if (oauthConfig.refreshToken) {
      const token = await connector.getAccessToken();
      console.log('✅ Access token retrieved:', token.substring(0, 30) + '...');

      // Use the token for API calls
      // const response = await fetch('https://www.zohoapis.com/crm/v2/Contacts', {
      //   headers: { Authorization: `Bearer ${token}` }
      // });
    } else {
      // Step 5: Get authorization URL for initial setup
      const redirectUri = 'http://localhost:3000/callback';
      const scopes = ['ZohoCRM.modules.ALL'];
      const authUrl = connector.getAuthorizationUrl(redirectUri, scopes);

      console.log('📋 Authorization URL:');
      console.log(authUrl);
      console.log('\n1. Visit the URL above');
      console.log('2. Authorize the application');
      console.log('3. Copy the authorization code from the callback URL');
      console.log('4. Use exchangeCodeForTokens() to get tokens');

      // Example: Exchange code for tokens
      // const code = 'authorization-code-from-callback';
      // const tokenData = await connector.exchangeCodeForTokens(code, redirectUri);
      // console.log('Tokens obtained:', tokenData);
    }

    // Get current token data
    const tokenData = await connector.getTokenData();
    if (tokenData) {
      console.log('\n📊 Current token info:');
      console.log(`   Expires at: ${new Date(tokenData.expiresAt).toLocaleString()}`);
      console.log(`   Token type: ${tokenData.tokenType || 'Bearer'}`);
      console.log(`   Has refresh token: ${!!tokenData.refreshToken}`);
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }

  // Note: In a real application, you'd keep the connector alive
  // For this example, we'll clean up after a delay
  setTimeout(() => {
    console.log('\n🧹 Cleaning up...');
    connector.destroy();
  }, 5000);
}

// Run example
if (require.main === module) {
  zohoExample().catch(console.error);
}

