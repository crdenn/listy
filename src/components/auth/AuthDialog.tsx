'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { LogIn, Mail, UserPlus, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';

type AuthMode = 'signin' | 'signup';

interface AuthDialogProps {
  trigger: React.ReactNode;
  onComplete?: () => void;
}

export function AuthDialog({ trigger, onComplete }: AuthDialogProps) {
  const {
    signInWithGoogle,
    signInWithEmail,
    registerWithEmail,
    error: authError,
    clearError,
  } = useAuth();
  
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const resetForm = useCallback(() => {
    setEmail('');
    setPassword('');
    setDisplayName('');
    setLocalError(null);
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    clearError();
    setOpen(false);
  }, [clearError, resetForm]);

  const handleGoogleSignIn = async () => {
    setLocalError(null);
    setIsSubmitting(true);
    try {
      await signInWithGoogle();
      handleClose();
      onComplete?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to sign in with Google.';
      setLocalError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setIsSubmitting(true);

    try {
      if (mode === 'signin') {
        await signInWithEmail(email.trim(), password);
      } else {
        await registerWithEmail(email.trim(), password, displayName.trim() || undefined);
      }

      handleClose();
      onComplete?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setLocalError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleMode = () => {
    setMode((prev) => (prev === 'signin' ? 'signup' : 'signin'));
    setLocalError(null);
    clearError();
  };

  const errorMessage = useMemo(() => localError || authError, [localError, authError]);

  useEffect(() => {
    if (!open) {
      resetForm();
      clearError();
    }
  }, [open, clearError, resetForm]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent
        className="sm:max-w-[440px]"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>
            {mode === 'signin' ? 'Sign in' : 'Create an account'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'signin'
              ? 'Access your saved lists on any device.'
              : 'Create an account to save and sync your lists.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
        <Button
          type="button"
          className="w-full justify-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
          onClick={handleGoogleSignIn}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Signing in...
            </>
          ) : (
            <>
              <LogIn className="h-4 w-4" />
              Continue with Google
            </>
          )}
        </Button>

          <div className="relative">
            <Separator />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="bg-background px-2 text-xs text-muted-foreground">or</span>
            </div>
          </div>

          <form className="space-y-3" onSubmit={handleEmailSubmit}>
            {mode === 'signup' && (
              <div className="space-y-1">
                <Label htmlFor="displayName">Name</Label>
                <Input
                  id="displayName"
                  placeholder="Your name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  autoComplete="name"
                  disabled={isSubmitting}
                />
              </div>
            )}

            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                disabled={isSubmitting}
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                disabled={isSubmitting}
                required
              />
            </div>

            {errorMessage && (
              <p className="text-sm text-destructive">{errorMessage}</p>
            )}

            <Button
              type="submit"
              className="w-full gap-2"
              disabled={isSubmitting || !email.trim() || !password}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {mode === 'signin' ? 'Signing in...' : 'Creating account...'}
                </>
              ) : mode === 'signin' ? (
                <>
                  <LogIn className="h-4 w-4" />
                  Sign in with email
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  Create account
                </>
              )}
            </Button>
          </form>

          <Button
            type="button"
            variant="ghost"
            className="w-full text-sm"
            onClick={toggleMode}
            disabled={isSubmitting}
          >
            {mode === 'signin'
              ? "Don't have an account? Create one"
              : 'Already have an account? Sign in'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
