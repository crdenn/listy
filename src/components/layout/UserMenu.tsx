'use client';

/**
 * User Menu Component
 * 
 * Displays user avatar and provides access to account actions.
 * Shows different options for authenticated vs anonymous users.
 */

import { LogIn, LogOut, ListPlus } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';
import { AuthDialog } from '@/components/auth/AuthDialog';

export function UserMenu() {
  const { user, isLoading, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  // Show loading state while auth initializes
  if (isLoading) {
    return (
      <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
    );
  }

  // Show sign in button for anonymous users
  if (!user?.isAuthenticated) {
    return (
      <AuthDialog
        trigger={
          <Button
            variant="outline"
            size="sm"
            className="gap-2 border-primary text-primary bg-background hover:bg-background"
          >
            <LogIn className="h-4 w-4" />
            <span className="hidden sm:inline">
              Sign in
            </span>
          </Button>
        }
      />
    );
  }

  // Show user menu for authenticated users
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            {user.photoURL && (
              <AvatarImage src={user.photoURL} alt={user.displayName} />
            )}
            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
              {getInitials(user.displayName)}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.displayName}</p>
            {user.email && (
              <p className="text-xs leading-none text-muted-foreground">
                {user.email}
              </p>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/my-lists" className="cursor-pointer">
            <ListPlus className="mr-2 h-4 w-4" />
            My Lists
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={handleSignOut}
          className="cursor-pointer text-red-600 focus:text-red-600"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
