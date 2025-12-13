'use client';

/**
 * Item List Component
 *
 * Renders all items in a list with the add item form.
 * Handles item operations and passes them to individual ItemCards.
 */

import { List } from '@/types';
import { ItemCard } from './ItemCard';
import { AddItemForm } from './AddItemForm';
import { useItems } from '@/lib/hooks';
import { PackageOpen } from 'lucide-react';

interface ItemListProps {
  list: List;
}

export function ItemList({ list }: ItemListProps) {
  const {
    items,
    addItem,
    updateItem,
    deleteItem,
    claimItem,
    unclaimItem,
    getItemPermissions,
  } = useItems(list);

  const handleAddItem = async (data: { title: string; description?: string; category?: string; price?: string; imageUrl?: string; productUrl?: string }) => {
    const result = await addItem(data);
    return !!result;
  };

  // Separate claimed and unclaimed items
  const unclaimedItems = items.filter(item => !item.claimedBy);
  const claimedItems = items.filter(item => item.claimedBy);

  return (
    <div className="space-y-6">
      {/* Add Item Form */}
      <AddItemForm onAdd={handleAddItem} disabled={false} />

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
                    permissions={getItemPermissions(item)}
                    onClaim={() => claimItem(item.id)}
                    onUnclaim={() => unclaimItem(item.id)}
                    onUpdate={(updates) => updateItem(item.id, updates)}
                    onDelete={() => deleteItem(item.id)}
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
                    permissions={getItemPermissions(item)}
                    onClaim={() => claimItem(item.id)}
                    onUnclaim={() => unclaimItem(item.id)}
                    onUpdate={(updates) => updateItem(item.id, updates)}
                    onDelete={() => deleteItem(item.id)}
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
