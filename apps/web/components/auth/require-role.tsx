'use client';

import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { useEffect } from 'react';

import { Spinner } from '@/components/ui/spinner';
import { FORBIDDEN_PATH, type RoleKey, useAuth } from '@/features/auth';
import { hasAnyRole } from '@/features/rbac';

interface RequireRoleProps {
  allow: RoleKey[];
  children: ReactNode;
}

/**
 * Route-level role gate for role-specific application areas. Mounted
 * from a segment's layout.tsx, inside the already-authenticated
 * ProtectedBoundary/AppShell tree — this does not authenticate, only
 * authorizes, and only for UX: the backend's authorize() remains the
 * actual security boundary regardless of what this component decides.
 *
 * Distinct from RoleGuard: RoleGuard hides/shows inline UI fragments
 * and never navigates. This gates an entire route and redirects to
 * /forbidden on failure, per the routing spec.
 */
export function RequireRole({ allow, children }: RequireRoleProps) {
  const router = useRouter();
  const { roles } = useAuth();
  const allowed = hasAnyRole(roles, allow);

  useEffect(() => {
    if (!allowed) {
      router.replace(FORBIDDEN_PATH);
    }
  }, [allowed, router]);

  if (!allowed) {
    return (
      <div role="status" className="flex items-center gap-2 text-sm">
        <Spinner aria-hidden="true" />
        <span>Redirecting…</span>
      </div>
    );
  }

  return children;
}
