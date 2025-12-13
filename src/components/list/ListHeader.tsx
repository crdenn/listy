'use client';

/**
 * List Header Component
 * 
 * Displays list title, description, type badge, and actions.
 * Only shows edit/delete options for the list owner.
 */

import { useState } from 'react';
import { Gift, Users, Settings, Trash2, ArrowLeft, Tag, ArrowUpRight, Calendar } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { List } from '@/types';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ShareDialog } from './ShareDialog';
import { useUpdateList, useDeleteList } from '@/lib/hooks';
import { cn, formatDateInput, formatTimeInput } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

interface ListHeaderProps {
  list: List;
  isOwner: boolean;
}

export function ListHeader({ list, isOwner }: ListHeaderProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { updateList, isUpdating } = useUpdateList();
  const { deleteList, isDeleting } = useDeleteList();
  
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editTitle, setEditTitle] = useState(list.title);
  const [editDescription, setEditDescription] = useState(list.description || '');
  const [editGroupName, setEditGroupName] = useState(list.groupName || '');
  const [editEventDate, setEditEventDate] = useState(list.eventDate || '');
  const [editEventTime, setEditEventTime] = useState(list.eventTime || '');
  const [editEventLocation, setEditEventLocation] = useState(list.eventLocation || '');

  const handleUpdate = async () => {
    const success = await updateList(list.id, {
      title: editTitle.trim(),
      description: editDescription.trim() || undefined,
      groupName: editGroupName.trim(),
      eventDate: editEventDate.trim() || undefined,
      eventTime: editEventTime.trim() || undefined,
      eventLocation: editEventLocation.trim() || undefined,
    });
    
    if (success) {
      setShowEditDialog(false);
    }
  };

  const handleDelete = async () => {
    const success = await deleteList(list.id);
    if (success) {
      router.push('/my-lists');
    }
  };

  const TypeIcon = list.type === 'gift' ? Gift : Users;
  const typeLabel = list.type === 'gift' ? 'Gift List' : 'Potluck/Event';
  const groupHref = list.groupCode
    ? `/group/${encodeURIComponent(list.groupCode)}`
    : list.groupName
      ? `/group/${encodeURIComponent(list.groupName)}`
      : null;
  const backHref = !user?.isAuthenticated && groupHref ? groupHref : '/my-lists';
  const backLabel = !user?.isAuthenticated && groupHref ? 'Back to group' : 'My Lists';
  const eventDateLabel = list.eventDate ? formatDateInput(list.eventDate) : null;
  const eventTimeLabel = list.eventTime ? formatTimeInput(list.eventTime) : null;

  return (
    <>
      <div className="space-y-4">
        {/* Back link */}
        <Link
          href={backHref}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {backLabel}
        </Link>

        {/* Header content */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              {list.title}
            </h1>
            
            {list.description && (
              <p className="text-muted-foreground max-w-2xl">
                {list.description}
              </p>
            )}

            {/* Type badge */}
            <div className="flex flex-wrap items-center gap-2">
              <div className={cn(
                'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
                list.type === 'gift' 
                  ? 'bg-purple-100 text-purple-800' 
                  : 'bg-blue-100 text-blue-800'
              )}>
                <TypeIcon className="h-3 w-3" />
                {typeLabel}
              </div>
              {eventDateLabel && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
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
              )}
              {list.groupName && groupHref && (
                <Link
                  href={groupHref}
                  className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-semibold hover:bg-muted transition-colors"
                  title="View group page"
                >
                  <Tag className="h-3 w-3" />
                  <span>{list.groupName}</span>
                  <ArrowUpRight className="h-3 w-3" />
                </Link>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <ShareDialog shareCode={list.shareCode} listTitle={list.title} />
            
            {isOwner && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditTitle(list.title);
                    setEditDescription(list.description || '');
                    setShowEditDialog(true);
                  }}
                  className="gap-2"
                >
                  <Settings className="h-4 w-4" />
                  <span className="hidden sm:inline">Settings</span>
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDeleteDialog(true)}
                  className="gap-2 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="sr-only">Delete</span>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleUpdate();
            }}
          >
            <DialogHeader>
              <DialogTitle>Edit List</DialogTitle>
              <DialogDescription>
                Update your list&apos;s title and description.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-title">Title</Label>
                <Input
                  id="edit-title"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  disabled={isUpdating}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  disabled={isUpdating}
                  rows={3}
                />
              </div>

              {list.type === 'potluck' && (
                <div className="space-y-2">
                  <Label htmlFor="edit-event-date">
                    Event date <span className="text-muted-foreground">(optional)</span>
                  </Label>
                  <Input
                    id="edit-event-date"
                    type="date"
                    value={editEventDate}
                    onChange={(e) => setEditEventDate(e.target.value)}
                    disabled={isUpdating}
                  />
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="grid gap-1">
                      <Label htmlFor="edit-event-time">
                        Event time <span className="text-muted-foreground">(optional)</span>
                      </Label>
                      <Input
                        id="edit-event-time"
                        type="time"
                        value={editEventTime}
                        onChange={(e) => setEditEventTime(e.target.value)}
                        disabled={isUpdating}
                      />
                    </div>
                    <div className="grid gap-1">
                      <Label htmlFor="edit-event-location">
                        Location <span className="text-muted-foreground">(optional)</span>
                      </Label>
                      <Input
                        id="edit-event-location"
                        value={editEventLocation}
                        onChange={(e) => setEditEventLocation(e.target.value)}
                        disabled={isUpdating}
                        placeholder="e.g., 123 Main St, Zoom, etc."
                      />
                    </div>
                  </div>
                </div>
              )}

              {list.type === 'gift' && (
                <div className="space-y-2">
                  <Label htmlFor="edit-groupName">
                    Group name <span className="text-muted-foreground">(optional)</span>
                  </Label>
                  <Input
                    id="edit-groupName"
                    value={editGroupName}
                    onChange={(e) => setEditGroupName(e.target.value)}
                    disabled={isUpdating}
                  />
                  <p className="text-xs text-muted-foreground">
                    Example: Denning Family Christmas 2025. Leave blank if not grouping.
                  </p>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowEditDialog(false)}
                disabled={isUpdating}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isUpdating || !editTitle.trim()}
              >
                {isUpdating ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
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
              {isDeleting ? 'Deleting...' : 'Delete List'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
