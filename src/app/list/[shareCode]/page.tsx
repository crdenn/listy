'use client';

/**
 * List View Page
 * 
 * Displays a single list with all its items.
 * Allows users to add items, claim items, and manage their own contributions.
 * List owners have additional controls for editing and deleting.
 */

import { use, useRef } from 'react';
import { useListByShareCode } from '@/lib/hooks/useList';
import { useItems, useIsListOwner } from '@/lib/hooks/useItems';
import { useListMembers } from '@/lib/hooks/useMembers';
import { useAuth } from '@/contexts/AuthContext';
import { ListHeader } from '@/components/list/ListHeader';
import { ItemCard } from '@/components/item/ItemCard';
import { AddItemForm } from '@/components/item/AddItemForm';
import { Loader2, PackageOpen } from 'lucide-react';
import { AuthDialog } from '@/components/auth/AuthDialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface PageProps {
  params: Promise<{ shareCode: string }>;
}

export default function ListPage({ params }: PageProps) {
  const { shareCode } = use(params);
  const { user, isLoading: authLoading } = useAuth();
  const { list, isLoading: listLoading, error: listError } = useListByShareCode(shareCode);
  
  // Fetch items using the useItems hook
  const { 
    items, 
    isLoading: itemsLoading, 
    addItem,
    updateItem,
    deleteItem,
    claimItem,
    unclaimItem,
    getItemPermissions,
    isAdding 
  } = useItems(list);

  const isAuthenticated = !!user?.isAuthenticated;
  const isOwner = useIsListOwner(list);
  const hideClaimsFromViewer = list?.type === 'gift' && isOwner;
  const canAddItems = isAuthenticated && list ? (list.type === 'potluck' || isOwner) : false;
  const authButtonRef = useRef<HTMLButtonElement>(null);
  const promptAuth = () => authButtonRef.current?.click();
  const { members, isLoading: membersLoading } = useListMembers(list);

  // Show loading state
  if (authLoading || listLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground">Loading list...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (listError || !list) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4 max-w-md mx-auto px-4">
          <h1 className="text-2xl font-bold">List Not Found</h1>
          <p className="text-muted-foreground">
            {listError || "This list doesn't exist or has been deleted."}
          </p>
          <p className="text-sm text-muted-foreground">
            Double-check the link or ask the list owner for a new one.
          </p>
        </div>
      </div>
    );
  }

  // Handle adding an item
  const handleAddItem = async (data: { title: string; description?: string; category?: string; price?: string; imageUrl?: string; productUrl?: string }) => {
    const result = await addItem({
      title: data.title,
      description: data.description,
      category: data.category,
      price: list.type === 'gift' ? data.price : undefined,
      imageUrl: list.type === 'gift' ? data.imageUrl : undefined,
      productUrl: list.type === 'gift' ? data.productUrl : undefined,
    });
    return !!result;
  };

  // Separate claimed and unclaimed items (hide claim state from gift list owner)
  const unclaimedItems = hideClaimsFromViewer
    ? items
    : items.filter(item => !item.claimedBy);
  const claimedItems = hideClaimsFromViewer
    ? []
    : items.filter(item => item.claimedBy);

  return (
    <div className="container max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* List header with title, description, and actions */}
      <ListHeader list={list} isOwner={isOwner} />

      {/* People with access */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">People with access</h2>
          {!membersLoading && (
            <span className="text-xs text-muted-foreground">({members.length})</span>
          )}
        </div>
        {membersLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading collaborators...</span>
          </div>
        ) : members.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Only you so far. Invite others to collaborate to see them here.
          </p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {members.map((member) => {
              const initials = member.displayName?.trim().slice(0, 2).toUpperCase() || '?';
              return (
                <div
                  key={member.id}
                  className="flex items-center gap-3 rounded-md border bg-white/60 px-3 py-2 shadow-sm"
                >
                  <Avatar className="h-9 w-9 border border-primary/20 bg-primary/5 text-primary">
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                  <div className="text-sm">
                    <p className="font-medium leading-none">
                      {member.displayName || 'Collaborator'}
                    </p>
                    <p className="text-xs text-muted-foreground">Has access</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Add item form (hidden from non-owners on gift lists) */}
      {canAddItems && (
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">Add an Item</h2>
          </div>
          <AddItemForm
            onAdd={handleAddItem}
            disabled={isAdding}
            showCategory={list.type === 'potluck'}
            showGiftFields={list.type === 'gift'}
          />
        </section>
      )}

      {/* Items list */}
      <section className="space-y-4">
        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">Items</h2>
          {!isAuthenticated && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-md border bg-muted/50 px-3 py-2 text-sm">
              <p className="text-muted-foreground">
                Sign in to claim items and help avoid duplicate gifts.
              </p>
              <AuthDialog
                trigger={
                  <Button ref={authButtonRef} size="sm" className="w-full sm:w-auto">
                    Sign in to claim
                  </Button>
                }
              />
            </div>
          )}
        </div>
        
        {itemsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
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
                <h3 className="text-sm font-medium text-muted-foreground px-1">
                  Available ({unclaimedItems.length})
                </h3>
                <div className="space-y-2">
                  {unclaimedItems.map((item) => (
                    <ItemCard
                      key={item.id}
                      item={item}
                      list={list}
                      permissions={getItemPermissions(item)}
                      hideClaims={hideClaimsFromViewer}
                      authRequired={!isAuthenticated}
                      onRequireAuth={promptAuth}
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
                <h3 className="text-sm font-medium text-muted-foreground px-1">
                  Claimed ({claimedItems.length})
                </h3>
                <div className="space-y-2">
                  {claimedItems.map((item) => (
                    <ItemCard
                      key={item.id}
                      item={item}
                      list={list}
                      permissions={getItemPermissions(item)}
                      hideClaims={hideClaimsFromViewer}
                      authRequired={!isAuthenticated}
                      onRequireAuth={promptAuth}
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
      </section>
    </div>
  );
}
