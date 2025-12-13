'use client';

/**
 * List Card Component
 * 
 * Displays a preview of a list with key information.
 * Used on the "My Lists" page and anywhere lists are shown in a grid.
 */

import Link from 'next/link';
import { Gift, Users, ExternalLink, Trash2, MoreVertical, Tag, Calendar } from 'lucide-react';
import { List } from '@/types';
import { formatRelativeTime } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ShareDialog } from './ShareDialog';
import { cn, formatTimeInput } from '@/lib/utils';
import { Timestamp } from 'firebase/firestore';
import { useState } from 'react';
import { formatDateInput } from '@/lib/utils';

interface ListCardProps {
  list: List;
  onDelete?: (listId: string) => Promise<void>;
}

export function ListCard({ list, onDelete }: ListCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Convert Firestore Timestamp to Date if needed
  const updatedAt = list.updatedAt instanceof Timestamp 
    ? list.updatedAt.toDate() 
    : new Date(list.updatedAt);

  const handleDelete = async () => {
    if (!onDelete) return;
    
    setIsDeleting(true);
    try {
      await onDelete(list.id);
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const TypeIcon = list.type === 'gift' ? Gift : Users;
  const typeLabel = list.type === 'gift' ? 'Gift List' : 'Potluck/Event';
  const eventDateLabel = list.eventDate ? formatDateInput(list.eventDate) : null;
  const eventTimeLabel = list.eventTime ? formatTimeInput(list.eventTime) : null;

  return (
    <>
      <Card className="group relative hover:shadow-md transition-shadow">
        <Link href={`/list/${list.shareCode}`} className="absolute inset-0 z-0" />
        
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
          <div className="space-y-1 pr-8">
            <CardTitle className="text-lg font-semibold line-clamp-1 group-hover:text-primary transition-colors">
              {list.title}
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <TypeIcon className="h-3 w-3" />
              <span>{typeLabel}</span>
              <span>·</span>
              <span>{formatRelativeTime(updatedAt)}</span>
              {list.groupName && (
                <>
                  <span>·</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px]">
                    <Tag className="h-3 w-3" />
                    {list.groupName}
                  </span>
                </>
              )}
              {eventDateLabel && (
                <>
                  <span>·</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px]">
                    <Calendar className="h-3 w-3" />
                    {eventDateLabel}
                    {eventTimeLabel && (
                      <>
                        <span aria-hidden="true">·</span>
                        {eventTimeLabel}
                      </>
                    )}
                    {list.eventLocation && (
                      <>
                        <span aria-hidden="true">·</span>
                        {list.eventLocation}
                      </>
                    )}
                  </span>
                </>
              )}
            </div>
          </div>
          
          {/* Actions Menu */}
          <div className="relative z-10">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreVertical className="h-4 w-4" />
                  <span className="sr-only">Actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <ShareDialog shareCode={list.shareCode} listTitle={list.title}>
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Share
                  </DropdownMenuItem>
                </ShareDialog>
                {onDelete && (
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onSelect={() => setShowDeleteDialog(true)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>

        {list.description && (
          <CardContent>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {list.description}
            </p>
          </CardContent>
        )}
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{list.title}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the list and all its items. 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
