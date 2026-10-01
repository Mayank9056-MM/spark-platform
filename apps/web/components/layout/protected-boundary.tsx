'use client';

import { AlertCircleIcon } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { useEffect } from 'react';

import { AppShell } from './app-shell';

import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { LOGIN_PATH, useAuth } from '@/features/auth';

/**
 * The single owner of the authenticated/unauthenticated decision for
 * everything under /app. Mounted once, from (protected)/app/layout.tsx,
 * inside <AuthProvider>.
 *
 * - While the bootstrap query is unresolved: a minimal loading state,
 *   never the protected content itself.
 * - Unauthenticated (401 from /auth/me): redirect to /login. The effect
 *   fires once per transition — nothing on the /login side can bounce
 *   back here except a genuinely new sign-in, so this cannot loop.
 * - A real error (5xx, network, timeout): an error state, never
 *   silently treated as "logged out" or silently treated as "ok".
 * - Authenticated: render the application shell.
 */
export function ProtectedBoundary({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, isLoading, isError, refreshCurrentUser } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated && !isError) {
      router.replace(LOGIN_PATH);
    }
  }, [isLoading, isAuthenticated, isError, router]);

  if (isError) {
    return (
      <main className="flex flex-1 items-center justify-center p-4">
        <div className="flex max-w-sm flex-col items-center gap-4 text-center text-sm">
          <AlertCircleIcon className="text-destructive size-6" aria-hidden="true" />
          <div className="space-y-1">
            <p className="text-foreground font-semibold">Something went wrong</p>
            <p className="text-muted-foreground text-xs">
              We couldn&apos;t confirm your session. Check your connection and try again.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="default"
              size="sm"
              className="h-8 text-xs"
              onClick={refreshCurrentUser}
            >
              Retry
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              render={<Link href={LOGIN_PATH}>Go to Sign In</Link>}
            />
          </div>
        </div>
      </main>
    );
  }

  if (isLoading || !isAuthenticated) {
    return (
      <main className="flex flex-1 items-center justify-center p-4">
        <div role="status" className="flex items-center gap-2 text-sm">
          <Spinner aria-hidden="true" />
          <span>Loading…</span>
        </div>
      </main>
    );
  }

  return <AppShell>{children}</AppShell>;
}
