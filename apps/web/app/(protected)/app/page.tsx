'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { Spinner } from '@/components/ui/spinner';
import { resolveDefaultRoute, useAuth } from '@/features/auth';

/**
 * /app has no content of its own — it only resolves to the signed-in
 * user's default landing route. By the time this renders,
 * ProtectedBoundary has already guaranteed an authenticated session,
 * so roles are available.
 */
export default function AppRootPage() {
  const router = useRouter();
  const { roles } = useAuth();

  useEffect(() => {
    router.replace(resolveDefaultRoute(roles.map((role) => role.key)));
  }, [roles, router]);

  return (
    <div
      role="status"
      className="flex min-h-[40vh] flex-1 flex-col items-center justify-center gap-3 text-center"
    >
      <Spinner aria-hidden="true" className="text-primary size-6" />
      <p className="text-muted-foreground text-xs font-medium">
        Resolving your institutional workspace…
      </p>
    </div>
  );
}
