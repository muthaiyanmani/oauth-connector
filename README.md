# OAuth Connector SDK

A Node.js SDK for OAuth token management with multiple persistence strategies, encryption support, and background token synchronization.

[![GitHub](https://img.shields.io/github/license/muthaiyanmani/oauth-connector)](https://github.com/muthaiyanmani/oauth-connector/blob/main/LICENSE)
[![npm](https://img.shields.io/npm/v/oauth-connector)](https://www.npmjs.com/package/oauth-connector)

## Features

- 🔐 **Optional Persistence**: Local file or remote storage (S3, etc.) - storage strategy is optional
- 🔒 **Encryption Support**: AES-256-GCM encryption for token storage
- 🔄 **Automatic Token Refresh**: Automatic token refresh when expired or within grace period
- ⚙️ **Multiple OAuth Providers**: Zoho, Google, and generic OAuth support
- 🔁 **Background Sync**: Automatic token refresh in the background

## Installation

```bash
npm install oauth-connector
```

## Quick Start

```typescript
import { Connector, ZohoOAuth } from 'oauth-connector';
import type { ZohoOauthConfig } from 'oauth-connector';

const oauthConfig: ZohoOauthConfig = {
  clientId: 'your-client-id',
  clientSecret: 'your-client-secret',
  accountsDomain: 'accounts.zoho.com',
  refreshToken: 'initial-refresh-token'
};

const serviceConfig = new ZohoOAuth(oauthConfig);

// Create connector WITHOUT storage strategy (in-memory cache only)
const connector = new Connector(serviceConfig);

const token = await connector.getAccessToken();
console.log(token);
```

### Local File Strategy with Zoho

```typescript
import { Connector, LocalStorageStrategy, ZohoOAuth } from 'oauth-connector';
import type { ZohoOauthConfig } from 'oauth-connector';

const storageConfig = new LocalStorageStrategy({
  filePath: './tokens.json',
  encryptionKey: 'your-encryption-key',
});

const oauthConfig: ZohoOauthConfig = {
  clientId: 'your-client-id',
  clientSecret: 'your-client-secret',
  accountsDomain: 'accounts.zoho.com', // or 'accounts.zoho.eu', 'accounts.zoho.in', etc.
  refreshToken: 'initial-refresh-token'
};

const serviceConfig = new ZohoOAuth(oauthConfig);
const connector = new Connector(serviceConfig, storageConfig);

const token = await connector.getAccessToken();
console.log(token);
```

### Remote Strategy

```typescript
import { Connector, RemoteStorageStrategy, ZohoOAuth } from 'oauth-connector';
import type { ZohoOauthConfig, TokenData } from 'oauth-connector';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({ region: 'us-east-1' });
const bucketName = 'my-token-bucket';

const storageConfig = new RemoteStorageStrategy({
  onUpload: async (tokenData: TokenData) => {
    await s3Client.send(new PutObjectCommand({
      Bucket: bucketName,
      Key: 'tokens.json',
      Body: JSON.stringify(tokenData),
    }));
  },
  onDownload: async (): Promise<TokenData | null> => {
   try{
      const response = await s3Client.send(new GetObjectCommand({
        Bucket: bucketName,
        Key: 'tokens.json',
      }));
      const data = await response.Body.transformToString();
      return JSON.parse(data);
   } catch{
      return null;
   }
  },
  encryptionKey: 'your-encryption-key',
});

const oauthConfig: ZohoOauthConfig = {
  clientId: 'your-client-id',
  clientSecret: 'your-client-secret',
  accountsDomain: 'accounts.zoho.com',
  refreshToken: 'initial-refresh-token',
};

const serviceConfig = new ZohoOAuth(oauthConfig);
const connector = new Connector(serviceConfig, storageConfig, {});
```

### Catalyst Cache Strategy
> Note: This will work only on Catalyst Function/Appsail.
```typescript
import { Connector, CatalystCacheStorageStrategy, ZohoOAuth } from 'oauth-connector';
import type { ZohoOauthConfig } from 'oauth-connector';
import { IncomingMessage } from 'http';
import express from 'express';

const app = express();

app.post('/api/oauth', async (req: express.Request, res: express.Response) => {
  const storageConfig = new CatalystCacheStorageStrategy({
    httpReq: req as IncomingMessage,
    key: 'oauth-token',
    encryptionKey: 'your-encryption-key', // Optional
  });

  const oauthConfig: ZohoOauthConfig = {
    clientId: 'your-client-id',
    clientSecret: 'your-client-secret',
    accountsDomain: 'accounts.zoho.com',
    refreshToken: 'initial-refresh-token',
  };

  const serviceConfig = new ZohoOAuth(oauthConfig);
  const connector = new Connector(serviceConfig, storageConfig);

  const token = await connector.getAccessToken();
  res.json({ token });
});
```

## API Reference

### Connector

Main class that orchestrates OAuth service and persistence strategy.

#### Constructor

```typescript
new Connector(
  oauthService: OAuthService,
  storageStrategy?: StorageStrategy, // Optional
  options?: ConnectorOptions
)
```

#### Options

```typescript
interface ConnectorOptions {
  instanceId?: string;              // Unique ID for multi-instance support
  backgroundSyncIntervalInSecs?: number;  // Seconds between background syncs (if provided, sync is enabled)
  graceExpiryTimeInSecs?: number;   // Seconds - refresh token when expiresAt - graceExpiryTimeInSecs is reached (default: 0)
  debug?: boolean;                  // Enable debug logging
}
```

#### Methods

- `getAccessToken(): Promise<string>` - Get access token (auto-refreshes if expired). Uses in-memory cache for fast access.
- `refreshToken(): Promise<TokenData>` - Manually refresh token
- `destroy(): void` - Cleanup resources (stops background sync and clears cache)

#### Callbacks

```typescript
connector.onFetchingAccessToken = () => {
  console.log('Fetching token...');
};

connector.onTokenRefreshed = (token: TokenData) => {
  console.log('Token refreshed:', token);
};

connector.onTokenError = (error: Error) => {
  console.error('Token error:', error);
};
```

**Note:** If no storage strategy is provided, the connector uses in-memory caching only. Tokens are cached for performance but not persisted across restarts.

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## Repository Links

- **GitHub**: [https://github.com/muthaiyanmani/oauth-connector](https://github.com/muthaiyanmani/oauth-connector)
- **Issues**: [https://github.com/muthaiyanmani/oauth-connector/issues](https://github.com/muthaiyanmani/oauth-connector/issues)
- **npm**: [https://www.npmjs.com/package/oauth-connector](https://www.npmjs.com/package/oauth-connector)

## Development

### Build

```bash
npm run build
```

### Lint

```bash
npm run lint
npm run lint:fix
```

### Format

```bash
npm run format
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

