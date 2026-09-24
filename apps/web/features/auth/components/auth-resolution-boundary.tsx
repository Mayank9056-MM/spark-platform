'use client';

import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { useEffect } from 'react';

import { useCurrentUser } from '../hooks/use-current-user';
import { isUnauthenticatedError } from '../lib/auth-status';
import { resolveDefaultRoute } from '../lib/route-resolution';

import { AuthResolutionShell } from './auth-resolution-shell';

interface AuthResolutionBoundaryProps {
  children: ReactNode;
}

/**
 * Route-level resolution boundary for /login. Wraps the actual
 * LoginForm so it is never mounted except in the one branch that has
 * genuinely confirmed the visitor is unauthenticated.
 *
 * Because the cross-origin cookie architecture means no server/proxy
 * signal exists (see the auth-flash audit), this cannot become a true
 * request-level check — the query still has to run client-side. What
 * changes is WHAT renders while it's in flight: previously the full
 * LoginForm rendered immediately and was replaced only after the
 * fact; now nothing that looks like the login page renders until the
 * state is known.
 *
 * Reuses the existing useCurrentUser() query (same queryKey the old
 * LoginForm called directly) — TanStack Query dedupes this, so this
 * introduces zero additional network requests.
 *
 * Four explicit states, derived from the query's own isSuccess/isError
 * rather than isLoading/isPending, so the logic doesn't depend on
 * which of those two the installed TanStack Query minor version
 * favors:
 *
 *   - neither success nor error yet   → pending  → shell (spinner)
 *   - isSuccess                        → authenticated → redirect,
 *                                         shell stays up until the
 *                                         navigation commits
 *   - isError && isUnauthenticatedError → unauthenticated → children
 *   - isError && !isUnauthenticatedError → genuine error (5xx/network)
 *                                          → shell (retry), children
 *                                          NEVER render
 */
export function AuthResolutionBoundary({ children }: AuthResolutionBoundaryProps) {
  const router = useRouter();
  const currentUser = useCurrentUser();

  const isConfirmedUnauthenticated =
    currentUser.isError && isUnauthenticatedError(currentUser.error);
  const isGenuineError = currentUser.isError && !isUnauthenticatedError(currentUser.error);

  useEffect(() => {
    if (currentUser.isSuccess) {
      router.replace(resolveDefaultRoute(currentUser.data.roles.map((role) => role.key)));
    }
  }, [currentUser.isSuccess, currentUser.data, router]);

  if (isGenuineError) {
    return (
      <AuthResolutionShell
        status="error"
        onRetry={() => {
          void currentUser.refetch();
        }}
      />
    );
  }

  if (isConfirmedUnauthenticated) {
    return children;
  }

  // Covers the pending state AND the brief window after isSuccess
  // where the redirect effect has fired but router.replace() hasn't
  // committed yet — the form must not flash in that gap either.
  return <AuthResolutionShell status="pending" />;
}
