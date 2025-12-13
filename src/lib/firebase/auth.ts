/**
 * Firebase Authentication Utilities
 * 
 * Handles Google OAuth, email/password sign-in, and session management.
 * 
 * Design decisions:
 * - Support Google OAuth plus email/password for broader access
 * - Anonymous users get a persistent session ID stored in localStorage
 * - When anonymous users sign in, we can migrate their data to their account
 */

import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
  AuthError,
} from 'firebase/auth';
import { firebaseAuth } from './config';
import { UserSession } from '@/types';
import { createSessionId, storage } from '@/lib/utils';

// Storage key for anonymous session ID
const ANONYMOUS_SESSION_KEY = 'collab_lists_session_id';
const ANONYMOUS_NAME_KEY = 'collab_lists_display_name';

// Google Auth Provider with specific settings
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account', // Always show account selection
});

/**
 * Get or create an anonymous session ID
 * This persists across browser sessions via localStorage
 */
export function getAnonymousSessionId(): string {
  let sessionId = storage.get<string | null>(ANONYMOUS_SESSION_KEY, null);
  
  if (!sessionId) {
    sessionId = createSessionId();
    storage.set(ANONYMOUS_SESSION_KEY, sessionId);
  }
  
  return sessionId;
}

/**
 * Get or set the display name for anonymous users
 */
export function getAnonymousDisplayName(): string {
  return storage.get<string>(ANONYMOUS_NAME_KEY, 'Guest');
}

export function setAnonymousDisplayName(name: string): void {
  storage.set(ANONYMOUS_NAME_KEY, name);
}

/**
 * Create a UserSession object from the current state
 */
export function createUserSession(firebaseUser: User | null): UserSession {
  const anonymousId = getAnonymousSessionId();
  
  if (firebaseUser) {
    // Authenticated user
    return {
      id: firebaseUser.uid,
      displayName: firebaseUser.displayName || firebaseUser.email || 'User',
      email: firebaseUser.email || undefined,
      photoURL: firebaseUser.photoURL || undefined,
      isAuthenticated: true,
      anonymousId, // Keep track of anonymous ID for data migration
    };
  }
  
  // Anonymous user
  return {
    id: anonymousId,
    displayName: getAnonymousDisplayName(),
    isAuthenticated: false,
    anonymousId,
  };
}

/**
 * Sign in with Google
 * Returns the UserSession on success, or throws an error
 */
export async function signInWithGoogle(): Promise<UserSession> {
  try {
    const result = await signInWithPopup(firebaseAuth, googleProvider);
    return createUserSession(result.user);
  } catch (error) {
    const authError = error as AuthError;
    
    // Handle specific error cases
    if (authError.code === 'auth/popup-closed-by-user') {
      throw new Error('Sign-in was cancelled. Please try again.');
    }
    if (authError.code === 'auth/popup-blocked') {
      throw new Error('Pop-up was blocked. Please allow pop-ups and try again.');
    }
    
    console.error('Sign-in error:', authError);
    throw new Error('Failed to sign in. Please try again.');
  }
}

/**
 * Sign in with email and password
 */
export async function signInWithEmail(email: string, password: string): Promise<UserSession> {
  try {
    const result = await signInWithEmailAndPassword(firebaseAuth, email, password);
    return createUserSession(result.user);
  } catch (error) {
    const authError = error as AuthError;

    if (authError.code === 'auth/invalid-credential' || authError.code === 'auth/user-not-found') {
      throw new Error('Invalid email or password.');
    }
    if (authError.code === 'auth/wrong-password') {
      throw new Error('Incorrect password. Please try again.');
    }

    console.error('Email sign-in error:', authError);
    throw new Error('Failed to sign in. Please try again.');
  }
}

/**
 * Register with email and password
 */
export async function registerWithEmail(
  email: string,
  password: string,
  displayName?: string,
): Promise<UserSession> {
  try {
    const result = await createUserWithEmailAndPassword(firebaseAuth, email, password);

    if (displayName) {
      await updateProfile(result.user, { displayName });
    }

    return createUserSession(result.user);
  } catch (error) {
    const authError = error as AuthError;

    if (authError.code === 'auth/email-already-in-use') {
      throw new Error('That email is already in use.');
    }
    if (authError.code === 'auth/weak-password') {
      throw new Error('Password must be at least 6 characters.');
    }

    console.error('Email registration error:', authError);
    throw new Error('Failed to create account. Please try again.');
  }
}

/**
 * Sign out the current user
 */
export async function signOut(): Promise<void> {
  try {
    await firebaseSignOut(firebaseAuth);
  } catch (error) {
    console.error('Sign-out error:', error);
    throw new Error('Failed to sign out. Please try again.');
  }
}

/**
 * Subscribe to authentication state changes
 * Returns an unsubscribe function
 */
export function onAuthChange(callback: (session: UserSession) => void): () => void {
  return onAuthStateChanged(firebaseAuth, (user) => {
    callback(createUserSession(user));
  });
}

/**
 * Get the current authentication state synchronously
 * Note: This may return null briefly on page load before auth is initialized
 */
export function getCurrentUser(): User | null {
  return firebaseAuth.currentUser;
}

/**
 * Check if a user is currently signed in
 */
export function isSignedIn(): boolean {
  return firebaseAuth.currentUser !== null;
}
