import * as Sentry from '@sentry/nextjs';
import { logger } from './logger';
import { AppError, isAppError } from './types/errors';
import { RequestContext } from './types/logging';

/**
 * Initialize Sentry with configuration
 */
export function initializeSentry(): void {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) {
    logger.warn('Sentry DSN not configured, error tracking disabled');
    return;
  }

  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    debug: process.env.NODE_ENV === 'development',
    
    // Configure error filtering
    beforeSend(event, hint) {
      const error = hint.originalException;
      
      // Don't send operational errors to Sentry unless they're severe
      if (isAppError(error) && error.isOperational && error.statusCode < 500) {
        return null;
      }
      
      // Add correlation ID to event tags
      if (event.tags) {
        const correlationId = isAppError(error) ? error.correlationId : undefined;
        if (correlationId) {
          event.tags.correlationId = correlationId;
        }
      }
      
      return event;
    },

    // Configure performance monitoring
    integrations: [
      new Sentry.BrowserTracing({
        // Set sampling rate for performance monitoring
        tracePropagationTargets: ['localhost', /^https:\/\/yourapi\.domain\.com\/api/],
      }),
    ],
  });

  logger.info('Sentry initialized for error tracking');
}

/**
 * Capture an error with Sentry
 */
export function captureError(
  error: Error | AppError,
  context?: Partial<RequestContext>,
  additionalData?: Record<string, any>
): string {
  return Sentry.withScope((scope) => {
    // Set user context if available
    if (context?.userId) {
      scope.setUser({ id: context.userId });
    }

    // Set request context
    if (context) {
      scope.setTag('correlationId', context.correlationId);
      scope.setTag('requestId', context.requestId);
      scope.setTag('method', context.method);
      scope.setTag('url', context.url);
      
      if (context.ip) {
        scope.setTag('ip', context.ip);
      }
      
      if (context.userAgent) {
        scope.setTag('userAgent', context.userAgent);
      }
    }

    // Set error-specific context
    if (isAppError(error)) {
      scope.setTag('errorCode', error.code);
      scope.setTag('statusCode', error.statusCode.toString());
      scope.setTag('isOperational', error.isOperational.toString());
      scope.setLevel(error.isOperational ? 'warning' : 'error');
    } else {
      scope.setLevel('error');
    }

    // Add additional data
    if (additionalData) {
      scope.setContext('additional', additionalData);
    }

    // Capture the error
    return Sentry.captureException(error);
  });
}

/**
 * Capture a message with Sentry
 */
export function captureMessage(
  message: string,
  level: Sentry.SeverityLevel = 'info',
  context?: Partial<RequestContext>,
  additionalData?: Record<string, any>
): string {
  return Sentry.withScope((scope) => {
    // Set user context if available
    if (context?.userId) {
      scope.setUser({ id: context.userId });
    }

    // Set request context
    if (context) {
      scope.setTag('correlationId', context.correlationId);
      scope.setTag('requestId', context.requestId);
      scope.setTag('method', context.method);
      scope.setTag('url', context.url);
    }

    // Add additional data
    if (additionalData) {
      scope.setContext('additional', additionalData);
    }

    scope.setLevel(level);
    return Sentry.captureMessage(message);
  });
}

/**
 * Start a new Sentry transaction for performance monitoring
 */
export function startTransaction(
  name: string,
  operation: string,
  context?: Partial<RequestContext>
): Sentry.Transaction {
  const transaction = Sentry.startTransaction({
    name,
    op: operation,
    tags: context ? {
      correlationId: context.correlationId,
      requestId: context.requestId,
      method: context.method,
      url: context.url,
    } : undefined,
  });

  // Set user context if available
  if (context?.userId) {
    Sentry.setUser({ id: context.userId });
  }

  return transaction;
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(
  message: string,
  category: string = 'custom',
  level: Sentry.SeverityLevel = 'info',
  data?: Record<string, any>
): void {
  Sentry.addBreadcrumb({
    message,
    category,
    level,
    data,
    timestamp: Date.now() / 1000,
  });
}

/**
 * Set user context for current scope
 */
export function setUserContext(userId: string, email?: string, username?: string): void {
  Sentry.setUser({
    id: userId,
    email,
    username,
  });
}

/**
 * Clear user context
 */
export function clearUserContext(): void {
  Sentry.setUser(null);
}

/**
 * Set custom tag for current scope
 */
export function setTag(key: string, value: string): void {
  Sentry.setTag(key, value);
}

/**
 * Set custom context for current scope
 */
export function setContext(key: string, context: Record<string, any>): void {
  Sentry.setContext(key, context);
}

/**
 * Flush Sentry events (useful for serverless environments)
 */
export async function flush(timeout: number = 2000): Promise<boolean> {
  return Sentry.flush(timeout);
}

/**
 * Check if Sentry is properly configured
 */
export function isSentryConfigured(): boolean {
  return !!process.env.NEXT_PUBLIC_SENTRY_DSN;
}

/**
 * Enhanced error capture that integrates with our logging system
 */
export function captureErrorWithLogging(
  error: Error | AppError,
  context?: Partial<RequestContext>,
  additionalData?: Record<string, any>
): string | null {
  // Always log the error first
  logger.error('Error captured for external tracking', error, context, additionalData);

  // Only send to Sentry if configured and it's a significant error
  if (!isSentryConfigured()) {
    return null;
  }

  // Don't send operational errors with status codes < 500 to Sentry
  if (isAppError(error) && error.isOperational && error.statusCode < 500) {
    return null;
  }

  return captureError(error, context, additionalData);
}

/**
 * Performance monitoring wrapper for async functions
 */
export async function withPerformanceMonitoring<T>(
  name: string,
  operation: string,
  fn: () => Promise<T>,
  context?: Partial<RequestContext>
): Promise<T> {
  if (!isSentryConfigured()) {
    return fn();
  }

  const transaction = startTransaction(name, operation, context);
  
  try {
    const result = await fn();
    transaction.setStatus('ok');
    return result;
  } catch (error) {
    transaction.setStatus('internal_error');
    captureErrorWithLogging(error as Error, context);
    throw error;
  } finally {
    transaction.finish();
  }
}
