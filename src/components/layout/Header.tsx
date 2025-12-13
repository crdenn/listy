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
  const homeHref = user?.isAuthenticated ? '/my-lists' : '/';

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between px-4 mx-auto max-w-4xl">
        <Link 
          href={homeHref} 
          className="flex items-center gap-2 font-semibold text-lg hover:opacity-80 transition-opacity"
        >
          <ListTodo className="h-6 w-6 text-primary" />
          <span className="hidden sm:inline">Listy</span>
          <span className="sm:hidden">Lists</span>
        </Link>
        
        <UserMenu />
      </div>
    </header>
  );
}
