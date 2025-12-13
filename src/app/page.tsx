'use client';

/**
 * Home Page
 * 
 * Landing page that allows users to:
 * - Create a new list
 * - Join an existing list via share code
 * - View recent lists (for authenticated users)
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Gift, Users, ListPlus, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CreateListDialog } from '@/components/list/CreateListDialog';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { List } from '@/types';
import { getListByShareCode } from '@/lib/firebase/firestore';
import Link from 'next/link';
import { AuthDialog } from '@/components/auth/AuthDialog';

export default function HomePage() {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [shareCode, setShareCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const handleCreated = (list: List) => {
    toast({
      title: 'List created!',
      description: 'Your new list is ready to share.',
    });
    router.push(`/list/${list.shareCode}`);
  };

  const handleJoinList = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!shareCode.trim()) return;
    
    setIsJoining(true);
    try {
      const list = await getListByShareCode(shareCode.trim());
      if (list) {
        router.push(`/list/${list.shareCode}`);
      } else {
        toast({
          title: 'List not found',
          description: 'Please check the share code and try again.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 sm:py-12">
      {/* Hero Section */}
      <div className="text-center max-w-3xl mx-auto mb-12">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
          Listy
        </h1>
        <p className="text-lg text-muted-foreground mb-8">
          Create gift wishlists, potluck sign-ups, and more. Share with anyone—no account required.
        </p>
        
        {/* Quick Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          {user?.isAuthenticated ? (
            <CreateListDialog onCreated={handleCreated}>
              <Button size="lg" className="gap-2 w-full sm:w-auto">
                <ListPlus className="h-5 w-5" />
                Create a List
              </Button>
            </CreateListDialog>
          ) : (
            <AuthDialog
              trigger={
                <Button size="lg" className="gap-2 w-full sm:w-auto">
                  <ListPlus className="h-5 w-5" />
                  Sign in to Create
                </Button>
              }
            />
          )}
          
          {user?.isAuthenticated && (
            <Link href="/my-lists">
              <Button variant="outline" size="lg" className="gap-2 w-full sm:w-auto">
                My Lists
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Join List Section */}
      <Card className="max-w-md mx-auto mb-12">
        <CardHeader>
          <CardTitle className="text-lg">Have a share code?</CardTitle>
          <CardDescription>
            Enter the code to join an existing list
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleJoinList} className="flex gap-2">
            <Input
              value={shareCode}
              onChange={(e) => setShareCode(e.target.value)}
              placeholder="Enter share code..."
              disabled={isJoining}
              className="flex-1"
            />
            <Button type="submit" disabled={!shareCode.trim() || isJoining}>
              {isJoining ? 'Joining...' : 'Join'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Features Section */}
      <div className="grid sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <div className="h-12 w-12 rounded-lg bg-purple-100 flex items-center justify-center mb-4">
              <Gift className="h-6 w-6 text-purple-600" />
            </div>
            <CardTitle>Gift Lists</CardTitle>
            <CardDescription>
              Perfect for birthdays, holidays, and special occasions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-purple-600">✓</span>
                Claims are hidden from the gift recipient
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-600">✓</span>
                Prevent duplicate gifts automatically
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-600">✓</span>
                Share with friends and family
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center mb-4">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <CardTitle>Potluck & Event Lists</CardTitle>
            <CardDescription>
              Coordinate who's bringing what to group events
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-blue-600">✓</span>
                Everyone can see who's bringing what
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600">✓</span>
                Easy sign-up for any item
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600">✓</span>
                Great for parties, picnics, and team events
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <footer className="text-center text-sm text-muted-foreground mt-16 pb-8">
        <p>Sign in with Google or email to save and manage your lists anywhere.</p>
      </footer>
    </div>
  );
}
