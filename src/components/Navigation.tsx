'use client';

import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export const Navigation: React.FC = () => {
  const { user, loading, signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Failed to sign out:', error);
    }
  };

  if (loading) {
    return (
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/" className="text-xl font-bold text-gray-900">
                Material Management
              </Link>
            </div>
            <div className="flex items-center">
              <LoadingSpinner size="sm" />
            </div>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="text-xl font-bold text-gray-900">
              Material Management
            </Link>
          </div>
          
          <div className="flex items-center space-x-2 sm:space-x-4">
            {user ? (
              <>
                {/* Desktop Navigation */}
                <div className="hidden sm:flex items-center space-x-4">
                  <Link
                    href="/projects"
                    className="text-sm text-gray-600 hover:text-gray-900"
                  >
                    Projects
                  </Link>
                  <Link
                    href="/requisitions"
                    className="text-sm text-gray-600 hover:text-gray-900"
                  >
                    Requisitions
                  </Link>
                </div>

                <div className="flex items-center space-x-2 sm:space-x-3">
                  {user.photoURL && (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || 'User'}
                      className="h-8 w-8 rounded-full"
                    />
                  )}
                  <span className="hidden sm:block text-sm font-medium text-gray-700">
                    {user.displayName || user.email}
                  </span>
                </div>

                {/* Mobile Menu Button */}
                <div className="sm:hidden">
                  <button
                    type="button"
                    className="text-gray-600 hover:text-gray-900"
                    onClick={() => {/* TODO: Implement mobile menu */}}
                  >
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  </button>
                </div>

                {/* Desktop Menu */}
                <div className="hidden sm:flex items-center space-x-4">
                  <Link
                    href="/auth/profile"
                    className="text-sm text-gray-600 hover:text-gray-900"
                  >
                    Profile
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="text-sm text-gray-600 hover:text-gray-900"
                  >
                    Sign Out
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-2 sm:space-x-4">
                <Link
                  href="/auth/login"
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/signup"
                  className="inline-flex items-center px-3 py-2 sm:px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
