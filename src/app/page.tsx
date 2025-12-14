'use client';

/**
 * Home Page
 *
 * Conditionally renders:
 * - Landing page for unauthenticated users
 * - My Lists page for authenticated users (at root URL)
 */

import { useMemo, useState } from 'react';
import { Gift, Users, ListPlus, Loader2, Plus, Tag, Share2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { AuthDialog } from '@/components/auth/AuthDialog';
import { useMyLists, useDeleteList } from '@/lib/hooks/useList';
import { useToast } from '@/components/ui/use-toast';
import { ListCard } from '@/components/list/ListCard';
import { CreateListDialog } from '@/components/list/CreateListDialog';
import { useGroupMembership, useSharedLists } from '@/lib/hooks';
import Link from 'next/link';
import { formatRelativeTime } from '@/lib/utils';
import { List } from '@/types';

const isPastEvent = (list: List) => {
  if (list.type !== 'potluck' || !list.eventDate) return false;
  const parts = list.eventDate.split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return false;
  const [year, month, day] = parts;

  // If a time is provided, use it; otherwise default to end-of-day
  let hour = 23;
  let minute = 59;
  if (list.eventTime) {
    const [h, m] = list.eventTime.split(':').map(Number);
    if (!Number.isNaN(h) && !Number.isNaN(m)) {
      hour = h;
      minute = m;
    }
  }

  const endDateTime = new Date(year, month - 1, day, hour, minute, 59, 999);
  return endDateTime.getTime() < Date.now();
};

export const dynamic = 'force-dynamic';

export default function HomePage() {
  const { user, isLoading: authLoading } = useAuth();
  const { lists, isLoading: listsLoading, refresh } = useMyLists();
  const { sharedLists, isLoading: sharedLoading, refresh: refreshShared } = useSharedLists();
  const { deleteList } = useDeleteList();
  const { toast } = useToast();
  const { groups: joinedGroups } = useGroupMembership();
  const [showPastEvents, setShowPastEvents] = useState(false);

  const pastEventCount = useMemo(
    () => lists.filter((l) => isPastEvent(l)).length,
    [lists]
  );
  const visibleLists = useMemo(
    () => (showPastEvents ? lists : lists.filter((l) => !isPastEvent(l))),
    [lists, showPastEvents]
  );

  // Handle list deletion with refresh
  const handleDelete = async (listId: string) => {
    const success = await deleteList(listId);
    if (success) {
      toast({
        title: 'List deleted',
        description: 'Your list has been permanently deleted.',
      });
      refresh();
      refreshShared();
    } else {
      toast({
        title: 'Error',
        description: 'Failed to delete the list. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Authenticated users see My Lists at root URL
  if (user?.isAuthenticated) {
    return (
      <div className="container max-w-4xl mx-auto px-4 py-8 space-y-8 overflow-x-hidden">
          {/* Page header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">My Lists</h1>
              <p className="text-muted-foreground mt-1">
                Create and manage your collaborative lists
              </p>
            </div>
            <div className="hidden sm:block">
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
          </div>

        {/* Lists grid */}
        {listsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : visibleLists.length === 0 ? (
          <div className="text-center py-16 space-y-4">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto">
              <ListPlus className="h-8 w-8 text-muted-foreground" />
            </div>
            {lists.length === 0 ? (
              <>
                <h2 className="text-xl font-semibold">No lists yet</h2>
                <p className="text-muted-foreground max-w-sm mx-auto">
                  Create your first list to start collaborating with friends and family.
                </p>
                <CreateListDialog
                  onSuccess={refresh}
                  trigger={
                    <Button className="gap-2 mt-4 w-full sm:w-auto justify-center">
                      <Plus className="h-4 w-4" />
                      Create Your First List
                    </Button>
                  }
                />
              </>
            ) : (
              <>
                <h2 className="text-xl font-semibold">No upcoming events</h2>
                <p className="text-muted-foreground max-w-sm mx-auto">
                  Past potluck/event lists are hidden. You can show them if needed.
                </p>
                <Button
                  variant="outline"
                  className="mt-2"
                  onClick={() => setShowPastEvents(true)}
                >
                  Show past events ({pastEventCount})
                </Button>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid gap-4 sm:grid-cols-2">
              {visibleLists.map((list) => (
              <ListCard
                key={list.id}
                list={list}
                onDelete={handleDelete}
              />
              ))}
            </div>
            {pastEventCount > 0 && (
              <div className="flex justify-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPastEvents((prev) => !prev)}
                >
                  {showPastEvents ? 'Hide past events' : 'Show past events'}
                </Button>
              </div>
            )}
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
                  className="flex items-center justify-between rounded-md border px-3 py-3 hover:bg-muted transition-colors w-full box-border"
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

        {/* Shared with me */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Share2 className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Shared with me</h2>
          </div>
          {sharedLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : sharedLists.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Lists that others share with you will appear here.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {sharedLists
                .filter((shared) => !lists.find((l) => l.id === shared.listId))
                .map((shared) => (
                <Link
                  key={shared.listId}
                  href={`/list/${shared.shareCode}`}
                  className="rounded-lg border px-4 py-3 hover:shadow-md transition-shadow bg-white"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <p className="font-semibold line-clamp-1">{shared.title}</p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        Viewed {formatRelativeTime(shared.lastOpenedAt instanceof Date ? shared.lastOpenedAt : shared.lastOpenedAt.toDate())}
                      </p>
                    </div>
                    <Share2 className="h-4 w-4 text-muted-foreground shrink-0" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Open shared list
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Mobile new list CTA */}
        <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-gradient-to-t from-background via-background to-transparent pt-8 pb-4 px-4">
          <CreateListDialog
            onSuccess={refresh}
            trigger={
              <Button className="w-full gap-2 shadow-lg">
                <Plus className="h-4 w-4" />
                New List
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  // Unauthenticated users see landing page
  return (
    <div className="container mx-auto px-4 py-8 sm:py-12">
      {/* Hero Section */}
      <div className="text-center max-w-3xl mx-auto mb-12">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
          Listy
        </h1>
        <p className="text-lg text-muted-foreground mb-8">
          Create and share gift wishlists, potluck sign-ups, and more with friends and family.
        </p>
        
        {/* Quick Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <AuthDialog
            trigger={
              <Button size="lg" className="gap-2 w-full sm:w-auto">
                <ListPlus className="h-5 w-5" />
                Sign in to Create
              </Button>
            }
          />
        </div>
      </div>

      {/* Features Section */}
      <div className="grid sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <div className="h-12 w-12 rounded-lg bg-purple-100 flex items-center justify-center mb-4">
              <Gift className="h-6 w-6 text-purple-600" />
            </div>
            <CardTitle>Gift Lists</CardTitle>
            <CardDescription>
              Perfect for birthdays, holidays, and special occasions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-purple-600">✓</span>
                Claims are hidden from the gift recipient
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-600">✓</span>
                Prevent duplicate gifts automatically
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-600">✓</span>
                Share with friends and family
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center mb-4">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <CardTitle>Potluck & Event Lists</CardTitle>
            <CardDescription>
              Coordinate who's bringing what to group events
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-blue-600">✓</span>
                Everyone can see who's bringing what
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600">✓</span>
                Easy sign-up for any item
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600">✓</span>
                Great for parties, picnics, and team events
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <footer className="text-center text-sm text-muted-foreground mt-16 pb-8">
        <p>Sign in with Google to create and manage your lists.</p>
      </footer>
    </div>
  );
}
