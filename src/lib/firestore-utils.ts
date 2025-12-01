import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  startAfter, 
  getDocs, 
  DocumentSnapshot,
  QueryConstraint 
} from 'firebase/firestore';
import { db } from './firebase';

/**
 * Utility functions for organization-scoped Firestore queries
 */

export interface PaginationOptions {
  limit?: number;
  startAfter?: DocumentSnapshot;
}

export interface QueryOptions extends PaginationOptions {
  orderByField?: string;
  orderDirection?: 'asc' | 'desc';
  filters?: Record<string, any>;
}

/**
 * Create an organization-scoped query
 */
export function createOrgScopedQuery(
  collectionName: string,
  organizationId: string,
  options: QueryOptions = {}
) {
  if (!db) throw new Error('Firestore not initialized');

  const constraints: QueryConstraint[] = [
    where('organizationId', '==', organizationId)
  ];

  // Add additional filters
  if (options.filters) {
    Object.entries(options.filters).forEach(([field, value]) => {
      if (value !== undefined && value !== null) {
        constraints.push(where(field, '==', value));
      }
    });
  }

  // Add ordering
  if (options.orderByField) {
    constraints.push(orderBy(options.orderByField, options.orderDirection || 'asc'));
  }

  // Add pagination
  if (options.startAfter) {
    constraints.push(startAfter(options.startAfter));
  }

  if (options.limit) {
    constraints.push(limit(options.limit));
  }

  return query(collection(db, collectionName), ...constraints);
}

/**
 * Get organization-scoped documents with pagination
 */
export async function getOrgScopedDocuments<T>(
  collectionName: string,
  organizationId: string,
  options: QueryOptions = {}
): Promise<{
  documents: T[];
  lastDoc?: DocumentSnapshot;
  hasMore: boolean;
}> {
  const q = createOrgScopedQuery(collectionName, organizationId, options);
  const snapshot = await getDocs(q);
  
  const documents = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as T[];

  const lastDoc = snapshot.docs[snapshot.docs.length - 1];
  const hasMore = snapshot.docs.length === (options.limit || 25);

  return {
    documents,
    lastDoc,
    hasMore
  };
}

/**
 * Validate that a user has access to an organization
 */
export async function validateUserOrgAccess(
  userId: string, 
  organizationId: string
): Promise<boolean> {
  if (!db) throw new Error('Firestore not initialized');

  const membersQuery = query(
    collection(db, 'organization_members'),
    where('userId', '==', userId),
    where('organizationId', '==', organizationId),
    where('isActive', '==', true)
  );

  const snapshot = await getDocs(membersQuery);
  return !snapshot.empty;
}

/**
 * Get user's role in organization
 */
export async function getUserOrgRole(
  userId: string, 
  organizationId: string
): Promise<string | null> {
  if (!db) throw new Error('Firestore not initialized');

  const membersQuery = query(
    collection(db, 'organization_members'),
    where('userId', '==', userId),
    where('organizationId', '==', organizationId),
    where('isActive', '==', true)
  );

  const snapshot = await getDocs(membersQuery);
  if (snapshot.empty) {
    return null;
  }

  return snapshot.docs[0].data().role;
}

/**
 * Check if user has required permission level
 */
export function hasPermission(userRole: string, requiredRole: string): boolean {
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
 * Create a document path that includes organization scoping
 */
export function createOrgScopedPath(
  organizationId: string, 
  collection: string, 
  documentId?: string
): string {
  const basePath = `organizations/${organizationId}/${collection}`;
  return documentId ? `${basePath}/${documentId}` : basePath;
}

/**
 * Sanitize and validate organization ID
 */
export function validateOrganizationId(organizationId: string): boolean {
  if (!organizationId || typeof organizationId !== 'string') {
    return false;
  }

  // Basic validation - alphanumeric and hyphens only
  const validPattern = /^[a-zA-Z0-9-_]+$/;
  return validPattern.test(organizationId) && organizationId.length > 0;
}
