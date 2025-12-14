'use client';

import { useState, useEffect, useCallback } from 'react';
import { SavedListRef } from '@/types';
import { getSavedListsForUser } from '@/lib/firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';

export function useSharedLists() {
  const { user } = useAuth();
  const [lists, setLists] = useState<SavedListRef[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchShared = useCallback(async () => {
    if (!user?.isAuthenticated) {
      setLists([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const data = await getSavedListsForUser(user.id);
      setLists(data);
    } catch (err) {
      console.error('Error fetching shared lists', err);
      setError('Failed to load shared lists');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchShared();
  }, [fetchShared]);

  return { sharedLists: lists, isLoading, error, refresh: fetchShared };
}
