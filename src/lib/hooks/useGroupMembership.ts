'use client';

/**
 * Track group memberships locally (client-side)
 * 
 * Users can join a group via invite link without creating a list.
 * Membership is stored in localStorage for convenience.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { storage } from '@/lib/utils';

const STORAGE_KEY = 'listy_group_memberships_v2';

export interface GroupMembership {
  code: string;
  name?: string;
}

export function useGroupMembership() {
  const [groups, setGroups] = useState<GroupMembership[]>([]);

  // Load memberships on mount
  useEffect(() => {
    const saved = storage.get<GroupMembership[] | string[]>(STORAGE_KEY, []);
    // Backward compatibility: if we stored an array of strings, convert to objects with code=name
    const normalized = Array.isArray(saved)
      ? saved.map((entry) =>
          typeof entry === 'string'
            ? { code: entry, name: entry }
            : entry
        )
      : [];
    setGroups(normalized);
  }, []);

  const persist = (next: GroupMembership[]) => {
    setGroups(next);
    storage.set(STORAGE_KEY, next);
  };

  const joinGroup = useCallback((group: GroupMembership) => {
    if (!group.code) return;
    const trimmed = group.code.trim();
    const exists = groups.find((g) => g.code === trimmed);
    if (exists) {
      const updated = groups.map((g) =>
        g.code === trimmed ? { ...g, name: group.name || g.name } : g
      );
      persist(updated);
      return;
    }
    persist([...groups, { code: trimmed, name: group.name?.trim() || group.name }]);
  }, [groups]);

  const leaveGroup = useCallback((groupCode: string) => {
    const code = groupCode.trim();
    const next = groups.filter((g) => g.code !== code);
    persist(next);
  }, [groups]);

  const isMember = useCallback((groupCode: string) => {
    const code = groupCode.trim();
    return groups.some((g) => g.code === code);
  }, [groups]);

  const normalized = useMemo(
    () => groups
      .map((g) => ({ code: g.code.trim(), name: g.name?.trim() || g.name }))
      .filter((g) => !!g.code),
    [groups]
  );

  return {
    groups: normalized,
    joinGroup,
    leaveGroup,
    isMember,
  };
}
