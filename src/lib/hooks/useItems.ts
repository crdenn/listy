'use client';

/**
 * Custom hook for item operations
 * 
 * Provides real-time item data and mutation functions for list items.
 * Handles permissions, loading states, and optimistic updates.
 */

import { useState, useEffect, useCallback } from 'react';
import { ListItem, List, ItemPermissions, UserIdentity } from '@/types';
import {
  getItems,
  addItem,
  updateItem,
  deleteItem,
  claimItem,
  unclaimItem,
  subscribeToItems,
  saveListForUser,
} from '@/lib/firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';

interface UseItemsOptions {
  // Subscribe to real-time updates
  realtime?: boolean;
}

interface UseItemsResult {
  items: ListItem[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  // Mutation functions
  addItem: (input: { title: string; description?: string; category?: string; price?: string; imageUrl?: string; productUrl?: string }) => Promise<ListItem | null>;
  updateItem: (itemId: string, updates: { title?: string; description?: string; category?: string; price?: string; imageUrl?: string; productUrl?: string }) => Promise<boolean>;
  deleteItem: (itemId: string) => Promise<boolean>;
  claimItem: (itemId: string) => Promise<boolean>;
  unclaimItem: (itemId: string) => Promise<boolean>;
  // Permission checker
  getItemPermissions: (item: ListItem) => ItemPermissions;
  // Mutation states
  isAdding: boolean;
  isMutating: boolean;
}

/**
 * Hook to manage items for a list
 */
export function useItems(
  list: List | null,
  options: UseItemsOptions = {}
): UseItemsResult {
  const { realtime = true } = options;
  const { user } = useAuth();
  const [items, setItems] = useState<ListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isMutating, setIsMutating] = useState(false);

  const listId = list?.id;

  // Fetch items
  const fetchItems = useCallback(async () => {
    if (!listId) {
      setItems([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await getItems(listId);
      setItems(data);
    } catch (err) {
      console.error('Error fetching items:', err);
      setError('Failed to load items');
    } finally {
      setIsLoading(false);
    }
  }, [listId]);

  // Set up real-time subscription
  useEffect(() => {
    if (!listId) {
      setItems([]);
      setIsLoading(false);
      return;
    }

    if (realtime) {
      setIsLoading(true);
      const unsubscribe = subscribeToItems(listId, (updatedItems) => {
        setItems(updatedItems);
        setIsLoading(false);
      });

      return () => unsubscribe();
    } else {
      fetchItems();
    }
  }, [listId, realtime, fetchItems]);

  // Save list to user's "shared" references when viewing
  useEffect(() => {
    if (!list || !user?.isAuthenticated) return;
    saveListForUser(user.id, list).catch((err) => {
      console.error('Failed to save list ref', err);
    });
  }, [list, user]);

  // Add item
  const add = useCallback(async (input: { title: string; description?: string; category?: string; price?: string; imageUrl?: string; productUrl?: string }): Promise<ListItem | null> => {
    if (!listId || !user) {
      setError('Cannot add item');
      return null;
    }

    setIsAdding(true);
    setError(null);

    try {
      const userIdentity: UserIdentity = { id: user.id, displayName: user.displayName };
      const item = await addItem(listId, input, userIdentity);
      // Real-time subscription will update the items list
      return item;
    } catch (err) {
      console.error('Error adding item:', err);
      setError('Failed to add item');
      return null;
    } finally {
      setIsAdding(false);
    }
  }, [listId, user]);

  // Update item
  const update = useCallback(async (
    itemId: string,
    updates: { title?: string; description?: string; category?: string; price?: string; imageUrl?: string; productUrl?: string }
  ): Promise<boolean> => {
    if (!listId) {
      setError('Cannot update item');
      return false;
    }

    setIsMutating(true);
    setError(null);

    try {
      await updateItem(listId, itemId, updates);
      return true;
    } catch (err) {
      console.error('Error updating item:', err);
      setError('Failed to update item');
      return false;
    } finally {
      setIsMutating(false);
    }
  }, [listId]);

  // Delete item
  const remove = useCallback(async (itemId: string): Promise<boolean> => {
    if (!listId) {
      setError('Cannot delete item');
      return false;
    }

    setIsMutating(true);
    setError(null);

    try {
      await deleteItem(listId, itemId);
      return true;
    } catch (err) {
      console.error('Error deleting item:', err);
      setError('Failed to delete item');
      return false;
    } finally {
      setIsMutating(false);
    }
  }, [listId]);

  // Claim item
  const claim = useCallback(async (itemId: string): Promise<boolean> => {
    if (!listId || !user || !user.isAuthenticated) {
      setError('Sign in to claim items');
      return false;
    }

    setIsMutating(true);
    setError(null);

    try {
      const userIdentity: UserIdentity = { id: user.id, displayName: user.displayName };
      await claimItem(listId, itemId, userIdentity);
      return true;
    } catch (err) {
      console.error('Error claiming item:', err);
      setError('Failed to claim item');
      return false;
    } finally {
      setIsMutating(false);
    }
  }, [listId, user]);

  // Unclaim item
  const unclaim = useCallback(async (itemId: string): Promise<boolean> => {
    if (!listId || !user || !user.isAuthenticated) {
      setError('Sign in to manage claims');
      return false;
    }

    setIsMutating(true);
    setError(null);

    try {
      await unclaimItem(listId, itemId);
      return true;
    } catch (err) {
      console.error('Error unclaiming item:', err);
      setError('Failed to unclaim item');
      return false;
    } finally {
      setIsMutating(false);
    }
  }, [listId]);

  // Get permissions for an item
  const getItemPermissions = useCallback((item: ListItem): ItemPermissions => {
    if (!list) {
      return {
        canEdit: false,
        canDelete: false,
        canClaim: false,
        canSeeClaimant: false,
      };
    }
    const isAuthenticated = !!user?.isAuthenticated;

    if (!user) {
      return {
        canEdit: false,
        canDelete: false,
        canClaim: false,
        canSeeClaimant: false,
      };
    }

    const isListOwner = !!(list.creatorId === user.id ||
      (user.anonymousId && list.creatorId === user.anonymousId));
    const isItemCreator = !!(item.createdBy.id === user.id ||
      (user.anonymousId && item.createdBy.id === user.anonymousId));
    const isClaimedByMe = !!(item.claimedBy?.id === user.id ||
      (user.anonymousId && item.claimedBy?.id === user.anonymousId));
    const isClaimed = !!item.claimedBy;
    const isGiftList = list.type === 'gift';
    const listOwnerGiftView = isGiftList && isListOwner && !isClaimedByMe;

    return {
      // Can edit if you're the list owner or item creator
      canEdit: isListOwner || isItemCreator,
      // Can delete if you're the list owner, or item creator AND item is unclaimed
      canDelete: isListOwner || (isItemCreator && !isClaimed),
      // Can claim if not already claimed by someone else and you're not the gift recipient
      canClaim: isAuthenticated && (listOwnerGiftView ? false : (!isClaimed || isClaimedByMe)),
      // Claim visibility:
      // - Potluck: visible to everyone
      // - Gift: visible to everyone except the list owner (to keep surprises), claimant always sees themselves
      canSeeClaimant: list.type === 'potluck'
        ? true
        : isClaimedByMe
          ? true
          : !listOwnerGiftView,
    };
  }, [user, list]);

  return {
    items,
    isLoading,
    error,
    refresh: fetchItems,
    addItem: add,
    updateItem: update,
    deleteItem: remove,
    claimItem: claim,
    unclaimItem: unclaim,
    getItemPermissions,
    isAdding,
    isMutating,
  };
}

/**
 * Helper hook to check if user is list owner
 */
export function useIsListOwner(list: List | null): boolean {
  const { user } = useAuth();
  
  if (!user || !list) return false;
  
  return list.creatorId === user.id || 
    (!!user.anonymousId && list.creatorId === user.anonymousId);
}

// ============================================================================
// Individual operation hooks for simpler component usage
// ============================================================================

interface UseAddItemResult {
  addItem: (listId: string, input: { title: string; description?: string; createdBy: { id: string; displayName: string | null } }) => Promise<boolean>;
  isAdding: boolean;
  error: string | null;
}

/**
 * Hook for adding items to a list
 */
export function useAddItem(): UseAddItemResult {
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const add = useCallback(async (
    listId: string, 
    input: { title: string; description?: string; createdBy: { id: string; displayName: string | null } }
  ): Promise<boolean> => {
    setIsAdding(true);
    setError(null);

    try {
      await addItem(listId, input, input.createdBy);
      return true;
    } catch (err) {
      console.error('Error adding item:', err);
      setError('Failed to add item');
      return false;
    } finally {
      setIsAdding(false);
    }
  }, []);

  return { addItem: add, isAdding, error };
}

interface UseUpdateItemResult {
  updateItem: (listId: string, itemId: string, updates: { title: string; description?: string }) => Promise<boolean>;
  isUpdating: boolean;
  error: string | null;
}

/**
 * Hook for updating items
 */
export function useUpdateItem(): UseUpdateItemResult {
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = useCallback(async (
    listId: string,
    itemId: string,
    updates: { title: string; description?: string }
  ): Promise<boolean> => {
    setIsUpdating(true);
    setError(null);

    try {
      await updateItem(listId, itemId, updates);
      return true;
    } catch (err) {
      console.error('Error updating item:', err);
      setError('Failed to update item');
      return false;
    } finally {
      setIsUpdating(false);
    }
  }, []);

  return { updateItem: update, isUpdating, error };
}

interface UseDeleteItemResult {
  deleteItem: (listId: string, itemId: string) => Promise<boolean>;
  isDeleting: boolean;
  error: string | null;
}

/**
 * Hook for deleting items
 */
export function useDeleteItem(): UseDeleteItemResult {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remove = useCallback(async (listId: string, itemId: string): Promise<boolean> => {
    setIsDeleting(true);
    setError(null);

    try {
      await deleteItem(listId, itemId);
      return true;
    } catch (err) {
      console.error('Error deleting item:', err);
      setError('Failed to delete item');
      return false;
    } finally {
      setIsDeleting(false);
    }
  }, []);

  return { deleteItem: remove, isDeleting, error };
}

interface UseClaimItemResult {
  claimItem: (listId: string, itemId: string, user: { id: string; displayName: string | null }) => Promise<boolean>;
  isClaiming: boolean;
  error: string | null;
}

/**
 * Hook for claiming items
 */
export function useClaimItem(): UseClaimItemResult {
  const [isClaiming, setIsClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const claim = useCallback(async (
    listId: string, 
    itemId: string, 
    user: { id: string; displayName: string | null }
  ): Promise<boolean> => {
    setIsClaiming(true);
    setError(null);

    try {
      await claimItem(listId, itemId, user);
      return true;
    } catch (err) {
      console.error('Error claiming item:', err);
      setError('Failed to claim item');
      return false;
    } finally {
      setIsClaiming(false);
    }
  }, []);

  return { claimItem: claim, isClaiming, error };
}

interface UseUnclaimItemResult {
  unclaimItem: (listId: string, itemId: string) => Promise<boolean>;
  isUnclaiming: boolean;
  error: string | null;
}

/**
 * Hook for unclaiming items
 */
export function useUnclaimItem(): UseUnclaimItemResult {
  const [isUnclaiming, setIsUnclaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const unclaim = useCallback(async (listId: string, itemId: string): Promise<boolean> => {
    setIsUnclaiming(true);
    setError(null);

    try {
      await unclaimItem(listId, itemId);
      return true;
    } catch (err) {
      console.error('Error unclaiming item:', err);
      setError('Failed to unclaim item');
      return false;
    } finally {
      setIsUnclaiming(false);
    }
  }, []);

  return { unclaimItem: unclaim, isUnclaiming, error };
}
