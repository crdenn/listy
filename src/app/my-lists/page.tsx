'use client';

/**
 * My Lists Page
 * 
 * Shows all lists created by the current user.
 * Allows creating new lists and managing existing ones.
 */

import { useMyLists, useDeleteList } from '@/lib/hooks/useList';
import { useAuth } from '@/contexts/AuthContext';
import { ListCard } from '@/components/list/ListCard';
import { CreateListDialog } from '@/components/list/CreateListDialog';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, ListPlus, Tag } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { AuthDialog } from '@/components/auth/AuthDialog';
import Link from 'next/link';
import { useGroupMembership } from '@/lib/hooks';

export default function MyListsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { lists, isLoading: listsLoading, refresh } = useMyLists();
  const { deleteList } = useDeleteList();
  const { toast } = useToast();
  const { groups: joinedGroups } = useGroupMembership();

  // Handle list deletion with refresh
  const handleDelete = async (listId: string) => {
    const success = await deleteList(listId);
    if (success) {
      toast({
        title: 'List deleted',
        description: 'Your list has been permanently deleted.',
      });
      refresh();
    } else {
      toast({
        title: 'Error',
        description: 'Failed to delete the list. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Show loading state
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!user || !user.isAuthenticated) {
    return (
      <div className="container max-w-4xl mx-auto px-4 py-16">
        <div className="text-center space-y-6 max-w-md mx-auto">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto">
            <ListPlus className="h-8 w-8 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-bold">Sign in to view your lists</h1>
          <p className="text-muted-foreground">
            Create an account or sign in to save your lists and access them from any device.
          </p>
          <AuthDialog
            trigger={
              <Button size="lg" className="gap-2">
                Sign in or create account
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">My Lists</h1>
          <p className="text-muted-foreground mt-1">
            Create and manage your collaborative lists
          </p>
        </div>
        <CreateListDialog
          onSuccess={refresh}
          trigger={
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New List
            </Button>
          }
        />
      </div>

      {/* Lists grid */}
      {listsLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : lists.length === 0 ? (
        <div className="text-center py-16 space-y-4">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto">
            <ListPlus className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold">No lists yet</h2>
          <p className="text-muted-foreground max-w-sm mx-auto">
            Create your first list to start collaborating with friends and family.
          </p>
          <CreateListDialog
            onSuccess={refresh}
            trigger={
              <Button className="gap-2 mt-4">
                <Plus className="h-4 w-4" />
                Create Your First List
              </Button>
            }
          />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {lists.map((list) => (
            <ListCard
              key={list.id}
              list={list}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Group memberships */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Tag className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-lg font-semibold">My List Groups</h2>
        </div>
        {(() => {
          const groupsFromLists = lists
            .map((l) => {
              if (!l.groupName && !l.groupCode) return null;
              return {
                code: l.groupCode || l.groupName || '',
                name: l.groupName || l.groupCode || '',
              };
            })
            .filter((g): g is { code: string; name: string } => !!g && !!g.code);

          const allGroups = [...groupsFromLists, ...joinedGroups].reduce((acc, group) => {
            if (!group.code) return acc;
            if (acc.has(group.code)) return acc;
            acc.set(group.code, group);
            return acc;
          }, new Map<string, { code: string; name?: string }>());

          if (allGroups.size === 0) {
            return (
              <p className="text-sm text-muted-foreground">
                You&apos;re not in any groups yet. Join a group via an invite link or add a group name when creating a list.
              </p>
            );
          }

          return (
            <div className="grid gap-3 sm:grid-cols-2">
              {[...allGroups.values()].map((group) => (
                <Link
                  key={group.code}
                  href={`/group/${encodeURIComponent(group.code)}`}
                  className="flex items-center justify-between rounded-md border px-3 py-3 hover:bg-muted transition-colors"
                >
                  <div className="space-y-1">
                    <p className="font-semibold">{group.name || group.code}</p>
                    <p className="text-xs text-muted-foreground">
                      View lists shared in this group
                    </p>
                  </div>
                  <Tag className="h-4 w-4 text-muted-foreground" />
                </Link>
              ))}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
