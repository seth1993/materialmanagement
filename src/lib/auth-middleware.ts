import { NextRequest } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { validateUserOrgAccess, getUserOrgRole } from './firestore-utils';

// Initialize Firebase Admin SDK
if (!getApps().length) {
  const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  };

  if (serviceAccount.projectId && serviceAccount.clientEmail && serviceAccount.privateKey) {
    initializeApp({
      credential: cert(serviceAccount),
      projectId: serviceAccount.projectId,
    });
  }
}

export interface AuthenticatedUser {
  uid: string;
  email: string;
  organizationId: string;
  role: string;
}

export interface AuthMiddlewareResult {
  success: boolean;
  user?: AuthenticatedUser;
  error?: {
    code: string;
    message: string;
    statusCode: number;
  };
}

/**
 * Extract and verify Firebase ID token from request headers
 */
export async function verifyAuthToken(request: NextRequest): Promise<{
  success: boolean;
  user?: { uid: string; email: string };
  error?: { code: string; message: string; statusCode: number };
}> {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Missing or invalid authorization header',
          statusCode: 401
        }
      };
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    if (!getApps().length) {
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Firebase Admin not initialized',
          statusCode: 500
        }
      };
    }

    const auth = getAuth();
    const decodedToken = await auth.verifyIdToken(token);

    return {
      success: true,
      user: {
        uid: decodedToken.uid,
        email: decodedToken.email || ''
      }
    };
  } catch (error: any) {
    console.error('Token verification error:', error);
    
    if (error.code === 'auth/id-token-expired') {
      return {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Token expired',
          statusCode: 401
        }
      };
    }

    if (error.code === 'auth/id-token-revoked') {
      return {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Token revoked',
          statusCode: 401
        }
      };
    }

    return {
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid token',
        statusCode: 401
      }
    };
  }
}

/**
 * Verify user authentication and organization access
 */
export async function authenticateRequest(
  request: NextRequest,
  requiredOrganizationId?: string
): Promise<AuthMiddlewareResult> {
  // Verify the Firebase token
  const tokenResult = await verifyAuthToken(request);
  if (!tokenResult.success || !tokenResult.user) {
    return {
      success: false,
      error: tokenResult.error
    };
  }

  const { uid, email } = tokenResult.user;

  // If organization ID is required, validate access
  if (requiredOrganizationId) {
    try {
      const hasAccess = await validateUserOrgAccess(uid, requiredOrganizationId);
      if (!hasAccess) {
        return {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'User does not have access to this organization',
            statusCode: 403
          }
        };
      }

      const role = await getUserOrgRole(uid, requiredOrganizationId);
      if (!role) {
        return {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'User role not found in organization',
            statusCode: 403
          }
        };
      }

      return {
        success: true,
        user: {
          uid,
          email,
          organizationId: requiredOrganizationId,
          role
        }
      };
    } catch (error) {
      console.error('Organization access validation error:', error);
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to validate organization access',
          statusCode: 500
        }
      };
    }
  }

  // If no organization validation required, return basic user info
  return {
    success: true,
    user: {
      uid,
      email,
      organizationId: '', // Will be set by specific route handlers
      role: ''
    }
  };
}

/**
 * Extract organization ID from request (URL params, query, or body)
 */
export function extractOrganizationId(request: NextRequest, pathname?: string): string | null {
  // Try to get from URL path parameters (e.g., /api/organizations/[orgId]/...)
  if (pathname) {
    const pathParts = pathname.split('/');
    const orgIndex = pathParts.findIndex(part => part === 'organizations');
    if (orgIndex !== -1 && pathParts[orgIndex + 1]) {
      return pathParts[orgIndex + 1];
    }
  }

  // Try to get from query parameters
  const { searchParams } = new URL(request.url);
  const orgIdFromQuery = searchParams.get('organizationId') || searchParams.get('orgId');
  if (orgIdFromQuery) {
    return orgIdFromQuery;
  }

  // For POST/PUT requests, we might need to parse the body
  // This would be handled in the specific route handler

  return null;
}

/**
 * Check if user has required permission level
 */
export function hasRequiredPermission(userRole: string, requiredRole: string): boolean {
  const roleHierarchy = {
    'viewer': 1,
    'member': 2,
    'admin': 3,
    'owner': 4
  };

  const userLevel = roleHierarchy[userRole as keyof typeof roleHierarchy] || 0;
  const requiredLevel = roleHierarchy[requiredRole as keyof typeof roleHierarchy] || 0;

  return userLevel >= requiredLevel;
}

/**
 * Create standardized error responses
 */
export function createErrorResponse(
  code: string,
  message: string,
  statusCode: number,
  details?: any
) {
  return new Response(
    JSON.stringify({
      success: false,
      error: {
        code,
        message,
        details,
        statusCode
      }
    }),
    {
      status: statusCode,
      headers: {
        'Content-Type': 'application/json'
      }
    }
  );
}

/**
 * Create standardized success responses
 */
export function createSuccessResponse(data: any, message?: string) {
  return new Response(
    JSON.stringify({
      success: true,
      data,
      message
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    }
  );
}
