import { NextRequest, NextResponse } from 'next/server';
import { logger } from './logger';
import { PerformanceTracker } from './performance-tracker';
import { 
  handleApiError, 
  getRequestContext, 
  extractUserIdFromRequest,
  processUnhandledError 
} from './error-handler';
import { SuccessResponse, ErrorResponse, ApiResponse } from './types/errors';
import { RequestContext } from './types/logging';

export type ApiHandler<T = any> = (
  request: NextRequest,
  context: RequestContext
) => Promise<T>;

export interface ApiWrapperOptions {
  requireAuth?: boolean;
  logRequest?: boolean;
  logResponse?: boolean;
  trackPerformance?: boolean;
  validateInput?: (request: NextRequest) => Promise<void>;
  transformResponse?: <T>(data: T) => T;
}

/**
 * Creates a success response with consistent structure
 */
export function createSuccessResponse<T>(
  data: T,
  correlationId?: string
): SuccessResponse<T> {
  return {
    data,
    success: true,
    correlationId,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Wraps an API handler with logging, error handling, and performance tracking
 */
export function withApiWrapper<T = any>(
  handler: ApiHandler<T>,
  options: ApiWrapperOptions = {}
) {
  return async (request: NextRequest): Promise<NextResponse<ApiResponse<T>>> => {
    const performanceTracker = new PerformanceTracker();
    let context: RequestContext;

    try {
      // Extract request context
      const baseContext = getRequestContext(request);
      
      // Extract user ID if available
      const userId = await extractUserIdFromRequest(request);
      
      context = {
        ...baseContext,
        userId,
        startTime: Date.now(),
        headers: Object.fromEntries(request.headers.entries()),
      } as RequestContext;

      // Log request start
      if (options.logRequest !== false) {
        logger.logRequest(context);
      }

      // Validate authentication if required
      if (options.requireAuth && !userId) {
        throw new Error('Authentication required');
      }

      // Validate input if validator provided
      if (options.validateInput) {
        await options.validateInput(request);
      }

      // Execute the handler
      const result = await handler(request, context);

      // Transform response if transformer provided
      const transformedResult = options.transformResponse 
        ? options.transformResponse(result)
        : result;

      // Create success response
      const response = createSuccessResponse(transformedResult, context.correlationId);
      
      // Log performance metrics
      if (options.trackPerformance !== false) {
        const metrics = performanceTracker.getMetrics();
        logger.logPerformance(context, metrics);
      }

      // Log response
      if (options.logResponse !== false) {
        const duration = performanceTracker.getDuration();
        logger.logResponse(context, 200, duration);
      }

      return NextResponse.json(response, {
        status: 200,
        headers: {
          'x-correlation-id': context.correlationId,
          'x-request-id': context.requestId,
        },
      });

    } catch (error) {
      // Process and handle the error
      const appError = processUnhandledError(error, context?.correlationId);
      return handleApiError(appError, request);
    }
  };
}

/**
 * Wrapper for GET requests
 */
export function withGetHandler<T = any>(
  handler: ApiHandler<T>,
  options?: Omit<ApiWrapperOptions, 'validateInput'>
) {
  return withApiWrapper(handler, {
    ...options,
    logRequest: options?.logRequest ?? true,
    logResponse: options?.logResponse ?? true,
  });
}

/**
 * Wrapper for POST requests with input validation
 */
export function withPostHandler<T = any>(
  handler: ApiHandler<T>,
  options?: ApiWrapperOptions
) {
  return withApiWrapper(handler, {
    ...options,
    logRequest: options?.logRequest ?? true,
    logResponse: options?.logResponse ?? true,
    validateInput: options?.validateInput || validateJsonBody,
  });
}

/**
 * Wrapper for PUT requests with input validation
 */
export function withPutHandler<T = any>(
  handler: ApiHandler<T>,
  options?: ApiWrapperOptions
) {
  return withApiWrapper(handler, {
    ...options,
    logRequest: options?.logRequest ?? true,
    logResponse: options?.logResponse ?? true,
    validateInput: options?.validateInput || validateJsonBody,
  });
}

/**
 * Wrapper for DELETE requests
 */
export function withDeleteHandler<T = any>(
  handler: ApiHandler<T>,
  options?: Omit<ApiWrapperOptions, 'validateInput'>
) {
  return withApiWrapper(handler, {
    ...options,
    logRequest: options?.logRequest ?? true,
    logResponse: options?.logResponse ?? true,
  });
}

/**
 * Default JSON body validator
 */
async function validateJsonBody(request: NextRequest): Promise<void> {
  const contentType = request.headers.get('content-type');
  
  if (request.method !== 'GET' && request.method !== 'DELETE') {
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error('Content-Type must be application/json');
    }

    try {
      await request.json();
    } catch (error) {
      throw new Error('Invalid JSON body');
    }
  }
}

/**
 * Creates a route handler with all HTTP methods
 */
export function createRouteHandler<T = any>(handlers: {
  GET?: ApiHandler<T>;
  POST?: ApiHandler<T>;
  PUT?: ApiHandler<T>;
  DELETE?: ApiHandler<T>;
  PATCH?: ApiHandler<T>;
}, options?: ApiWrapperOptions) {
  const wrappedHandlers: Record<string, any> = {};

  if (handlers.GET) {
    wrappedHandlers.GET = withGetHandler(handlers.GET, options);
  }

  if (handlers.POST) {
    wrappedHandlers.POST = withPostHandler(handlers.POST, options);
  }

  if (handlers.PUT) {
    wrappedHandlers.PUT = withPutHandler(handlers.PUT, options);
  }

  if (handlers.DELETE) {
    wrappedHandlers.DELETE = withDeleteHandler(handlers.DELETE, options);
  }

  if (handlers.PATCH) {
    wrappedHandlers.PATCH = withPostHandler(handlers.PATCH, options);
  }

  return wrappedHandlers;
}

/**
 * Utility to extract and validate request body
 */
export async function getRequestBody<T = any>(request: NextRequest): Promise<T> {
  try {
    const body = await request.json();
    return body as T;
  } catch (error) {
    throw new Error('Invalid JSON body');
  }
}

/**
 * Utility to extract query parameters
 */
export function getQueryParams(request: NextRequest): Record<string, string> {
  const url = new URL(request.url);
  const params: Record<string, string> = {};
  
  url.searchParams.forEach((value, key) => {
    params[key] = value;
  });
  
  return params;
}

/**
 * Utility to extract path parameters from dynamic routes
 */
export function getPathParams(request: NextRequest, paramNames: string[]): Record<string, string> {
  const url = new URL(request.url);
  const pathSegments = url.pathname.split('/').filter(Boolean);
  const params: Record<string, string> = {};
  
  // This is a simplified implementation
  // In a real app, you'd extract this from Next.js route context
  paramNames.forEach((name, index) => {
    if (pathSegments[index]) {
      params[name] = pathSegments[index];
    }
  });
  
  return params;
}

/**
 * Middleware to add CORS headers
 */
export function withCors(
  handler: (request: NextRequest) => Promise<NextResponse>,
  options: {
    origin?: string | string[];
    methods?: string[];
    headers?: string[];
  } = {}
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const response = await handler(request);
    
    // Add CORS headers
    const origin = Array.isArray(options.origin) 
      ? options.origin.join(', ')
      : options.origin || '*';
    
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Methods', 
      options.methods?.join(', ') || 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 
      options.headers?.join(', ') || 'Content-Type, Authorization, x-correlation-id, x-request-id');
    
    return response;
  };
}
