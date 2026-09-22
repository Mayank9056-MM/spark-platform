'use client';

import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { useEffect } from 'react';

import { AppShell } from './app-shell';

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
  const { isAuthenticated, isLoading, isError } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated && !isError) {
      router.replace(LOGIN_PATH);
    }
  }, [isLoading, isAuthenticated, isError, router]);

  if (isError) {
    return (
      <main className="flex flex-1 items-center justify-center p-4">
        <div className="flex max-w-sm flex-col items-center gap-3 text-center text-sm">
          <p className="font-medium">Something went wrong</p>
          <p className="text-muted-foreground">
            We couldn&apos;t confirm your session. Check your connection and reload the page.
          </p>
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
