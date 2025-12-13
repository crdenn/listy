'use client';

/**
 * Authentication Context
 * 
 * Provides authentication state and methods throughout the app.
 * Handles both anonymous sessions and authenticated users.
 * 
 * Key features:
 * - Automatic anonymous session creation
 * - Persistent sessions via localStorage
 * - Data migration when signing in
 * - Real-time auth state updates
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { UserSession } from '@/types';
import {
  onAuthChange,
  signInWithGoogle as firebaseSignInWithGoogle,
  signInWithEmail as firebaseSignInWithEmail,
  registerWithEmail as firebaseRegisterWithEmail,
  signOut as firebaseSignOut,
  setAnonymousDisplayName,
} from '@/lib/firebase/auth';
import { migrateAnonymousData } from '@/lib/firebase/firestore';

interface AuthContextValue {
  // Current user session (always defined after initialization)
  user: UserSession | null;
  // Whether auth is still initializing
  isLoading: boolean;
  // Sign in with Google OAuth
  signIn: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  // Email auth
  signInWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (email: string, password: string, displayName?: string) => Promise<void>;
  // Sign out and return to anonymous session
  signOut: () => Promise<void>;
  // Update the display name (for anonymous users)
  updateDisplayName: (name: string) => void;
  // Error state
  error: string | null;
  // Clear error
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Hook to access authentication context
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: React.ReactNode;
}

/**
 * Authentication Provider Component
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize auth state on mount
  useEffect(() => {
    const unsubscribe = onAuthChange((session) => {
      setUser(session);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const migrateIfNeeded = useCallback(async (previousAnonymousId: string | undefined, newSession: UserSession) => {
    if (previousAnonymousId && newSession.id !== previousAnonymousId) {
      try {
        await migrateAnonymousData(previousAnonymousId, newSession);
      } catch (migrationError) {
        console.error('Data migration error:', migrationError);
        // Don't fail the sign-in if migration fails
      }
    }
  }, []);

  // Sign in with Google
  const signIn = useCallback(async () => {
    setError(null);
    setIsLoading(true);
    
    try {
      // Store the anonymous ID before signing in
      const previousAnonymousId = user?.anonymousId;
      
      const newSession = await firebaseSignInWithGoogle();
      await migrateIfNeeded(previousAnonymousId, newSession);
      setUser(newSession);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to sign in';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [migrateIfNeeded, user?.anonymousId]);

  // Sign in with email/password
  const signInWithEmail = useCallback(async (email: string, password: string) => {
    setError(null);
    setIsLoading(true);

    try {
      const previousAnonymousId = user?.anonymousId;
      const newSession = await firebaseSignInWithEmail(email, password);
      await migrateIfNeeded(previousAnonymousId, newSession);
      setUser(newSession);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to sign in';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [migrateIfNeeded, user?.anonymousId]);

  // Register with email/password
  const registerWithEmail = useCallback(async (email: string, password: string, displayName?: string) => {
    setError(null);
    setIsLoading(true);

    try {
      const previousAnonymousId = user?.anonymousId;
      const newSession = await firebaseRegisterWithEmail(email, password, displayName);
      await migrateIfNeeded(previousAnonymousId, newSession);
      setUser(newSession);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create account';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [migrateIfNeeded, user?.anonymousId]);

  // Sign out
  const signOut = useCallback(async () => {
    setError(null);
    
    try {
      await firebaseSignOut();
      // Auth state change listener will update the user to anonymous
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to sign out';
      setError(message);
    }
  }, []);

  // Update display name for anonymous users
  const updateDisplayName = useCallback((name: string) => {
    if (user && !user.isAuthenticated) {
      setAnonymousDisplayName(name);
      setUser({
        ...user,
        displayName: name,
      });
    }
  }, [user]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value: AuthContextValue = {
    user,
    isLoading,
    signIn,
    signInWithGoogle: signIn,
    signInWithEmail,
    registerWithEmail,
    signOut,
    updateDisplayName,
    error,
    clearError,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
