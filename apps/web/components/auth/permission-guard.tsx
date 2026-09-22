'use client';

import type { ReactNode } from 'react';

import { useAuth } from '@/features/auth';
import { hasAnyPermission } from '@/features/rbac';

interface PermissionGuardProps {
  require: string | string[];
  children: ReactNode;
  /** Rendered instead of `children` when the check fails. Defaults to nothing. */
  fallback?: ReactNode;
}

/**
 * Conditionally renders UI based on the signed-in user's permissions
 * (`resource:action` keys). Must be used within the protected shell.
 * UX-only — the backend's authorize() is the actual security boundary.
 */
export function PermissionGuard({ require, children, fallback = null }: PermissionGuardProps) {
  const { permissions } = useAuth();
  const required = Array.isArray(require) ? require : [require];
  return hasAnyPermission(permissions, required) ? children : fallback;
}
