import { useQuery } from '@tanstack/react-query';

import { getCurrentUser } from '../api/get-current-user';
import { isUnauthenticatedError } from '../lib/auth-status';

/** Query key for the current-user bootstrap. Exported so logout/callers can target it directly. */
export const CURRENT_USER_QUERY_KEY = ['auth', 'me'] as const;

/**
 * The single source of truth for "who is signed in", backed by
 * GET /auth/me. Safe to call from anywhere QueryClientProvider is
 * mounted (the root layout) — not only inside the protected shell —
 * since public pages (/login's "already signed in" check, /forbidden)
 * also need to know whether a session already exists. useAuth() is the
 * higher-level context built on top of this for the protected subtree.
 */
export function useCurrentUser() {
  return useQuery({
    queryKey: CURRENT_USER_QUERY_KEY,
    queryFn: getCurrentUser,
    staleTime: 60_000,
    // A 401 means "not signed in" — retrying just delays the answer.
    // Anything else (network, 5xx) still gets the query client's
    // default retry budget.
    retry: (failureCount, error) => {
      if (isUnauthenticatedError(error)) {
        return false;
      }
      return failureCount < 2;
    },
  });
}
