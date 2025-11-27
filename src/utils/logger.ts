/**
 * Log levels
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

/**
 * Simple logger with levels
 */
export class Logger {
  private level: LogLevel;
  private prefix: string;

  constructor(level: LogLevel = LogLevel.INFO, prefix: string = '') {
    this.level = level;
    this.prefix = prefix;
  }

  /**
   * Set log level
   */
  setLevel(level: LogLevel): void {
    this.level = level;
  }

  /**
   * Set prefix for log messages
   */
  setPrefix(prefix: string): void {
    this.prefix = prefix;
  }

  /**
   * Debug log
   */
  debug(message: string, ...args: unknown[]): void {
    if (this.level <= LogLevel.DEBUG) {
      console.debug(`[DEBUG]${this.prefix ? ` [${this.prefix}]` : ''} ${message}`, ...args);
    }
  }

  /**
   * Info log
   */
  info(message: string, ...args: unknown[]): void {
    if (this.level <= LogLevel.INFO) {
      console.info(`[INFO]${this.prefix ? ` [${this.prefix}]` : ''} ${message}`, ...args);
    }
  }

  /**
   * Warn log
   */
  warn(message: string, ...args: unknown[]): void {
    if (this.level <= LogLevel.WARN) {
      console.warn(`[WARN]${this.prefix ? ` [${this.prefix}]` : ''} ${message}`, ...args);
    }
  }

  /**
   * Error log
   */
  error(message: string, ...args: unknown[]): void {
    if (this.level <= LogLevel.ERROR) {
      console.error(`[ERROR]${this.prefix ? ` [${this.prefix}]` : ''} ${message}`, ...args);
    }
  }
}

/**
 * Default logger instance
 */
export const defaultLogger = new Logger();

