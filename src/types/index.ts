/**
 * Core type definitions for the Listy application
 *
 * Design decisions:
 * - Lists have two types: 'gift' (hidden claims) and 'potluck' (visible claims)
 * - Users can be anonymous (sessionId) or authenticated (Firebase UID)
 * - Items track who added them and who claimed them for proper permission handling
 */

import { Timestamp } from 'firebase/firestore';

// ============================================
// List Types
// ============================================

export type ListType = 'gift' | 'potluck';

/**
 * A collaborative list that can contain multiple items
 * 
 * The shareCode is a human-friendly code (e.g., "happy-birthday-2024")
 * that users can share to give others access to the list
 */
export interface List {
  id: string;
  title: string;
  description?: string;
  // Optional grouping label to cluster related lists (e.g., family holiday)
  groupName?: string;
  // Unique group code for invite links
  groupCode?: string;
  // Optional event date (for potluck/event lists)
  eventDate?: string;
  // Optional event time (HH:MM in 24h)
  eventTime?: string;
  // Optional event location
  eventLocation?: string;
  type: ListType;
  shareCode: string;
  // Creator identification - can be anonymous session ID or Firebase UID
  creatorId: string;
  creatorName: string;
  // Timestamps for sorting and display
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Form data for creating a new list
 */
export interface CreateListInput {
  title: string;
  description?: string;
  groupName?: string;
  groupCode?: string;
  eventDate?: string;
  eventTime?: string;
  eventLocation?: string;
  type: ListType;
}

// ============================================
// Item Types
// ============================================

/**
 * An item within a list
 * 
 * Items can be added by anyone with access to the list.
 * Only the creator or list owner can edit/delete items.
 * Items cannot be deleted once claimed (except by list owner).
 */
export interface Item {
  id: string;
  listId: string;
  name: string;
  description?: string;
  quantity?: number;
  link?: string;
  // Who added this item
  addedBy: string;
  addedByName: string;
  // Claim information (optional - only set when claimed)
  claimedBy?: string;
  claimedByName?: string;
  claimedAt?: Timestamp;
  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Form data for creating/editing an item
 */
export interface ItemInput {
  name: string;
  description?: string;
  quantity?: number;
  link?: string;
}

// ============================================
// User Types
// ============================================

/**
 * Represents the current user's session
 * 
 * Users can interact with lists either anonymously or authenticated.
 * Anonymous users have a persistent session ID stored in localStorage.
 * When an anonymous user signs in, their data is migrated to their
 * authenticated account.
 */
export interface UserSession {
  // Unique identifier - either anonymous session ID or Firebase UID
  id: string;
  // Display name for attribution
  displayName: string;
  // Email (only for authenticated users)
  email?: string;
  // Photo URL from Google OAuth
  photoURL?: string;
  // Whether the user is authenticated with Firebase Auth
  isAuthenticated: boolean;
  // The anonymous session ID (preserved even after authentication
  // for data migration purposes)
  anonymousId?: string;
}

// ============================================
// UI State Types
// ============================================

/**
 * Loading states for async operations
 */
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

/**
 * Generic async operation state
 */
export interface AsyncState<T> {
  data: T | null;
  status: LoadingState;
  error: string | null;
}

/**
 * Toast notification types
 */
export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  description?: string;
}

// ============================================
// Permission Types
// ============================================

/**
 * Permissions for a user on a specific list
 */
export interface ListPermissions {
  // Can edit list settings (title, description)
  canEditList: boolean;
  // Can delete the list
  canDeleteList: boolean;
  // Can add items to the list
  canAddItems: boolean;
}

/**
 * Permissions for a user on a specific item
 */
export interface ItemPermissions {
  // Can edit the item details
  canEdit: boolean;
  // Can delete the item
  canDelete: boolean;
  // Can claim/unclaim the item
  canClaim: boolean;
  // Can see who claimed the item (depends on list type)
  canSeeClaimant: boolean;
}

// ============================================
// API Response Types
// ============================================

/**
 * Standard API response wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// ============================================
// Component Interface Types
// ============================================

/**
 * Simplified user identity for display and tracking
 * Used in items to track who created/claimed them
 */
export interface UserIdentity {
  id: string;
  displayName: string | null;
}

/**
 * List item with simplified structure for components
 * This is the shape used by UI components
 */
export interface ListItem {
  id: string;
  title: string;
  description?: string;
  category?: string;
  price?: string;
  imageUrl?: string;
  productUrl?: string;
  createdBy: UserIdentity;
  claimedBy?: UserIdentity;
  claimedAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ============================================
// Firebase Helper Types
// ============================================

/**
 * Firestore document with ID
 */
export type WithId<T> = T & { id: string };

/**
 * Convert Firestore Timestamps to Dates for client use
 */
export type WithDates<T> = Omit<T, 'createdAt' | 'updatedAt' | 'claimedAt'> & {
  createdAt: Date;
  updatedAt: Date;
  claimedAt?: Date;
};
