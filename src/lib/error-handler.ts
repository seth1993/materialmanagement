import { NextRequest, NextResponse } from 'next/server';
import { logger } from './logger';
import { 
  AppError, 
  ErrorResponse, 
  isAppError, 
  getErrorStatusCode, 
  getErrorCode,
  isOperationalError,
  InternalServerError 
} from './types/errors';
import { RequestContext } from './types/logging';

/**
 * Extracts request context from Next.js request headers
 */
export function getRequestContext(request: NextRequest): Partial<RequestContext> {
  try {
    const contextHeader = request.headers.get('x-request-context');
    if (contextHeader) {
      return JSON.parse(contextHeader);
    }
  } catch (error) {
    logger.warn('Failed to parse request context from headers', undefined, { error: error instanceof Error ? error.message : 'Unknown error' });
  }

  // Fallback to extracting what we can from the request
  return {
    correlationId: request.headers.get('x-correlation-id') || 'unknown',
    requestId: request.headers.get('x-request-id') || 'unknown',
    method: request.method,
    url: request.url,
    userAgent: request.headers.get('user-agent') || undefined,
    ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
  };
}

/**
 * Creates a sanitized error response for clients
 */
export function createErrorResponse(
  error: Error | AppError,
  correlationId?: string
): ErrorResponse {
  const statusCode = getErrorStatusCode(error);
  const errorCode = getErrorCode(error);
  
  // For operational errors, we can show the actual message
  // For non-operational errors, we show a generic message
  const message = isOperationalError(error) 
    ? error.message 
    : 'An internal server error occurred';

  return {
    error: {
      message,
      code: errorCode,
      correlationId,
      timestamp: new Date().toISOString(),
    },
    success: false,
  };
}

/**
 * Logs an error with full context
 */
export function logError(
  error: Error | AppError,
  context: Partial<RequestContext>,
  additionalMetadata?: Record<string, any>
): void {
  const metadata = {
    ...additionalMetadata,
    errorType: error.constructor.name,
    isOperational: isOperationalError(error),
  };

  if (isOperationalError(error)) {
    logger.warn(`Operational error: ${error.message}`, error, context, metadata);
  } else {
    logger.error(`System error: ${error.message}`, error, context, metadata);
  }
}

/**
 * Global error handler for API routes
 */
export function handleApiError(
  error: Error | AppError,
  request: NextRequest
): NextResponse<ErrorResponse> {
  const context = getRequestContext(request);
  
  // Log the error
  logError(error, context);
  
  // Create sanitized response
  const errorResponse = createErrorResponse(error, context.correlationId);
  const statusCode = getErrorStatusCode(error);
  
  return NextResponse.json(errorResponse, { 
    status: statusCode,
    headers: {
      'x-correlation-id': context.correlationId || 'unknown',
      'x-request-id': context.requestId || 'unknown',
    }
  });
}

/**
 * Wraps an async function to catch and handle errors
 */
export function withErrorHandling<T extends any[], R>(
  fn: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error) {
      // If it's already an AppError, re-throw it
      if (isAppError(error)) {
        throw error;
      }
      
      // Convert unknown errors to InternalServerError
      const appError = new InternalServerError(
        error instanceof Error ? error.message : 'Unknown error occurred'
      );
      
      throw appError;
    }
  };
}

/**
 * Process unhandled errors and convert them to appropriate AppErrors
 */
export function processUnhandledError(error: unknown, correlationId?: string): AppError {
  if (isAppError(error)) {
    return error;
  }

  if (error instanceof Error) {
    // Check for specific error types and convert them
    if (error.name === 'ValidationError') {
      return new AppError(error.message, 400, true, 'VALIDATION_ERROR', correlationId);
    }
    
    if (error.name === 'CastError' || error.name === 'MongoError') {
      return new AppError('Database operation failed', 500, false, 'DATABASE_ERROR', correlationId);
    }
    
    if (error.message.includes('timeout')) {
      return new AppError('Request timeout', 408, true, 'TIMEOUT_ERROR', correlationId);
    }
    
    // Default to internal server error for unknown errors
    return new InternalServerError(error.message, correlationId);
  }

  // Handle non-Error objects
  const message = typeof error === 'string' ? error : 'Unknown error occurred';
  return new InternalServerError(message, correlationId);
}

/**
 * Global unhandled error handler for the application
 */
export function setupGlobalErrorHandlers(): void {
  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    const error = processUnhandledError(reason);
    logger.fatal('Unhandled promise rejection', error, undefined, {
      promise: promise.toString(),
      reason: reason instanceof Error ? reason.message : String(reason),
    });
    
    // In production, you might want to exit the process
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    const appError = processUnhandledError(error);
    logger.fatal('Uncaught exception', appError, undefined, {
      originalError: error.message,
      stack: error.stack,
    });
    
    // Always exit on uncaught exceptions
    process.exit(1);
  });

  // Handle graceful shutdown
  process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully');
    // Cleanup resources here
    process.exit(0);
  });

  process.on('SIGINT', () => {
    logger.info('SIGINT received, shutting down gracefully');
    // Cleanup resources here
    process.exit(0);
  });
}

/**
 * Validates that an error is safe to expose to clients
 */
export function isSafeError(error: Error | AppError): boolean {
  return isOperationalError(error) && getErrorStatusCode(error) < 500;
}

/**
 * Extracts user ID from Firebase Auth token in request headers
 */
export async function extractUserIdFromRequest(request: NextRequest): Promise<string | undefined> {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return undefined;
    }

    // In a real implementation, you would verify the Firebase token here
    // For now, we'll just return undefined
    // const token = authHeader.substring(7);
    // const decodedToken = await admin.auth().verifyIdToken(token);
    // return decodedToken.uid;
    
    return undefined;
  } catch (error) {
    logger.warn('Failed to extract user ID from request', error instanceof Error ? error : undefined);
    return undefined;
  }
}
