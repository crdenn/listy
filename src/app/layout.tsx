import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { Toaster } from '@/components/ui/toaster';
import { Header } from '@/components/layout';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Listy',
  description: 'Create and share gift lists, potluck sign-ups, and more with friends and family.',
  keywords: ['gift list', 'wish list', 'potluck', 'event planning', 'collaborative'],
};

/**
 * Root Layout
 * 
 * Wraps the entire application with necessary providers:
 * - AuthProvider: Manages user authentication state
 * - Toaster: Shows toast notifications
 * - Header: App navigation (rendered on all pages)
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-1">
              {children}
            </main>
          </div>
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
