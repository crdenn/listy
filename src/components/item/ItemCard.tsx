'use client';

/**
 * Item Card Component
 * 
 * Displays a single list item with claim/edit/delete actions.
 * Handles visibility rules based on list type:
 * - Gift lists: Claims hidden from the list owner (to keep surprises), visible to claimants and other viewers
 * - Potluck lists: Claims visible to everyone
 */

import { useState } from 'react';
import { Check, X, Pencil, Trash2, User, Eye, EyeOff, ExternalLink } from 'lucide-react';
import { ListItem, List, ItemPermissions } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
import { cn } from '@/lib/utils';

interface ItemCardProps {
  item: ListItem;
  list: List;
  permissions: ItemPermissions;
  authRequired?: boolean;
  onRequireAuth?: () => void;
  hideClaims?: boolean;
  onClaim: () => Promise<boolean>;
  onUnclaim: () => Promise<boolean>;
  onUpdate: (data: { title?: string; description?: string; category?: string; price?: string; imageUrl?: string }) => Promise<boolean>;
  onDelete: () => Promise<boolean>;
}

export function ItemCard({
  item,
  list,
  permissions,
  authRequired = false,
  onRequireAuth,
  hideClaims = false,
  onClaim,
  onUnclaim,
  onUpdate,
  onDelete,
}: ItemCardProps) {
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editTitle, setEditTitle] = useState(item.title);
  const [editDescription, setEditDescription] = useState(item.description || '');
  const [editCategory, setEditCategory] = useState(item.category || '');
  const [editPrice, setEditPrice] = useState(item.price || '');
  const [editImageUrl, setEditImageUrl] = useState(item.imageUrl || '');
  const [isProcessing, setIsProcessing] = useState(false);

  // Use permissions from props
  const { canEdit, canDelete, canClaim, canSeeClaimant } = permissions;
  const maskClaims = hideClaims && list.type === 'gift';
  
  // Determine claim state
  // canClaim is true if: not claimed OR claimed by me
  // So if item IS claimed AND canClaim is true, then I'm the claimant
  const isClaimed = maskClaims ? false : !!item.claimedBy;
  const isClaimant = isClaimed && canClaim;
  const canUnclaimItem = !maskClaims && isClaimant;
  const canClaimItem = !maskClaims && (!isClaimed) && (canClaim || authRequired);

  const handleClaim = async () => {
    if (!canClaim && authRequired) {
      onRequireAuth?.();
      return;
    }
    setIsProcessing(true);
    await onClaim();
    setIsProcessing(false);
  };

  const handleUnclaim = async () => {
    setIsProcessing(true);
    await onUnclaim();
    setIsProcessing(false);
  };

  const handleUpdate = async () => {
    setIsProcessing(true);
    const success = await onUpdate({
      title: editTitle.trim(),
      description: editDescription.trim() || undefined,
      category: list.type === 'potluck' ? (editCategory.trim() || undefined) : undefined,
      price: list.type === 'gift' ? (editPrice.trim() || undefined) : undefined,
      imageUrl: list.type === 'gift' ? (editImageUrl.trim() || undefined) : undefined,
    });
    setIsProcessing(false);
    if (success) {
      setShowEditDialog(false);
    }
  };

  const handleDelete = async () => {
    setIsProcessing(true);
    const success = await onDelete();
    setIsProcessing(false);
    if (success) {
      setShowDeleteDialog(false);
    }
  };

  const openEdit = () => {
    if (!canEdit) return;
    setEditTitle(item.title);
    setEditDescription(item.description || '');
    setEditCategory(item.category || '');
    setEditPrice(item.price || '');
    setEditImageUrl(item.imageUrl || '');
    setShowEditDialog(true);
  };

  return (
    <>
      <Card
        className={cn(
          'transition-all',
          item.claimedBy && !maskClaims && 'bg-muted/50',
          canEdit && 'cursor-pointer'
        )}
        onClick={openEdit}
        tabIndex={canEdit ? 0 : -1}
        onKeyDown={(e) => {
          if (!canEdit) return;
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openEdit();
          }
        }}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {/* Claim/Unclaim Button */}
            <div className="shrink-0 pt-0.5">
              {canClaimItem && (
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClaim();
                  }}
                  disabled={isProcessing}
                  title="Claim this item"
                >
                  <Check className="h-4 w-4" />
                </Button>
              )}
              {isClaimed && (isClaimant || canSeeClaimant) && (
                <Button
                  variant={isClaimant ? "default" : "secondary"}
                  size="icon"
                  className="h-8 w-8 rounded-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isClaimant) handleUnclaim();
                  }}
                  disabled={!isClaimant || isProcessing}
                  title={isClaimant ? "Unclaim this item" : "Claimed"}
                >
                  {isClaimant ? (
                    <X className="h-4 w-4" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                </Button>
              )}
              {isClaimed && !canSeeClaimant && (
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center" title="Claimed by someone">
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
            </div>

            {/* Item Content */}
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-2">
                <h3 className={cn(
                  'font-medium leading-tight',
                  item.claimedBy && !maskClaims && 'text-muted-foreground'
                )}>
                  {item.title}
                </h3>
                {list.type === 'gift' && item.productUrl && (
                  <a
                    href={item.productUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="h-3 w-3" />
                    <span>View</span>
                  </a>
                )}
              </div>
              
              {item.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {item.description}
                </p>
              )}

              {list.type === 'gift' && (item.price || item.imageUrl) && (
                <div className="flex items-center gap-3">
                  {item.imageUrl && (
                    <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-md border">
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  )}
                  {item.price && (
                    <p className="text-sm font-semibold text-foreground">
                      {item.price}
                    </p>
                  )}
                </div>
              )}

              {/* Meta info */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                {item.category && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground">
                    {item.category}
                  </span>
                )}

                {/* Added by (hide on gift lists) */}
                {list.type !== 'gift' && (
                  <span className="inline-flex items-center gap-1">
                    <User className="h-3 w-3" />
                    Added by {item.createdBy.displayName || 'Anonymous'}
                  </span>
                )}

                {/* Claimed by (if visible) */}
                {isClaimed && canSeeClaimant && (
                  <span className="inline-flex items-center gap-1 text-green-600">
                    <Check className="h-3 w-3" />
                    {isClaimant ? 'Claimed by you' : `Claimed by ${item.claimedBy?.displayName || 'Anonymous'}`}
                  </span>
                )}

                {/* Hidden claim indicator for gift lists */}
                {isClaimed && !canSeeClaimant && (
                  <span className="inline-flex items-center gap-1">
                    <EyeOff className="h-3 w-3" />
                    Claimed
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

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
              <DialogTitle>Edit Item</DialogTitle>
              <DialogDescription>
                Update the item details.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-item-title">Title</Label>
                <Input
                  id="edit-item-title"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  disabled={isProcessing}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-item-description">Description (optional)</Label>
                <Textarea
                  id="edit-item-description"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  disabled={isProcessing}
                  rows={3}
                  placeholder="Add details, links, or notes..."
                />
              </div>

              {list.type === 'potluck' && (
                <div className="space-y-2">
                  <Label htmlFor="edit-item-category">Category (optional)</Label>
                  <Input
                    id="edit-item-category"
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    disabled={isProcessing}
                    placeholder="e.g., Appetizer, Main, Dessert"
                  />
                </div>
              )}

              {list.type === 'gift' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="edit-item-price">Price (optional)</Label>
                    <Input
                      id="edit-item-price"
                      value={editPrice}
                      onChange={(e) => setEditPrice(e.target.value)}
                      disabled={isProcessing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-item-image">Image URL (optional)</Label>
                    <Input
                      id="edit-item-image"
                      value={editImageUrl}
                      onChange={(e) => setEditImageUrl(e.target.value)}
                      disabled={isProcessing}
                      placeholder="https://..."
                    />
                  </div>
                </>
              )}
            </div>

            <DialogFooter className="justify-between">
              {canDelete && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => setShowDeleteDialog(true)}
                  disabled={isProcessing}
                >
                  Delete
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowEditDialog(false)}
                disabled={isProcessing}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isProcessing || !editTitle.trim()}
              >
                {isProcessing ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{item.title}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this item from the list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isProcessing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isProcessing ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
