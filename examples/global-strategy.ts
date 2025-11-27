import { Connector, GlobalStorageStrategy, OAuth } from '../src/index';

/**
 * Example: Using Global Variable Storage Strategy with Generic OAuth
 */
async function example() {
  // Configure global variable persistence
  const persistenceConfig = new GlobalStorageStrategy({
    encryptionKey: 'your-encryption-key-here',
  });

  // Configure generic OAuth
  const oauthConfig = {
    clientId: 'your-client-id',
    clientSecret: 'your-client-secret',
    authUrl: 'https://oauth.example.com/authorize',
    refreshUrl: 'https://oauth.example.com/token',
    refreshToken: 'initial-refresh-token',
  };

  const serviceConfig = new OAuth(oauthConfig);

  // Create multiple connector instances
  const connector1 = new Connector(serviceConfig, persistenceConfig, {
    instanceId: 'connector-1',
    debug: true,
  });

  const connector2 = new Connector(serviceConfig, persistenceConfig, {
    instanceId: 'connector-2',
    debug: true,
  });

  try {
    // Use connector 1
    const token1 = await connector1.getAccessToken();
    console.log('Connector 1 token:', token1.substring(0, 20) + '...');

    // Use connector 2 (separate instance)
    const token2 = await connector2.getAccessToken();
    console.log('Connector 2 token:', token2.substring(0, 20) + '...');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    connector1.destroy();
    connector2.destroy();
  }
}

// Run example
example().catch(console.error);

