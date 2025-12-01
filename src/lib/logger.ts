import { LogEntry, LogLevel, LoggerConfig, RequestContext, ErrorDetails, PerformanceMetrics } from './types/logging';
import { AppError, isAppError } from './types/errors';

class Logger {
  private config: LoggerConfig;
  private logQueue: LogEntry[] = [];
  private flushTimer?: NodeJS.Timeout;

  constructor(config: LoggerConfig) {
    this.config = config;
    this.setupFlushTimer();
  }

  private setupFlushTimer(): void {
    if (this.config.enableExternal) {
      this.flushTimer = setInterval(() => {
        this.flushLogs();
      }, 5000); // Flush every 5 seconds
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR, LogLevel.FATAL];
    const configLevelIndex = levels.indexOf(this.config.level);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex >= configLevelIndex;
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    context?: Partial<RequestContext>,
    error?: Error | AppError,
    metadata?: Record<string, any>
  ): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      correlationId: context?.correlationId || 'unknown',
      userId: context?.userId,
      requestId: context?.requestId,
      method: context?.method,
      url: context?.url,
      userAgent: context?.userAgent,
      ip: context?.ip,
      metadata,
    };

    if (error) {
      entry.error = this.formatError(error);
    }

    return entry;
  }

  private formatError(error: Error | AppError): ErrorDetails {
    const errorDetails: ErrorDetails = {
      name: error.name,
      message: error.message,
    };

    if (this.config.includeStackTrace && error.stack) {
      errorDetails.stack = error.stack;
    }

    if (isAppError(error)) {
      errorDetails.code = error.code;
      errorDetails.statusCode = error.statusCode;
      errorDetails.isOperational = error.isOperational;
    }

    return errorDetails;
  }

  private outputLog(entry: LogEntry): void {
    if (this.config.enableConsole) {
      this.logToConsole(entry);
    }

    if (this.config.enableExternal) {
      this.queueForExternal(entry);
    }
  }

  private logToConsole(entry: LogEntry): void {
    const output = this.config.format === 'json' 
      ? JSON.stringify(entry, null, 2)
      : this.formatTextOutput(entry);

    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(output);
        break;
      case LogLevel.INFO:
        console.info(output);
        break;
      case LogLevel.WARN:
        console.warn(output);
        break;
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        console.error(output);
        break;
    }
  }

  private formatTextOutput(entry: LogEntry): string {
    const timestamp = entry.timestamp;
    const level = entry.level.toUpperCase().padEnd(5);
    const correlationId = entry.correlationId.substring(0, 8);
    const context = entry.method && entry.url ? `[${entry.method} ${entry.url}]` : '';
    const user = entry.userId ? `[user:${entry.userId}]` : '';
    
    let output = `${timestamp} ${level} [${correlationId}] ${context} ${user} ${entry.message}`;
    
    if (entry.error) {
      output += `\n  Error: ${entry.error.name}: ${entry.error.message}`;
      if (entry.error.stack && this.config.includeStackTrace) {
        output += `\n  Stack: ${entry.error.stack}`;
      }
    }
    
    if (entry.metadata && Object.keys(entry.metadata).length > 0) {
      output += `\n  Metadata: ${JSON.stringify(entry.metadata)}`;
    }
    
    return output;
  }

  private queueForExternal(entry: LogEntry): void {
    this.logQueue.push(entry);
    
    // If queue is getting large, flush immediately
    if (this.logQueue.length >= 100) {
      this.flushLogs();
    }
  }

  private async flushLogs(): Promise<void> {
    if (this.logQueue.length === 0) return;

    const logsToFlush = [...this.logQueue];
    this.logQueue = [];

    try {
      // Here you would send logs to external service
      // For now, we'll just log that we would send them
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Logger] Would flush ${logsToFlush.length} logs to external service`);
      }
    } catch (error) {
      // If external logging fails, put logs back in queue
      this.logQueue.unshift(...logsToFlush);
      console.error('[Logger] Failed to flush logs to external service:', error);
    }
  }

  public debug(message: string, context?: Partial<RequestContext>, metadata?: Record<string, any>): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return;
    const entry = this.createLogEntry(LogLevel.DEBUG, message, context, undefined, metadata);
    this.outputLog(entry);
  }

  public info(message: string, context?: Partial<RequestContext>, metadata?: Record<string, any>): void {
    if (!this.shouldLog(LogLevel.INFO)) return;
    const entry = this.createLogEntry(LogLevel.INFO, message, context, undefined, metadata);
    this.outputLog(entry);
  }

  public warn(message: string, context?: Partial<RequestContext>, metadata?: Record<string, any>): void {
    if (!this.shouldLog(LogLevel.WARN)) return;
    const entry = this.createLogEntry(LogLevel.WARN, message, context, undefined, metadata);
    this.outputLog(entry);
  }

  public error(message: string, error?: Error | AppError, context?: Partial<RequestContext>, metadata?: Record<string, any>): void {
    if (!this.shouldLog(LogLevel.ERROR)) return;
    const entry = this.createLogEntry(LogLevel.ERROR, message, context, error, metadata);
    this.outputLog(entry);
  }

  public fatal(message: string, error?: Error | AppError, context?: Partial<RequestContext>, metadata?: Record<string, any>): void {
    if (!this.shouldLog(LogLevel.FATAL)) return;
    const entry = this.createLogEntry(LogLevel.FATAL, message, context, error, metadata);
    this.outputLog(entry);
  }

  public logRequest(context: RequestContext): void {
    this.info('Request started', context);
  }

  public logResponse(context: RequestContext, statusCode: number, duration: number): void {
    const message = `Request completed - ${statusCode} in ${duration}ms`;
    const metadata = { statusCode, duration };
    
    if (statusCode >= 500) {
      this.error(message, undefined, context, metadata);
    } else if (statusCode >= 400) {
      this.warn(message, context, metadata);
    } else {
      this.info(message, context, metadata);
    }
  }

  public logPerformance(context: RequestContext, metrics: PerformanceMetrics): void {
    this.info('Performance metrics', context, metrics);
  }

  public destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.flushLogs();
  }
}

// Create default logger instance
const defaultConfig: LoggerConfig = {
  level: (process.env.LOG_LEVEL as LogLevel) || LogLevel.INFO,
  enableConsole: true,
  enableFile: false,
  enableExternal: process.env.NODE_ENV === 'production',
  format: 'json',
  includeStackTrace: process.env.NODE_ENV !== 'production',
};

export const logger = new Logger(defaultConfig);

// Export Logger class for custom instances
export { Logger };
export type { LoggerConfig };
