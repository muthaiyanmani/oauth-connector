import { Connector, RemoteStorageStrategy, ZohoOAuth } from '../src/index';
import type { TokenData, ZohoOauthConfig } from '../src/index';

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

  const bucketName = 'my-token-bucket';
  const objectKey = 'tokens/zoho-tokens.json';

  // Configure remote persistence
  const persistenceConfig = new RemoteStorageStrategy({
    onUpload: async (tokenData: TokenData) => {
      // Note: If encryption is enabled, tokenData may contain _encrypted and _data fields
      // The strategy handles encryption/decryption automatically
      // Just store the data as-is (it will be encrypted if encryptionKey is provided)
      await s3Client.putObject(objectKey, JSON.stringify(tokenData));
      console.log('Token uploaded to S3');
    },
    onDownload: async (): Promise<TokenData | null> => {
      // Download from S3
      const data = await s3Client.getObject(objectKey);
      if (!data) {
        return null;
      }
      // Return the data as-is (strategy will decrypt if needed)
      return JSON.parse(data) as TokenData;
    },
    encryptionKey: 'your-encryption-key-here',
  });

  // Configure Zoho OAuth
  // URLs are built automatically from accountsDomain
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
    backgroundSyncInterval: 30, // Check every 30 minutes
    debug: true,
  });

  try {
    // Get access token
    const token = await connector.getAccessToken();
    console.log('Access token retrieved:', token.substring(0, 20) + '...');
  } catch (error) {
    console.error('Error:', error);
  }

  // Keep process alive to see background sync
  // In production, you'd typically run this in a long-lived process
  setTimeout(() => {
    connector.destroy();
    process.exit(0);
  }, 60000); // Run for 1 minute
}

// Run example
example().catch(console.error);

