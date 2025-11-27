# OAuth Connector SDK

A robust Node.js SDK for OAuth token management with multiple persistence strategies, encryption support, and background token synchronization.

## Features

- 🔐 **Multiple Persistence Strategies**: Local file, remote storage (S3, etc.), or in-memory
- 🔒 **Encryption Support**: AES-256-GCM encryption for token storage
- 🔄 **Automatic Token Refresh**: Smart token refresh before expiry
- ⚙️ **Multiple OAuth Providers**: Zoho, Google, and generic OAuth support
- 🔁 **Background Sync**: Automatic token refresh in the background
- 📦 **Multiple Instances**: Support for multiple connector instances
- 🐛 **Debug Logging**: Configurable logging with levels
- 📝 **TypeScript**: Full TypeScript support with type definitions
- 📦 **Dual Module Support**: CommonJS and ESM exports

## Installation

```bash
npm install oauth-connector
```

## Quick Start

### Local File Strategy with Zoho

```typescript
import { Connector, LocalAuthStrategy, ZohoOAuth } from 'oauth-connector';
import type { ZohoOauthConfig } from 'oauth-connector';

const persistenceConfig = new LocalAuthStrategy({
  filePath: './tokens.json',
  encryptionKey: 'your-encryption-key',
});

// Zoho OAuth config - URLs are built automatically from accountsDomain
const oauthConfig: ZohoOauthConfig = {
  clientId: 'your-client-id',
  clientSecret: 'your-client-secret',
  accountsDomain: 'accounts.zoho.com', // or 'accounts.zoho.eu', 'accounts.zoho.in', etc.
  refreshToken: 'initial-refresh-token', // Optional
};

const serviceConfig = new ZohoOAuth(oauthConfig);
const connector = new Connector(serviceConfig, persistenceConfig, {
  debug: true,
  backgroundSync: true,
});

// Get access token (auto-refreshes if expired)
const token = await connector.getAccessToken();
```

### Remote Strategy (S3)

```typescript
import { Connector, RemoteAuthStrategy, ZohoOAuth } from 'oauth-connector';
import type { ZohoOauthConfig, TokenData } from 'oauth-connector';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({ region: 'us-east-1' });
const bucketName = 'my-token-bucket';

const persistenceConfig = new RemoteAuthStrategy({
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
  backgroundSync: true,
  refreshTime: 30,
});
```

### Global Variable Strategy

```typescript
import { Connector, GlobalAuthStrategy, OAuth } from 'oauth-connector';
import type { ConnectorConfig } from 'oauth-connector';

const persistenceConfig = new GlobalAuthStrategy({
  encryptionKey: 'your-encryption-key',
});

// Generic OAuth config (for Google or other providers)
const oauthConfig: ConnectorConfig = {
  clientId: 'your-client-id',
  clientSecret: 'your-client-secret',
  authUrl: 'https://oauth.example.com/authorize',
  refreshUrl: 'https://oauth.example.com/token',
  refreshToken: 'initial-refresh-token',
  refreshIn: 30,
};

const serviceConfig = new OAuth(oauthConfig);
const connector = new Connector(serviceConfig, persistenceConfig);
```

## API Reference

### Connector

Main class that orchestrates OAuth service and persistence strategy.

#### Constructor

```typescript
new Connector(
  oauthService: OAuthService,
  authStrategy: AuthStrategy,
  options?: ConnectorOptions
)
```

#### Options

```typescript
interface ConnectorOptions {
  instanceId?: string;        // Unique ID for multi-instance support
  backgroundSync?: boolean;    // Enable background token sync
  refreshTime?: number;        // Minutes between background syncs
  debug?: boolean;             // Enable debug logging
}
```

#### Methods

- `getAccessToken(): Promise<string>` - Get access token (auto-refreshes if expired)
- `refreshToken(): Promise<TokenData>` - Manually refresh token
- `getTokenData(): Promise<TokenData | null>` - Get current token data
- `getAuthorizationUrl(redirectUri: string, scopes?: string[]): string` - Get OAuth authorization URL
- `exchangeCodeForTokens(code: string, redirectUri: string): Promise<TokenData>` - Exchange authorization code for tokens
- `deleteToken(): Promise<void>` - Delete stored token
- `startBackgroundSync(): void` - Start background token sync
- `stopBackgroundSync(): void` - Stop background token sync
- `destroy(): void` - Cleanup resources

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

### Auth Strategies

#### LocalAuthStrategy

Persists tokens to a local file.

```typescript
new LocalAuthStrategy({
  filePath: './tokens.json',
  encryptionKey?: string,
})
```

#### RemoteAuthStrategy

Persists tokens using custom upload/download callbacks.

```typescript
new RemoteAuthStrategy({
  onUpload: (tokenData: TokenData) => Promise<void>,
  onDownload: () => Promise<TokenData | null>,
  encryptionKey?: string,
})
```

#### GlobalAuthStrategy

Persists tokens in memory (global variable).

```typescript
new GlobalAuthStrategy({
  encryptionKey?: string,
})
```

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

**Note**: The `accountsDomain` is used to automatically build:
- Authorization URL: `https://${accountsDomain}/oauth/v2/auth`
- Token URL: `https://${accountsDomain}/oauth/v2/token`

#### GoogleOAuth

Google-specific OAuth implementation.

```typescript
new GoogleOAuth({
  clientId: string,
  clientSecret: string,
  authUrl: string,
  refreshUrl: string,
  refreshToken?: string,
  refreshIn?: number,
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
  refreshIn?: number,
})
```

## Configuration

### ZohoOauthConfig

Zoho-specific OAuth configuration.

```typescript
interface ZohoOauthConfig {
  clientId: string;        // OAuth Client ID
  clientSecret: string;     // OAuth Client Secret
  accountsDomain: string;   // e.g., "accounts.zoho.com", "accounts.zoho.eu", "accounts.zoho.in"
  refreshToken?: string;    // Initial refresh token (optional)
}
```

**Note**: URLs are built automatically from `accountsDomain`:
- Authorization URL: `https://${accountsDomain}/oauth/v2/auth`
- Token URL: `https://${accountsDomain}/oauth/v2/token`

### ConnectorConfig

Generic OAuth configuration (for Google and other providers).

```typescript
interface ConnectorConfig {
  clientId: string;        // OAuth Client ID
  clientSecret: string;    // OAuth Client Secret
  authUrl: string;         // OAuth authorization URL
  refreshUrl: string;       // Token refresh URL
  refreshToken?: string;   // Initial refresh token (optional)
  refreshIn?: number;      // Minutes before expiry to refresh (default: 30)
}
```

### TokenData

```typescript
interface TokenData {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;       // Timestamp in milliseconds
  tokenType?: string;
  scope?: string;
}
```

## Examples

See the `examples/` directory for complete examples:

- `local-strategy.ts` - Local file persistence
- `remote-strategy.ts` - Remote storage (S3)
- `global-strategy.ts` - In-memory persistence
- `zoho-example.ts` - Complete Zoho OAuth flow

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

MIT

