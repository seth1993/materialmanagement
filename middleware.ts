import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getOrCreateCorrelationId, getOrCreateRequestId, CORRELATION_ID_HEADER, REQUEST_ID_HEADER } from './src/lib/correlation';
import { logger } from './src/lib/logger';

export function middleware(request: NextRequest) {
  const startTime = Date.now();
  
  // Generate or extract correlation and request IDs
  const correlationId = getOrCreateCorrelationId(request.headers);
  const requestId = getOrCreateRequestId(request.headers);
  
  // Extract user information from headers or cookies if available
  const userAgent = request.headers.get('user-agent') || undefined;
  const ip = request.ip || request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  
  // Create request context for logging
  const requestContext = {
    correlationId,
    requestId,
    startTime,
    method: request.method,
    url: request.url,
    userAgent,
    ip,
    headers: Object.fromEntries(request.headers.entries()),
  };

  // Log the incoming request
  logger.logRequest(requestContext);

  // Create response with tracking headers
  const response = NextResponse.next();
  
  // Add correlation and request IDs to response headers
  response.headers.set(CORRELATION_ID_HEADER, correlationId);
  response.headers.set(REQUEST_ID_HEADER, requestId);
  
  // Add request context to the request for use in API routes
  // Note: We'll store this in headers since Next.js doesn't allow custom properties on request
  response.headers.set('x-request-context', JSON.stringify({
    correlationId,
    requestId,
    startTime,
    method: request.method,
    url: request.url,
    userAgent,
    ip,
  }));

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
