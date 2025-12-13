'use client';

/**
 * Custom hook for list operations
 * 
 * Provides real-time list data and mutation functions.
 * Handles loading states, errors, and optimistic updates.
 */

import { useState, useEffect, useCallback } from 'react';
import { List, CreateListInput } from '@/types';
import {
  getListByShareCode,
  getListById,
  getListsByCreator,
  getListsByGroupCode,
  getListsByGroupName,
  createList,
  updateList,
  deleteList,
  subscribeToList,
} from '@/lib/firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';

interface UseListOptions {
  // Subscribe to real-time updates
  realtime?: boolean;
}

interface UseListResult {
  list: List | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Hook to fetch and subscribe to a single list by share code
 */
export function useListByShareCode(
  shareCode: string | null,
  options: UseListOptions = {}
): UseListResult {
  const { realtime = true } = options;
  const [list, setList] = useState<List | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchList = useCallback(async () => {
    if (!shareCode) {
      setList(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await getListByShareCode(shareCode);
      setList(data);
    } catch (err) {
      console.error('Error fetching list:', err);
      setError('Failed to load list');
    } finally {
      setIsLoading(false);
    }
  }, [shareCode]);

  useEffect(() => {
    if (!shareCode) {
      setList(null);
      setIsLoading(false);
      return;
    }

    // Initial fetch
    fetchList();

    // Set up real-time subscription if enabled and we have a list
    if (realtime) {
      // We need to first get the list to get its ID for subscription
      getListByShareCode(shareCode).then((fetchedList) => {
        if (fetchedList) {
          return subscribeToList(fetchedList.id, (updatedList) => {
            setList(updatedList);
          });
        }
      }).catch(console.error);
    }
  }, [shareCode, realtime, fetchList]);

  return { list, isLoading, error, refresh: fetchList };
}

/**
 * Hook to fetch and subscribe to a single list by ID
 */
export function useListById(
  listId: string | null,
  options: UseListOptions = {}
): UseListResult {
  const { realtime = true } = options;
  const [list, setList] = useState<List | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchList = useCallback(async () => {
    if (!listId) {
      setList(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await getListById(listId);
      setList(data);
    } catch (err) {
      console.error('Error fetching list:', err);
      setError('Failed to load list');
    } finally {
      setIsLoading(false);
    }
  }, [listId]);

  useEffect(() => {
    if (!listId) {
      setList(null);
      setIsLoading(false);
      return;
    }

    // Initial fetch
    fetchList();

    // Set up real-time subscription if enabled
    if (realtime) {
      const unsubscribe = subscribeToList(listId, (updatedList) => {
        setList(updatedList);
        setIsLoading(false);
      });

      return () => unsubscribe();
    }
  }, [listId, realtime, fetchList]);

  return { list, isLoading, error, refresh: fetchList };
}

interface UseMyListsResult {
  lists: List[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

interface UseGroupListsResult {
  lists: List[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Hook to fetch all lists created by the current user
 */
export function useMyLists(): UseMyListsResult {
  const { user } = useAuth();
  const [lists, setLists] = useState<List[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLists = useCallback(async () => {
    if (!user) {
      setLists([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await getListsByCreator(user.id);
      setLists(data);
    } catch (err) {
      console.error('Error fetching lists:', err);
      setError('Failed to load your lists');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchLists();
  }, [fetchLists]);

  return { lists, isLoading, error, refresh: fetchLists };
}

/**
 * Hook to fetch all lists within the same group
 */
export function useGroupLists(groupCode: string | null, excludeListId?: string): UseGroupListsResult {
  const [lists, setLists] = useState<List[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLists = useCallback(async () => {
    if (!groupCode) {
      setLists([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let data = await getListsByGroupCode(groupCode);
      // Fallback to groupName for older lists without a groupCode
      if (data.length === 0) {
        data = await getListsByGroupName(groupCode);
      }
      const filtered = excludeListId ? data.filter((list) => list.id !== excludeListId) : data;
      setLists(filtered);
    } catch (err) {
      console.error('Error fetching group lists:', err);
      setError('Failed to load group lists');
    } finally {
      setIsLoading(false);
    }
  }, [groupCode, excludeListId]);

  useEffect(() => {
    fetchLists();
  }, [fetchLists]);

  return { lists, isLoading, error, refresh: fetchLists };
}

interface UseCreateListResult {
  createList: (input: CreateListInput) => Promise<List | null>;
  isCreating: boolean;
  error: string | null;
}

/**
 * Hook for creating new lists
 */
export function useCreateList(): UseCreateListResult {
  const { user } = useAuth();
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = useCallback(async (input: CreateListInput): Promise<List | null> => {
    if (!user || !user.isAuthenticated) {
      setError('Sign in to create a list');
      return null;
    }

    setIsCreating(true);
    setError(null);

    try {
      const list = await createList(input, user);
      return list;
    } catch (err) {
      console.error('Error creating list:', err);
      setError('Failed to create list');
      return null;
    } finally {
      setIsCreating(false);
    }
  }, [user]);

  return { createList: create, isCreating, error };
}

interface UseUpdateListResult {
  updateList: (listId: string, updates: Partial<Pick<List, 'title' | 'description' | 'groupName' | 'groupCode' | 'eventDate' | 'eventTime' | 'eventLocation' | 'type'>>) => Promise<boolean>;
  isUpdating: boolean;
  error: string | null;
}

/**
 * Hook for updating lists
 */
export function useUpdateList(): UseUpdateListResult {
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = useCallback(async (
    listId: string,
    updates: Partial<Pick<List, 'title' | 'description' | 'groupName' | 'groupCode' | 'eventDate' | 'eventTime' | 'eventLocation' | 'type'>>
  ): Promise<boolean> => {
    setIsUpdating(true);
    setError(null);

    try {
      await updateList(listId, updates);
      return true;
    } catch (err) {
      console.error('Error updating list:', err);
      setError('Failed to update list');
      return false;
    } finally {
      setIsUpdating(false);
    }
  }, []);

  return { updateList: update, isUpdating, error };
}

interface UseDeleteListResult {
  deleteList: (listId: string) => Promise<boolean>;
  isDeleting: boolean;
  error: string | null;
}

/**
 * Hook for deleting lists
 */
export function useDeleteList(): UseDeleteListResult {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remove = useCallback(async (listId: string): Promise<boolean> => {
    setIsDeleting(true);
    setError(null);

    try {
      await deleteList(listId);
      return true;
    } catch (err) {
      console.error('Error deleting list:', err);
      setError('Failed to delete list');
      return false;
    } finally {
      setIsDeleting(false);
    }
  }, []);

  return { deleteList: remove, isDeleting, error };
}
