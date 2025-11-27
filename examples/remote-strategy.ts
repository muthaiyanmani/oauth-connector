import { Connector, RemoteStorageStrategy, ZohoOAuth } from 'oauth-connector';
import type { TokenData, ZohoOauthConfig } from 'oauth-connector';

/**
 * Example: Using Remote Storage Strategy (S3) with Zoho OAuth
 * 
 * Note: This example uses AWS S3, but you can implement
 * any storage backend (Azure Blob, Google Cloud Storage, etc.)
 */
async function example() {
  // Mock S3 client (replace with actual AWS SDK)
  const s3Client = {
    async putObject(key: string, data: string): Promise<void> {
      // Implement your S3 upload logic here
      console.log(`[Mock] Uploading to S3: ${key}`);
      // await s3Client.send(new PutObjectCommand({...}));
    },
    async getObject(key: string): Promise<string | null> {
      // Implement your S3 download logic here
      console.log(`[Mock] Downloading from S3: ${key}`);
      // const response = await s3Client.send(new GetObjectCommand({...}));
      return null; // Return null if not found
    },
  };

  // Configure remote persistence
  const persistenceConfig = new RemoteStorageStrategy({
    onUpload: async (tokenData: TokenData) => {
      await s3Client.putObject("token.json", JSON.stringify(tokenData));
      console.log('Token uploaded to S3');
    },
    onDownload: async (): Promise<TokenData | null> => {
      const data = await s3Client.getObject("token.json");
      if (!data) {
        return null;
      }
      return JSON.parse(data) as TokenData;
    },
    encryptionKey: 'your-encryption-key-here',
  });

  const oauthConfig: ZohoOauthConfig = {
    clientId: 'your-client-id',
    clientSecret: 'your-client-secret',
    accountsDomain: 'accounts.zoho.com', // or 'accounts.zoho.eu', 'accounts.zoho.in', etc.
    refreshToken: 'initial-refresh-token',
  };

  const serviceConfig = new ZohoOAuth(oauthConfig);

  // Create connector with background sync
  const connector = new Connector(serviceConfig, persistenceConfig, {
    instanceId: 'zoho-connector-1',
    backgroundSyncIntervalInSecs: 1800, // Check every 30 minutes (1800 seconds)
    debug: true,
  });

  try {
    // Get access token
    const token = await connector.getAccessToken();
    console.log('Access token ::', token);
  } catch (error) {
    console.error('Error:', error);
  }

}

example().catch(console.error);