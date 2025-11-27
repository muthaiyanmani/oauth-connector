import { request, RequestOptions } from 'https';
import { request as httpRequest } from 'http';
import { URL } from 'url';
import { Logger, defaultLogger } from './logger';

/**
 * HTTP request options
 */
export interface HttpClientOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  timeout?: number;
}

/**
 * HTTP response
 */
export interface HttpClientResponse<T = unknown> {
  statusCode: number;
  statusMessage: string;
  headers: Record<string, string | string[] | undefined>;
  data: T;
}

/**
 * HTTP client using native Node.js modules
 * Compatible with Node.js 14+ (no fetch dependency)
 */
export class HttpClient {
  private logger: Logger;

  constructor(logger?: Logger) {
    this.logger = logger || defaultLogger;
  }

  /**
   * Make HTTP/HTTPS request
   */
  async request<T = unknown>(
    url: string,
    options: HttpClientOptions = {}
  ): Promise<HttpClientResponse<T>> {
    return new Promise((resolve, reject) => {
      try {
        const urlObj = new URL(url);
        const isHttps = urlObj.protocol === 'https:';
        const requestModule = isHttps ? request : httpRequest;

        const requestOptions: RequestOptions = {
          hostname: urlObj.hostname,
          port: urlObj.port || (isHttps ? 443 : 80),
          path: urlObj.pathname + urlObj.search,
          method: options.method || 'GET',
          headers: {
            ...options.headers,
          },
        };

        // Add Content-Length if body is provided
        if (options.body) {
          requestOptions.headers = {
            ...requestOptions.headers,
            'Content-Length': Buffer.byteLength(options.body),
          };
        }

        // Set timeout if provided
        if (options.timeout) {
          requestOptions.timeout = options.timeout;
        }

        this.logger.debug(`Making ${requestOptions.method} request to: ${url}`);

        const req = requestModule(requestOptions, (res) => {
          let data = '';

          res.on('data', (chunk) => {
            data += chunk;
          });

          res.on('end', () => {
            try {
              const response: HttpClientResponse<T> = {
                statusCode: res.statusCode || 500,
                statusMessage: res.statusMessage || 'Unknown',
                headers: res.headers,
                data: this.parseResponse<T>(data, res.headers['content-type']),
              };

              if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                this.logger.debug(`Request successful: ${res.statusCode}`);
                resolve(response);
              } else {
                const error = new Error(
                  `HTTP ${res.statusCode}: ${res.statusMessage || 'Unknown error'} - ${data}`
                );
                this.logger.error(`Request failed: ${error.message}`);
                reject(error);
              }
            } catch (parseError) {
              const error = new Error(
                `Failed to parse response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`
              );
              this.logger.error(`Parse error: ${error.message}`);
              reject(error);
            }
          });
        });

        req.on('error', (error) => {
          this.logger.error(`Request error: ${error.message}`);
          reject(error);
        });

        req.on('timeout', () => {
          req.destroy();
          const error = new Error(`Request timeout after ${options.timeout}ms`);
          this.logger.error(`Request timeout: ${error.message}`);
          reject(error);
        });

        // Write body if provided
        if (options.body) {
          req.write(options.body);
        }

        req.end();
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Unknown error');
        this.logger.error(`Request setup error: ${err.message}`);
        reject(err);
      }
    });
  }

  /**
   * Make POST request
   */
  async post<T = unknown>(
    url: string,
    body?: string,
    headers?: Record<string, string>
  ): Promise<HttpClientResponse<T>> {
    return this.request<T>(url, {
      method: 'POST',
      headers,
      body,
    });
  }

  /**
   * Make GET request
   */
  async get<T = unknown>(
    url: string,
    headers?: Record<string, string>
  ): Promise<HttpClientResponse<T>> {
    return this.request<T>(url, {
      method: 'GET',
      headers,
    });
  }

  /**
   * Parse response data based on content type
   */
  private parseResponse<T>(data: string, contentType?: string | string[]): T {
    if (!data) {
      return {} as T;
    }

    const contentTypeStr = Array.isArray(contentType) ? contentType[0] : contentType;

    if (contentTypeStr && contentTypeStr.includes('application/json')) {
      try {
        return JSON.parse(data) as T;
      } catch (error) {
        this.logger.warn('Failed to parse JSON response, returning raw string');
        return data as unknown as T;
      }
    }

    // Try to parse as JSON if it looks like JSON
    if (data.trim().startsWith('{') || data.trim().startsWith('[')) {
      try {
        return JSON.parse(data) as T;
      } catch {
        // Not valid JSON, return as string
        return data as unknown as T;
      }
    }

    return data as unknown as T;
  }
}

/**
 * Default HTTP client instance
 */
export const defaultHttpClient = new HttpClient();

