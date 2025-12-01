import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  query, 
  where, 
  orderBy,
  limit,
  startAfter,
  DocumentSnapshot
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { UserRole } from '@/types/roles';
import { UserProfile } from '@/types/auth';
import { logAuditEvent } from '@/lib/audit-logger';

export interface UserRoleUpdate {
  userId: string;
  newRole: UserRole;
  updatedBy: string;
  reason?: string;
}

export interface UserListQuery {
  role?: UserRole;
  searchTerm?: string;
  limit?: number;
  startAfter?: DocumentSnapshot;
}

export interface UserListResult {
  users: UserProfile[];
  hasMore: boolean;
  lastDoc?: DocumentSnapshot;
}

// Get user profile by ID
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  if (!db) {
    console.warn('Firestore not initialized');
    return null;
  }

  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    
    if (!userDoc.exists()) {
      return null;
    }

    const userData = userDoc.data();
    return {
      uid: userDoc.id,
      email: userData.email,
      displayName: userData.displayName,
      photoURL: userData.photoURL,
      role: userData.role,
      permissions: userData.permissions || [],
      createdAt: userData.createdAt?.toDate() || new Date(),
      updatedAt: userData.updatedAt?.toDate() || new Date(),
      lastLoginAt: userData.lastLoginAt?.toDate(),
    };
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
}

// Update user role
export async function updateUserRole(
  update: UserRoleUpdate
): Promise<boolean> {
  if (!db) {
    console.warn('Firestore not initialized');
    return false;
  }

  try {
    const userDocRef = doc(db, 'users', update.userId);
    
    // Check if user exists
    const userDoc = await getDoc(userDocRef);
    if (!userDoc.exists()) {
      throw new Error('User not found');
    }

    const oldRole = userDoc.data().role;
    
    // Update the user's role
    await updateDoc(userDocRef, {
      role: update.newRole,
      updatedAt: new Date(),
    });

    // Log the role change
    await logAuditEvent({
      action: 'ROLE_CHANGED',
      userId: update.updatedBy,
      targetUserId: update.userId,
      details: {
        oldRole,
        newRole: update.newRole,
        reason: update.reason,
        changedBy: update.updatedBy,
      },
      timestamp: new Date(),
    });

    return true;
  } catch (error) {
    console.error('Error updating user role:', error);
    
    // Log the failed attempt
    await logAuditEvent({
      action: 'ROLE_CHANGE_FAILED',
      userId: update.updatedBy,
      targetUserId: update.userId,
      details: {
        newRole: update.newRole,
        reason: update.reason,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      timestamp: new Date(),
    });
    
    return false;
  }
}

// Get users with pagination and filtering
export async function getUsers(queryParams: UserListQuery = {}): Promise<UserListResult> {
  if (!db) {
    console.warn('Firestore not initialized');
    return { users: [], hasMore: false };
  }

  try {
    let q = query(collection(db, 'users'));

    // Filter by role if specified
    if (queryParams.role) {
      q = query(q, where('role', '==', queryParams.role));
    }

    // Order by creation date (newest first)
    q = query(q, orderBy('createdAt', 'desc'));

    // Apply pagination
    if (queryParams.startAfter) {
      q = query(q, startAfter(queryParams.startAfter));
    }

    // Apply limit (default to 20)
    const limitCount = queryParams.limit || 20;
    q = query(q, limit(limitCount + 1)); // Get one extra to check if there are more

    const querySnapshot = await getDocs(q);
    const docs = querySnapshot.docs;
    
    // Check if there are more results
    const hasMore = docs.length > limitCount;
    const users = docs.slice(0, limitCount);
    const lastDoc = users.length > 0 ? users[users.length - 1] : undefined;

    const userProfiles: UserProfile[] = users.map(doc => {
      const data = doc.data();
      return {
        uid: doc.id,
        email: data.email,
        displayName: data.displayName,
        photoURL: data.photoURL,
        role: data.role,
        permissions: data.permissions || [],
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        lastLoginAt: data.lastLoginAt?.toDate(),
      };
    });

    // Filter by search term if specified (client-side filtering for simplicity)
    let filteredUsers = userProfiles;
    if (queryParams.searchTerm) {
      const searchLower = queryParams.searchTerm.toLowerCase();
      filteredUsers = userProfiles.filter(user => 
        user.displayName.toLowerCase().includes(searchLower) ||
        user.email.toLowerCase().includes(searchLower)
      );
    }

    return {
      users: filteredUsers,
      hasMore,
      lastDoc,
    };
  } catch (error) {
    console.error('Error fetching users:', error);
    return { users: [], hasMore: false };
  }
}

// Get users by role
export async function getUsersByRole(role: UserRole): Promise<UserProfile[]> {
  const result = await getUsers({ role });
  return result.users;
}

// Search users by name or email
export async function searchUsers(searchTerm: string, limitCount: number = 10): Promise<UserProfile[]> {
  const result = await getUsers({ searchTerm, limit: limitCount });
  return result.users;
}

// Get role statistics
export async function getRoleStatistics(): Promise<Record<UserRole, number>> {
  if (!db) {
    console.warn('Firestore not initialized');
    return {
      [UserRole.FIELD]: 0,
      [UserRole.PURCHASING]: 0,
      [UserRole.WAREHOUSE]: 0,
      [UserRole.ACCOUNTING]: 0,
      [UserRole.ADMIN]: 0,
    };
  }

  try {
    const stats: Record<UserRole, number> = {
      [UserRole.FIELD]: 0,
      [UserRole.PURCHASING]: 0,
      [UserRole.WAREHOUSE]: 0,
      [UserRole.ACCOUNTING]: 0,
      [UserRole.ADMIN]: 0,
    };

    // Get counts for each role
    for (const role of Object.values(UserRole)) {
      const q = query(collection(db, 'users'), where('role', '==', role));
      const snapshot = await getDocs(q);
      stats[role] = snapshot.size;
    }

    return stats;
  } catch (error) {
    console.error('Error fetching role statistics:', error);
    return {
      [UserRole.FIELD]: 0,
      [UserRole.PURCHASING]: 0,
      [UserRole.WAREHOUSE]: 0,
      [UserRole.ACCOUNTING]: 0,
      [UserRole.ADMIN]: 0,
    };
  }
}

// Bulk role updates
export async function bulkUpdateRoles(
  updates: UserRoleUpdate[]
): Promise<{ success: number; failed: number; errors: string[] }> {
  const results = {
    success: 0,
    failed: 0,
    errors: [] as string[],
  };

  for (const update of updates) {
    try {
      const success = await updateUserRole(update);
      if (success) {
        results.success++;
      } else {
        results.failed++;
        results.errors.push(`Failed to update role for user ${update.userId}`);
      }
    } catch (error) {
      results.failed++;
      results.errors.push(`Error updating user ${update.userId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Log bulk operation
  await logAuditEvent({
    action: 'BULK_ROLE_UPDATE',
    userId: updates[0]?.updatedBy || 'system',
    details: {
      totalUpdates: updates.length,
      successful: results.success,
      failed: results.failed,
      errors: results.errors,
    },
    timestamp: new Date(),
  });

  return results;
}

// Check if user exists
export async function userExists(userId: string): Promise<boolean> {
  if (!db) {
    return false;
  }

  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    return userDoc.exists();
  } catch (error) {
    console.error('Error checking if user exists:', error);
    return false;
  }
}

// Get users with specific permissions
export async function getUsersWithPermission(permission: string): Promise<UserProfile[]> {
  if (!db) {
    console.warn('Firestore not initialized');
    return [];
  }

  try {
    // Since Firestore doesn't support array-contains queries on computed fields,
    // we'll get all users and filter client-side
    const q = query(collection(db, 'users'));
    const snapshot = await getDocs(q);
    
    const users: UserProfile[] = [];
    
    snapshot.forEach(doc => {
      const data = doc.data();
      const userPermissions = data.permissions || [];
      
      if (userPermissions.includes(permission)) {
        users.push({
          uid: doc.id,
          email: data.email,
          displayName: data.displayName,
          photoURL: data.photoURL,
          role: data.role,
          permissions: userPermissions,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          lastLoginAt: data.lastLoginAt?.toDate(),
        });
      }
    });

    return users;
  } catch (error) {
    console.error('Error fetching users with permission:', error);
    return [];
  }
}
