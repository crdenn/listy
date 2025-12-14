'use client';

/**
 * Application Header Component
 * 
 * Displays the app logo/title and user menu.
 * Responsive design with mobile-friendly navigation.
 */

import Link from 'next/link';
import { ListTodo } from 'lucide-react';
import { UserMenu } from './UserMenu';
import { useAuth } from '@/contexts/AuthContext';

export function Header() {
  const { user } = useAuth();
  // Authenticated users still land on the root URL, which renders My Lists
  const homeHref = '/';

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-primary text-primary-foreground shadow-sm">
      <div className="container flex h-14 items-center justify-between px-4 mx-auto max-w-4xl">
        <Link
          href={homeHref}
          className="flex items-center gap-2 font-semibold text-lg hover:opacity-90 transition-opacity"
        >
          <ListTodo className="h-6 w-6 text-primary-foreground" />
          <span className="hidden sm:inline text-primary-foreground">Listy</span>
          <span className="sm:hidden text-primary-foreground">Lists</span>
        </Link>
        
        <UserMenu />
      </div>
    </header>
  );
}
