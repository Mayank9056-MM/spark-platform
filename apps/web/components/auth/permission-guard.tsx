'use client';

import type { ReactNode } from 'react';

import { type RoleKey, useAuth } from '@/features/auth';
import { hasAnyPermission, hasAnyRole } from '@/features/rbac';

interface PermissionGuardProps {
  require: string | string[];
  /** Optional roles that can satisfy the check unconditionally (defaults to ['super_admin', 'admin']). */
  allowRoles?: readonly RoleKey[];
  children: ReactNode;
  /** Rendered instead of `children` when the check fails. Defaults to nothing. */
  fallback?: ReactNode;
}

/**
 * Conditionally renders UI based on the signed-in user's permissions
 * (`resource:action` keys) or administrator roles (`super_admin`, `admin`).
 * Must be used within the protected shell.
 * UX-only — the backend's authorize() is the actual security boundary.
 */
export function PermissionGuard({
  require,
  allowRoles = ['super_admin', 'admin'],
  children,
  fallback = null,
}: PermissionGuardProps) {
  const { permissions, roles } = useAuth();
  if (allowRoles && allowRoles.length > 0 && hasAnyRole(roles, allowRoles)) {
    return <>{children}</>;
  }
  const required = Array.isArray(require) ? require : [require];
  return hasAnyPermission(permissions, required) ? <>{children}</> : <>{fallback}</>;
}
