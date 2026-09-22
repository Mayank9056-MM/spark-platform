'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { createContext, type ReactNode, useEffect } from 'react';

import { LOGIN_PATH } from '../constants';
import { CURRENT_USER_QUERY_KEY, useCurrentUser } from '../hooks/use-current-user';
import { useLogout } from '../hooks/use-logout';
import { isUnauthenticatedError } from '../lib/auth-status';
import type { CurrentUser } from '../schemas/session.schema';

import { setSessionExpiredHandler } from '@/lib/auth/session-expiry';
import { sessionState } from '@/lib/auth/session-state';

export interface AuthContextValue {
  currentUser: CurrentUser | undefined;
  isAuthenticated: boolean;
  isLoading: boolean;
  isError: boolean;
  roles: CurrentUser['roles'];
  permissions: CurrentUser['permissions'];
  logout: () => void;
  isLoggingOut: boolean;
  refreshCurrentUser: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Scoped to the protected `/app/*` subtree (mounted from
 * (protected)/app/layout.tsx), not the whole application — public pages
 * that need to know about a session (the /login "already signed in"
 * check, /forbidden) call useCurrentUser() directly instead of this
 * provider; see that hook's comment for why that's safe.
 *
 * TanStack Query remains the source of truth. This component only
 * derives convenience booleans and wires two side effects: marking the
 * session flag on success, and reacting if the session expires
 * mid-visit (a background 401 whose refresh attempt itself failed).
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const query = useCurrentUser();
  const logoutMutation = useLogout();

  useEffect(() => {
    if (query.isSuccess) {
      sessionState.markSignedIn();
    }
  }, [query.isSuccess]);

  useEffect(
    () =>
      setSessionExpiredHandler(() => {
        queryClient.removeQueries({ queryKey: CURRENT_USER_QUERY_KEY });
        router.replace(LOGIN_PATH);
      }),
    [queryClient, router],
  );

  const value: AuthContextValue = {
    currentUser: query.data,
    isAuthenticated: query.isSuccess,
    isLoading: query.isLoading,
    isError: query.isError && !isUnauthenticatedError(query.error),
    roles: query.data?.roles ?? [],
    permissions: query.data?.permissions ?? [],
    isLoggingOut: logoutMutation.isPending,
    logout: () => {
      if (logoutMutation.isPending) {
        return;
      }
      logoutMutation.mutate(undefined, {
        // Fires whether the call succeeded or failed. Logout fails
        // closed: even if the network call itself errors, the user's
        // intent was to leave, so local trust in the session is
        // dropped and they're sent to /login either way — the backend
        // still owns actual cookie invalidation.
        onSettled: () => {
          sessionState.clear();
          queryClient.removeQueries({ queryKey: CURRENT_USER_QUERY_KEY });
          router.replace(LOGIN_PATH);
        },
      });
    },
    refreshCurrentUser: () => {
      void query.refetch();
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
