'use client';

/**
 * Create List Dialog Component
 * 
 * Modal dialog for creating new lists.
 * Allows users to specify title, description, and list type.
 */

import { useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Gift, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useCreateList } from '@/lib/hooks';
import { List, ListType } from '@/types';
import { cn } from '@/lib/utils';
import { getListByShareCode } from '@/lib/firebase/firestore';

interface CreateListDialogProps {
  trigger?: ReactNode;
  children?: ReactNode;
  onCreated?: (list: List) => void;
  onSuccess?: () => void;
}

export function CreateListDialog({ trigger, children, onCreated, onSuccess }: CreateListDialogProps) {
  const router = useRouter();
  const { createList, isCreating, error } = useCreateList();
  
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [groupName, setGroupName] = useState('');
  const [groupCode, setGroupCode] = useState<string | undefined>(undefined);
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [groupShareCode, setGroupShareCode] = useState('');
  const [groupLookupMessage, setGroupLookupMessage] = useState<string | null>(null);
  const [groupLookupError, setGroupLookupError] = useState<string | null>(null);
  const [isApplyingGroup, setIsApplyingGroup] = useState(false);
  const [type, setType] = useState<ListType | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !type) return;

    const list = await createList({
      title: title.trim(),
      description: description.trim() || undefined,
      groupName: groupName.trim() || undefined,
      groupCode,
      eventDate: eventDate.trim() || undefined,
      eventTime: eventTime.trim() || undefined,
      eventLocation: eventLocation.trim() || undefined,
      type,
    });

    if (list) {
      setOpen(false);
      resetForm();
      onCreated?.(list);
      onSuccess?.();

      if (!onCreated) {
        // Default behavior: navigate to the new list
        router.push(`/list/${list.shareCode}`);
      }
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setGroupName('');
    setGroupCode(undefined);
    setEventDate('');
    setEventTime('');
    setEventLocation('');
    setGroupShareCode('');
    setGroupLookupMessage(null);
    setGroupLookupError(null);
    setType(null);
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      resetForm();
    }
  };

  const handleApplyGroupFromShareCode = async () => {
    if (!groupShareCode.trim()) return;

    setIsApplyingGroup(true);
    setGroupLookupMessage(null);
    setGroupLookupError(null);

    try {
      const existingList = await getListByShareCode(groupShareCode.trim());
      if (!existingList) {
        setGroupLookupError('No list found for that share code.');
        return;
      }
      if (!existingList.groupName) {
        setGroupLookupError('That list is not assigned to a group.');
        return;
      }

      setGroupName(existingList.groupName);
      setGroupCode(existingList.groupCode || existingList.shareCode);
      setGroupLookupMessage(`Using group "${existingList.groupName}" from "${existingList.title}".`);
    } catch (err) {
      console.error('Error looking up share code:', err);
      setGroupLookupError('Unable to look up that share code. Please try again.');
    } finally {
      setIsApplyingGroup(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger ?? children}</DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create a new list</DialogTitle>
          <DialogDescription>
            Create a collaborative list to share with friends and family.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* List Type */}
          <div className="grid gap-3">
            <Label>List Type</Label>
            <RadioGroup
              value={type ?? ''}
                onValueChange={(value) => {
                  const nextType = value as ListType;
                  setType(nextType);
                  if (nextType === 'potluck') {
                    setGroupName('');
                    setGroupCode(undefined);
                    setGroupShareCode('');
                    setGroupLookupMessage(null);
                    setGroupLookupError(null);
                  }
                }}
              className="grid grid-cols-2 gap-3"
            >
              <label
                htmlFor="type-gift"
                className={cn(
                  'flex flex-col items-center gap-2 rounded-lg border-2 p-4 cursor-pointer transition-colors',
                  type === 'gift'
                    ? 'border-primary bg-primary/5'
                    : 'border-muted hover:border-muted-foreground/50'
                )}
              >
                <RadioGroupItem value="gift" id="type-gift" className="sr-only" />
                <Gift className={cn(
                  'h-6 w-6',
                  type === 'gift' ? 'text-primary' : 'text-muted-foreground'
                )} />
                <div className="text-center">
                  <p className="font-medium text-sm">Gift List</p>
                  <p className="text-xs text-muted-foreground">
                    Claims are hidden
                  </p>
                </div>
              </label>

              <label
                htmlFor="type-potluck"
                className={cn(
                  'flex flex-col items-center gap-2 rounded-lg border-2 p-4 cursor-pointer transition-colors',
                  type === 'potluck'
                    ? 'border-primary bg-primary/5'
                    : 'border-muted hover:border-muted-foreground/50'
                )}
              >
                <RadioGroupItem value="potluck" id="type-potluck" className="sr-only" />
                <Users className={cn(
                  'h-6 w-6',
                  type === 'potluck' ? 'text-primary' : 'text-muted-foreground'
                )} />
                <div className="text-center">
                  <p className="font-medium text-sm">Potluck/Event</p>
                  <p className="text-xs text-muted-foreground">
                    Claims are visible
                  </p>
                </div>
              </label>
            </RadioGroup>
            {!type && (
              <p className="text-xs text-muted-foreground">Choose a list type to continue.</p>
            )}
          </div>

          {type && (
            <>
              {/* List Title */}
              <div className="grid gap-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  placeholder="e.g., Birthday Wishlist, Potluck Dinner"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={isCreating}
                  autoFocus
                />
              </div>

              {/* Description */}
              <div className="grid gap-2">
                <Label htmlFor="description">
                  Description <span className="text-muted-foreground">(optional)</span>
                </Label>
                <Textarea
                  id="description"
                  placeholder="Add any details or instructions..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={isCreating}
                  rows={2}
                />
              </div>

              {/* Event date (potluck only) */}
              {type === 'potluck' && (
                <div className="grid gap-2">
                  <Label htmlFor="eventDate">
                    Event date <span className="text-muted-foreground">(optional)</span>
                  </Label>
                  <Input
                    id="eventDate"
                    type="date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    disabled={isCreating}
                  />
                  <p className="text-xs text-muted-foreground">
                    Add a date so guests know when the event is happening.
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="grid gap-1">
                      <Label htmlFor="eventTime">
                        Event time <span className="text-muted-foreground">(optional)</span>
                      </Label>
                      <Input
                        id="eventTime"
                        type="time"
                        value={eventTime}
                        onChange={(e) => setEventTime(e.target.value)}
                        disabled={isCreating}
                      />
                    </div>
                    <div className="grid gap-1">
                      <Label htmlFor="eventLocation">
                        Location <span className="text-muted-foreground">(optional)</span>
                      </Label>
                      <Input
                        id="eventLocation"
                        value={eventLocation}
                        onChange={(e) => setEventLocation(e.target.value)}
                        placeholder="e.g., 123 Main St, Zoom, etc."
                        disabled={isCreating}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Grouping (gift only) */}
              {type === 'gift' && (
                <>
                  <div className="grid gap-2">
                    <Label htmlFor="groupName">
                      Group name <span className="text-muted-foreground">(optional)</span>
                    </Label>
                    <Input
                      id="groupName"
                      placeholder="e.g., Denning Family Christmas 2025"
                      value={groupName}
                      onChange={(e) => {
                        setGroupName(e.target.value);
                        setGroupCode(undefined);
                        setGroupLookupMessage(null);
                        setGroupLookupError(null);
                      }}
                      disabled={isCreating}
                    />
                    <p className="text-xs text-muted-foreground">
                      Use this to group related lists (handy for family gift exchanges).
                    </p>
                  </div>

                  {/* Reuse existing group via share code */}
                  <div className="grid gap-2">
                    <Label htmlFor="groupShareCode">
                      Use group from another list <span className="text-muted-foreground">(optional)</span>
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="groupShareCode"
                        placeholder="Paste a share code from an existing list"
                        value={groupShareCode}
                        onChange={(e) => {
                          setGroupShareCode(e.target.value);
                          setGroupLookupMessage(null);
                          setGroupLookupError(null);
                        }}
                        disabled={isCreating || isApplyingGroup}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleApplyGroupFromShareCode}
                        disabled={!groupShareCode.trim() || isCreating || isApplyingGroup}
                      >
                        {isApplyingGroup ? 'Looking up...' : 'Use group'}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Grab the share code from a friend&apos;s list to reuse their group name exactly.
                    </p>
                    {groupLookupMessage && (
                      <p className="text-xs text-green-600">{groupLookupMessage}</p>
                    )}
                    {groupLookupError && (
                      <p className="text-xs text-destructive">{groupLookupError}</p>
                    )}
                  </div>
                </>
              )}
            </>
          )}

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isCreating || isApplyingGroup || !title.trim() || !type}>
              {isCreating ? 'Creating...' : 'Create List'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
