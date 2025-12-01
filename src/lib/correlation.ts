import { randomUUID } from 'crypto';

export const CORRELATION_ID_HEADER = 'x-correlation-id';
export const REQUEST_ID_HEADER = 'x-request-id';

/**
 * Generates a unique correlation ID for tracking requests across services
 */
export function generateCorrelationId(): string {
  return randomUUID();
}

/**
 * Generates a unique request ID for tracking individual requests
 */
export function generateRequestId(): string {
  return randomUUID();
}

/**
 * Extracts correlation ID from request headers or generates a new one
 */
export function getOrCreateCorrelationId(headers: Headers): string {
  const existingId = headers.get(CORRELATION_ID_HEADER);
  return existingId || generateCorrelationId();
}

/**
 * Extracts request ID from request headers or generates a new one
 */
export function getOrCreateRequestId(headers: Headers): string {
  const existingId = headers.get(REQUEST_ID_HEADER);
  return existingId || generateRequestId();
}

/**
 * Creates headers with correlation and request IDs
 */
export function createTrackingHeaders(correlationId?: string, requestId?: string): Record<string, string> {
  return {
    [CORRELATION_ID_HEADER]: correlationId || generateCorrelationId(),
    [REQUEST_ID_HEADER]: requestId || generateRequestId(),
  };
}

/**
 * Validates if a string is a valid UUID format
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Sanitizes correlation ID to ensure it's safe for logging
 */
export function sanitizeCorrelationId(id: string): string {
  if (!id || typeof id !== 'string') {
    return generateCorrelationId();
  }
  
  // Remove any potentially dangerous characters
  const sanitized = id.replace(/[^a-zA-Z0-9-]/g, '');
  
  // Validate format and length
  if (sanitized.length < 10 || sanitized.length > 50) {
    return generateCorrelationId();
  }
  
  return sanitized;
}
