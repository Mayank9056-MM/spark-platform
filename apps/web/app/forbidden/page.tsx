'use client';

import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LOGIN_PATH, resolveDefaultRoute, useCurrentUser } from '@/features/auth';

/**
 * Authenticated + insufficient permission. Never a stand-in for
 * /login: 401 → /login, 403 → /forbidden, decided by whatever
 * triggered the redirect, not this page. Outside the protected shell
 * (no AuthProvider here), so it reads the session via useCurrentUser()
 * directly — served from the shared TanStack Query cache if it's
 * already been fetched elsewhere in this visit.
 */
export default function ForbiddenPage() {
  const router = useRouter();
  const currentUser = useCurrentUser();

  const dashboardHref =
    currentUser.data !== undefined
      ? resolveDefaultRoute(currentUser.data.roles.map((role) => role.key))
      : LOGIN_PATH;

  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>403 — Access denied</CardTitle>
          <CardDescription>You do not have permission to access this resource.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            type="button"
            size="lg"
            onClick={() => {
              router.push(dashboardHref);
            }}
          >
            {currentUser.data !== undefined ? 'Return to dashboard' : 'Return to sign in'}
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
