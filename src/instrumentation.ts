import { initializeSentry } from './lib/sentry';
import { setupGlobalErrorHandlers } from './lib/error-handler';
import { logger } from './lib/logger';

export async function register() {
  // Only run on server side
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Initialize Sentry for error tracking
    initializeSentry();
    
    // Setup global error handlers
    setupGlobalErrorHandlers();
    
    // Log that the system has been initialized
    logger.info('Logging and error tracking system initialized', undefined, {
      environment: process.env.NODE_ENV,
      sentryEnabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
      nodeVersion: process.version,
      platform: process.platform,
    });
  }
}
