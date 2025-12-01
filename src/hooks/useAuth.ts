'use client';

import { useState, useEffect } from 'react';
import { User, onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { checkAdminStatus, ensureUserProfile } from '@/lib/admin';

interface AuthState {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    loading: true,
    isAdmin: false,
  });

  useEffect(() => {
    if (!auth) {
      // Firebase not configured, set loading to false
      setAuthState({ user: null, loading: false, isAdmin: false });
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Ensure user profile exists and check admin status
        await ensureUserProfile(user);
        const isAdmin = await checkAdminStatus(user);
        setAuthState({ user, loading: false, isAdmin });
      } else {
        setAuthState({ user: null, loading: false, isAdmin: false });
      }
    });

    return () => unsubscribe();
  }, []);

  const signOut = async () => {
    if (!auth) return;
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return {
    user: authState.user,
    loading: authState.loading,
    isAdmin: authState.isAdmin,
    signOut,
  };
}
