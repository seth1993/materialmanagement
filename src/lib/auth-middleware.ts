import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/firebase';
import { getAuth } from 'firebase-admin/auth';
import { initializeApp, getApps, cert } from 'firebase-admin/app';

// Initialize Firebase Admin SDK
if (!getApps().length) {
  try {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
  } catch (error) {
    console.warn('Firebase Admin SDK not initialized:', error);
  }
}

export interface AuthenticatedRequest extends NextRequest {
  user: {
    uid: string;
    email: string | null;
  };
}

export async function withAuth(
  request: NextRequest,
  handler: (req: AuthenticatedRequest) => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    const token = authHeader.split('Bearer ')[1];

    // Verify the token using Firebase Admin SDK
    const adminAuth = getAuth();
    const decodedToken = await adminAuth.verifyIdToken(token);

    // Add user info to the request
    const authenticatedRequest = request as AuthenticatedRequest;
    authenticatedRequest.user = {
      uid: decodedToken.uid,
      email: decodedToken.email || null,
    };

    return await handler(authenticatedRequest);
  } catch (error) {
    console.error('Authentication error:', error);
    return NextResponse.json(
      { error: 'Invalid or expired token' },
      { status: 401 }
    );
  }
}

// Helper function to get user from request in API routes
export async function getUserFromRequest(request: NextRequest): Promise<{ uid: string; email: string | null } | null> {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.split('Bearer ')[1];
    const adminAuth = getAuth();
    const decodedToken = await adminAuth.verifyIdToken(token);

    return {
      uid: decodedToken.uid,
      email: decodedToken.email || null,
    };
  } catch (error) {
    console.error('Error getting user from request:', error);
    return null;
  }
}
