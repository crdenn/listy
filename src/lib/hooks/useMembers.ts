'use client';

import { useState, useEffect, useCallback } from 'react';
import { ListMember, List } from '@/types';
import { getListMembers, subscribeToMembers, touchListMember } from '@/lib/firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';

interface UseMembersResult {
  members: ListMember[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useListMembers(list: List | null): UseMembersResult {
  const { user } = useAuth();
  const listId = list?.id;
  const [members, setMembers] = useState<ListMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMembers = useCallback(async () => {
    if (!listId) {
      setMembers([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const data = await getListMembers(listId);
      setMembers(data);
    } catch (err) {
      console.error('Error loading members', err);
      setError('Failed to load members');
    } finally {
      setIsLoading(false);
    }
  }, [listId]);

  useEffect(() => {
    if (!listId) {
      setMembers([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const unsubscribe = subscribeToMembers(
      listId,
      (data) => {
        setMembers(data);
        setError(null);
        setIsLoading(false);
      },
      (err) => {
        console.error('Failed to load members in realtime', err);
        setError('Unable to load collaborators');
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [listId]);

  // Track membership when authenticated
  useEffect(() => {
    if (!listId || !user?.isAuthenticated || !list) return;
    touchListMember(listId, user).catch((err) => {
      console.error('Failed to record membership', err);
    });
  }, [listId, user, list]);

  return { members, isLoading, error, refresh: fetchMembers };
}
