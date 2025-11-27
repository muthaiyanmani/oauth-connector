# OAuth Connector SDK

A Node.js SDK for OAuth token management with multiple persistence strategies, encryption support, and background token synchronization.

[![GitHub](https://img.shields.io/github/license/muthaiyanmani/oauth-connector)](https://github.com/muthaiyanmani/oauth-connector/blob/main/LICENSE)
[![npm](https://img.shields.io/npm/v/oauth-connector)](https://www.npmjs.com/package/oauth-connector)

## Features

- 🚀 **In-Memory Caching**: Built-in in-memory cache for fast token access (no storage required)
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

### In-Memory Only (No Storage)

```typescript
import { Connector, ZohoOAuth } from 'oauth-connector';
import type { ZohoOauthConfig } from 'oauth-connector';

// Zoho OAuth config
const oauthConfig: ZohoOauthConfig = {
  clientId: 'your-client-id',
  clientSecret: 'your-client-secret',
  accountsDomain: 'accounts.zoho.com',
  refreshToken: 'initial-refresh-token' // Required when no storage strategy
};

const serviceConfig = new ZohoOAuth(oauthConfig);

// Create connector WITHOUT storage strategy (in-memory cache only)
const connector = new Connector(serviceConfig, undefined, {
  debug: true,
  backgroundSyncInterval: 30,
  graceExpiryTimeInSecs: 300,
});

// Get access token (cached in memory after first call)
const token = await connector.getAccessToken();
```

### Local File Strategy with Zoho

```typescript
import { Connector, LocalStorageStrategy, ZohoOAuth } from 'oauth-connector';
import type { ZohoOauthConfig } from 'oauth-connector';

const persistenceConfig = new LocalStorageStrategy({
  filePath: './tokens.json',
  encryptionKey: 'your-encryption-key',
});

// Zoho OAuth config - URLs are built automatically from accountsDomain
const oauthConfig: ZohoOauthConfig = {
  clientId: 'your-client-id',
  clientSecret: 'your-client-secret',
  accountsDomain: 'accounts.zoho.com', // or 'accounts.zoho.eu', 'accounts.zoho.in', etc.
  refreshToken: 'initial-refresh-token'
};

const serviceConfig = new ZohoOAuth(oauthConfig);
const connector = new Connector(serviceConfig, persistenceConfig, {
  debug: true,
  backgroundSyncInterval: 30, // Check every 30 minutes
  graceExpiryTimeInSecs: 300, // Refresh token 5 minutes (300 seconds) before it expires
});

// Get access token (auto-refreshes if expired or within grace period)
const token = await connector.getAccessToken();
```

### Remote Strategy (S3)

```typescript
import { Connector, RemoteStorageStrategy, ZohoOAuth } from 'oauth-connector';
import type { ZohoOauthConfig, TokenData } from 'oauth-connector';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({ region: 'us-east-1' });
const bucketName = 'my-token-bucket';

const persistenceConfig = new RemoteStorageStrategy({
  onUpload: async (tokenData: TokenData) => {
    await s3Client.send(new PutObjectCommand({
      Bucket: bucketName,
      Key: 'tokens.json',
      Body: JSON.stringify(tokenData),
    }));
  },
  onDownload: async (): Promise<TokenData | null> => {
    const response = await s3Client.send(new GetObjectCommand({
      Bucket: bucketName,
      Key: 'tokens.json',
    }));
    const data = await response.Body.transformToString();
    return JSON.parse(data);
  },
  encryptionKey: 'your-encryption-key',
});

// Zoho OAuth config
const oauthConfig: ZohoOauthConfig = {
  clientId: 'your-client-id',
  clientSecret: 'your-client-secret',
  accountsDomain: 'accounts.zoho.com',
  refreshToken: 'initial-refresh-token',
};

const serviceConfig = new ZohoOAuth(oauthConfig);
const connector = new Connector(serviceConfig, persistenceConfig, {
  backgroundSyncInterval: 30, // Check every 30 minutes
});
```

### In-Memory Only (Multiple Instances)

```typescript
import { Connector, OAuth } from 'oauth-connector';
import type { ConnectorConfig } from 'oauth-connector';

// Generic OAuth config (for Google or other providers)
const oauthConfig: ConnectorConfig = {
  clientId: 'your-client-id',
  clientSecret: 'your-client-secret',
  authUrl: 'https://oauth.example.com/authorize',
  refreshUrl: 'https://oauth.example.com/token',
  refreshToken: 'initial-refresh-token' // Required when no storage strategy
};

const serviceConfig = new OAuth(oauthConfig);

// Each connector instance has its own in-memory cache
const connector1 = new Connector(serviceConfig, undefined, {
  instanceId: 'connector-1',
});

const connector2 = new Connector(serviceConfig, undefined, {
  instanceId: 'connector-2',
});
```

## API Reference

### Connector

Main class that orchestrates OAuth service and persistence strategy.

#### Constructor

```typescript
new Connector(
  oauthService: OAuthService,
  storageStrategy?: StorageStrategy, // Optional - if not provided, uses in-memory cache only
  options?: ConnectorOptions
)
```

#### Options

```typescript
interface ConnectorOptions {
  instanceId?: string;              // Unique ID for multi-instance support
  backgroundSyncInterval?: number;  // Minutes between background syncs (if provided, sync is enabled)
  graceExpiryTimeInSecs?: number;   // Seconds - refresh token when expiresAt - graceExpiryTimeInSecs is reached (default: 0)
  debug?: boolean;                  // Enable debug logging
}
```

#### Methods

- `getAccessToken(): Promise<string>` - Get access token (auto-refreshes if expired). Uses in-memory cache for fast access.
- `refreshToken(): Promise<TokenData>` - Manually refresh token
- `getTokenData(): Promise<TokenData | null>` - Get current token data (from cache)
- `exchangeCodeForTokens(code: string, redirectUri: string): Promise<TokenData>` - Exchange authorization code for tokens
- `deleteToken(): Promise<void>` - Delete stored token (clears cache and storage)
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

### Storage Strategies

#### LocalStorageStrategy

Persists tokens to a local file.

```typescript
new LocalStorageStrategy({
  filePath: './tokens.json',
  encryptionKey?: string,
})
```

#### RemoteStorageStrategy

Persists tokens using custom upload/download callbacks.

```typescript
new RemoteStorageStrategy({
  onUpload: (tokenData: TokenData) => Promise<void>,
  onDownload: () => Promise<TokenData | null>,
  encryptionKey?: string,
})
```

**Note:** If no storage strategy is provided, the connector uses in-memory caching only. Tokens are cached for performance but not persisted across restarts.

### OAuth Services

#### ZohoOAuth

Zoho-specific OAuth implementation. URLs are built automatically from `accountsDomain`.

```typescript
new ZohoOAuth({
  clientId: string,
  clientSecret: string,
  accountsDomain: string, // e.g., "accounts.zoho.com", "accounts.zoho.eu", "accounts.zoho.in"
  refreshToken?: string,
})
```

#### GoogleOAuth

Google-specific OAuth implementation.

```typescript
new GoogleOAuth({
  clientId: string,
  clientSecret: string,
  authUrl: string,
  refreshUrl: string,
  refreshToken?: string,
})
```

#### OAuth

Generic OAuth implementation.

```typescript
new OAuth({
  clientId: string,
  clientSecret: string,
  authUrl: string,
  refreshUrl: string,
  refreshToken?: string,
})
```


## Examples

See the `examples/` directory for complete examples:

- `in-memory-only.ts` - Using connector without storage strategy (in-memory cache only)
- `local-strategy.ts` - Local file persistence
- `remote-strategy.ts` - Remote storage (S3)
- `global-strategy.ts` - Multiple instances without storage (each with own cache)
- `zoho-example.ts` - Complete Zoho OAuth flow

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

## Requirements

- Node.js >= 14.0.0 (uses native `https`/`http` modules, no external dependencies)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

