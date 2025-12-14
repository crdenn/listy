'use client';

/**
 * Group Page
 * 
 * Shows all lists that share the same group name.
 * Useful for sharing a family/holiday group and browsing everyone else's lists.
 */

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { Tag, Loader2, Share2, ArrowLeft } from 'lucide-react';
import { useGroupLists } from '@/lib/hooks/useList';
import { useAuth } from '@/contexts/AuthContext';
import { ListCard } from '@/components/list/ListCard';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

interface PageProps {
  params: Promise<{ groupCode: string }>;
}

export default function GroupPage({ params }: PageProps) {
  const { groupCode } = use(params);
  const decodedGroupCode = decodeURIComponent(groupCode);
  const { lists, isLoading, error } = useGroupLists(decodedGroupCode);
  const { toast } = useToast();
  const [shareUrl, setShareUrl] = useState('');
  const { user } = useAuth();
  const displayName = lists[0]?.groupName || 'Group';

  useEffect(() => {
    setShareUrl(window.location.href);
  }, []);

  const handleCopyLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast({ title: 'Link copied', description: 'Share this link to invite others to the group.' });
    } catch (err) {
      console.error('Failed to copy link', err);
      toast({ title: 'Unable to copy link', description: 'Please copy it manually.', variant: 'destructive' });
    }
  };

  return (
    <div className="container max-w-4xl mx-auto px-4 py-8 space-y-8 overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col gap-3">
        {user?.isAuthenticated && (
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-muted">
              <Tag className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{displayName}</h1>
              <p className="text-muted-foreground">Lists shared in this group</p>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="gap-2 whitespace-nowrap"
            onClick={handleCopyLink}
            disabled={!shareUrl}
          >
            <Share2 className="h-4 w-4" />
            Share group
          </Button>
        </div>
      </div>

      {/* Body */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="text-center py-12 space-y-2">
          <p className="text-lg font-semibold">Unable to load group</p>
          <p className="text-muted-foreground">{error}</p>
          <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
            Try again
          </Button>
        </div>
      ) : lists.length === 0 ? (
        <div className="text-center py-16 space-y-3 border rounded-lg bg-muted/40">
          <p className="text-lg font-semibold">No lists in this group yet</p>
          <p className="text-muted-foreground">
            Share this link or add lists to the group to see them here.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {lists.map((list) => (
            <div key={list.id} className="w-full">
              <ListCard list={list} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
