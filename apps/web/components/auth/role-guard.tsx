'use client';

import type { ReactNode } from 'react';

import { type RoleKey, useAuth } from '@/features/auth';
import { hasAnyRole } from '@/features/rbac';

interface RoleGuardProps {
  allow: RoleKey[];
  children: ReactNode;
  /** Rendered instead of `children` when the check fails. Defaults to nothing. */
  fallback?: ReactNode;
}

/**
 * Conditionally renders UI based on the signed-in user's roles. Must be
 * used within the protected shell (inside <AuthProvider>). UX-only —
 * never a substitute for the backend's own authorization.
 */
export function RoleGuard({ allow, children, fallback = null }: RoleGuardProps) {
  const { roles } = useAuth();
  return hasAnyRole(roles, allow) ? children : fallback;
}
