/**
 * Error handling utilities for the application
 */

export interface AppError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
}

export class AuditError extends Error {
  public code: string;
  public details?: any;
  public timestamp: Date;

  constructor(code: string, message: string, details?: any) {
    super(message);
    this.name = 'AuditError';
    this.code = code;
    this.details = details;
    this.timestamp = new Date();
  }
}

/**
 * Log errors to console and potentially external services
 */
export function logError(error: Error | AuditError, context?: string): void {
  const errorInfo = {
    name: error.name,
    message: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString(),
    ...(error instanceof AuditError && {
      code: error.code,
      details: error.details,
    }),
  };

  console.error('Application Error:', errorInfo);

  // In production, you might want to send this to an external logging service
  // Example: Sentry, LogRocket, or custom logging endpoint
  if (process.env.NODE_ENV === 'production') {
    // sendToLoggingService(errorInfo);
  }
}

/**
 * Handle audit logging errors gracefully
 */
export function handleAuditError(error: Error, operation: string): void {
  const auditError = new AuditError(
    'AUDIT_LOG_FAILED',
    `Failed to log audit event for ${operation}`,
    { originalError: error.message, operation }
  );

  logError(auditError, 'Audit System');

  // Don't throw the error to avoid breaking the main application flow
  // Audit logging should be transparent to the user experience
}

/**
 * Retry mechanism for critical operations
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxRetries) {
        throw lastError;
      }

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
  }

  throw lastError!;
}

/**
 * Safe async operation wrapper
 */
export async function safeAsync<T>(
  operation: () => Promise<T>,
  fallback?: T,
  errorHandler?: (error: Error) => void
): Promise<T | undefined> {
  try {
    return await operation();
  } catch (error) {
    const err = error as Error;
    
    if (errorHandler) {
      errorHandler(err);
    } else {
      logError(err, 'Safe Async Operation');
    }

    return fallback;
  }
}

/**
 * Validate required environment variables
 */
export function validateEnvironment(): void {
  const requiredVars = [
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  ];

  const missing = requiredVars.filter(varName => !process.env[varName]);

  if (missing.length > 0) {
    const error = new Error(
      `Missing required environment variables: ${missing.join(', ')}`
    );
    logError(error, 'Environment Validation');
  }
}

/**
 * Format error messages for user display
 */
export function formatUserError(error: Error): string {
  // Don't expose internal error details to users
  if (error instanceof AuditError) {
    return 'A system error occurred. Please try again.';
  }

  // Firebase auth errors
  if (error.message.includes('auth/')) {
    return getFirebaseAuthErrorMessage(error.message);
  }

  // Generic fallback
  return 'An unexpected error occurred. Please try again.';
}

/**
 * Get user-friendly Firebase auth error messages
 */
function getFirebaseAuthErrorMessage(errorCode: string): string {
  switch (errorCode) {
    case 'auth/user-not-found':
      return 'No account found with this email address.';
    case 'auth/wrong-password':
      return 'Incorrect password. Please try again.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters long.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/user-disabled':
      return 'This account has been disabled.';
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please try again later.';
    default:
      return 'Authentication error. Please try again.';
  }
}
