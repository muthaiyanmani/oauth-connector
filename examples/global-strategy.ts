import { Connector, OAuth } from '../src/index';

/**
 * Example: Using Connector without storage strategy (in-memory only)
 * 
 * This example shows how to use multiple connector instances without storage.
 * Each instance has its own in-memory cache.
 * 
 * Note: GlobalStorageStrategy has been removed. In-memory caching is now
 * built into the connector by default when no storage strategy is provided.
 */
async function example() {
  // Configure generic OAuth
  const oauthConfig = {
    clientId: 'your-client-id',
    clientSecret: 'your-client-secret',
    authUrl: 'https://oauth.example.com/authorize',
    refreshUrl: 'https://oauth.example.com/token',
    refreshToken: 'initial-refresh-token', // Required when no storage strategy
  };

  const serviceConfig = new OAuth(oauthConfig);

  // Create multiple connector instances (each with its own in-memory cache)
  const connector1 = new Connector(serviceConfig, undefined, {
    instanceId: 'connector-1',
    debug: true,
  });

  const connector2 = new Connector(serviceConfig, undefined, {
    instanceId: 'connector-2',
    debug: true,
  });

  try {
    // Use connector 1 (has its own cache)
    const token1 = await connector1.getAccessToken();
    console.log('Connector 1 token:', token1.substring(0, 20) + '...');

    // Use connector 2 (separate instance, separate cache)
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
