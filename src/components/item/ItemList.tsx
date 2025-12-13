'use client';

/**
 * Item List Component
 * 
 * Renders all items in a list with the add item form.
 * Handles item operations and passes them to individual ItemCards.
 */

import { ListItem, List, UserIdentity } from '@/types';
import { ItemCard } from './ItemCard';
import { AddItemForm } from './AddItemForm';
import { useAddItem, useUpdateItem, useDeleteItem, useClaimItem, useUnclaimItem } from '@/lib/hooks';
import { PackageOpen } from 'lucide-react';

interface ItemListProps {
  items: ListItem[];
  list: List;
  currentUser: UserIdentity;
  isOwner: boolean;
}

export function ItemList({ items, list, currentUser, isOwner }: ItemListProps) {
  const { addItem, isAdding } = useAddItem();
  const { updateItem, isUpdating } = useUpdateItem();
  const { deleteItem, isDeleting } = useDeleteItem();
  const { claimItem, isClaiming } = useClaimItem();
  const { unclaimItem, isUnclaiming } = useUnclaimItem();

  const handleAddItem = async (data: { title: string; description?: string }) => {
    return await addItem(list.id, {
      ...data,
      createdBy: currentUser,
    });
  };

  const handleUpdateItem = async (itemId: string, data: { title: string; description?: string }) => {
    return await updateItem(list.id, itemId, data);
  };

  const handleDeleteItem = async (itemId: string) => {
    return await deleteItem(list.id, itemId);
  };

  const handleClaimItem = async (itemId: string) => {
    return await claimItem(list.id, itemId, currentUser);
  };

  const handleUnclaimItem = async (itemId: string) => {
    return await unclaimItem(list.id, itemId);
  };

  // Separate claimed and unclaimed items
  const unclaimedItems = items.filter(item => !item.claimedBy);
  const claimedItems = items.filter(item => item.claimedBy);

  return (
    <div className="space-y-6">
      {/* Add Item Form */}
      <AddItemForm onAdd={handleAddItem} disabled={isAdding} />

      {/* Items */}
      {items.length === 0 ? (
        <div className="text-center py-12">
          <PackageOpen className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground mb-1">
            No items yet
          </h3>
          <p className="text-sm text-muted-foreground">
            Add the first item to get started!
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Unclaimed Items */}
          {unclaimedItems.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-medium text-muted-foreground px-1">
                Available ({unclaimedItems.length})
              </h2>
              <div className="space-y-2">
                {unclaimedItems.map((item) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    list={list}
                    currentUser={currentUser}
                    isOwner={isOwner}
                    onClaim={handleClaimItem}
                    onUnclaim={handleUnclaimItem}
                    onUpdate={handleUpdateItem}
                    onDelete={handleDeleteItem}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Claimed Items */}
          {claimedItems.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-medium text-muted-foreground px-1">
                Claimed ({claimedItems.length})
              </h2>
              <div className="space-y-2">
                {claimedItems.map((item) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    list={list}
                    currentUser={currentUser}
                    isOwner={isOwner}
                    onClaim={handleClaimItem}
                    onUnclaim={handleUnclaimItem}
                    onUpdate={handleUpdateItem}
                    onDelete={handleDeleteItem}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
