import { User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  isAdmin: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Check if a user has admin privileges
 * This function checks both email-based admin designation and Firestore user profile
 */
export async function checkAdminStatus(user: User): Promise<boolean> {
  if (!db) {
    // Fallback to email-based check when Firebase is not configured
    return isAdminByEmail(user.email || '');
  }

  try {
    // First check email-based admin designation (for initial setup)
    if (isAdminByEmail(user.email || '')) {
      // Ensure user profile exists with admin flag
      await ensureUserProfile(user, true);
      return true;
    }

    // Check user profile in Firestore
    const userProfile = await getUserProfile(user.uid);
    return userProfile?.isAdmin || false;
  } catch (error) {
    console.error('Error checking admin status:', error);
    // Fallback to email-based check
    return isAdminByEmail(user.email || '');
  }
}

/**
 * Check if email indicates admin status (for initial setup)
 */
function isAdminByEmail(email: string): boolean {
  const adminEmails = [
    'admin@example.com',
    'seth@example.com',
    'sethbailey.dev@gmail.com', // Add the actual admin email
  ];
  
  return adminEmails.includes(email.toLowerCase()) || email.toLowerCase().includes('admin');
}

/**
 * Get user profile from Firestore
 */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  if (!db) return null;

  try {
    const userDoc = await getDoc(doc(db, 'userProfiles', uid));
    if (userDoc.exists()) {
      const data = userDoc.data();
      return {
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as UserProfile;
    }
    return null;
  } catch (error) {
    console.error('Error getting user profile:', error);
    return null;
  }
}

/**
 * Create or update user profile
 */
export async function ensureUserProfile(user: User, isAdmin: boolean = false): Promise<UserProfile | null> {
  if (!db) return null;

  try {
    const existingProfile = await getUserProfile(user.uid);
    const now = new Date();
    
    const profile: UserProfile = {
      uid: user.uid,
      email: user.email || '',
      displayName: user.displayName || undefined,
      isAdmin: existingProfile?.isAdmin || isAdmin,
      createdAt: existingProfile?.createdAt || now,
      updatedAt: now,
    };

    await setDoc(doc(db, 'userProfiles', user.uid), {
      ...profile,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    });

    return profile;
  } catch (error) {
    console.error('Error ensuring user profile:', error);
    return null;
  }
}

/**
 * Update user admin status
 */
export async function updateUserAdminStatus(uid: string, isAdmin: boolean): Promise<boolean> {
  if (!db) return false;

  try {
    const existingProfile = await getUserProfile(uid);
    if (!existingProfile) {
      console.error('User profile not found');
      return false;
    }

    const updatedProfile: UserProfile = {
      ...existingProfile,
      isAdmin,
      updatedAt: new Date(),
    };

    await setDoc(doc(db, 'userProfiles', uid), {
      ...updatedProfile,
      createdAt: updatedProfile.createdAt,
      updatedAt: updatedProfile.updatedAt,
    });

    return true;
  } catch (error) {
    console.error('Error updating user admin status:', error);
    return false;
  }
}

/**
 * Get all admin users
 */
export async function getAdminUsers(): Promise<UserProfile[]> {
  if (!db) return [];

  try {
    // Note: This would require a composite index on isAdmin field
    // For now, we'll implement a simple approach
    // In production, you might want to use a more efficient query
    const { collection, query, where, getDocs } = await import('firebase/firestore');
    
    const q = query(
      collection(db, 'userProfiles'),
      where('isAdmin', '==', true)
    );
    
    const querySnapshot = await getDocs(q);
    const adminUsers: UserProfile[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      adminUsers.push({
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as UserProfile);
    });
    
    return adminUsers;
  } catch (error) {
    console.error('Error getting admin users:', error);
    return [];
  }
}
