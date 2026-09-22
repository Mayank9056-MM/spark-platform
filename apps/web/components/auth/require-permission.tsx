'use client';

import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { useEffect } from 'react';

import { Spinner } from '@/components/ui/spinner';
import { FORBIDDEN_PATH, useAuth } from '@/features/auth';
import { hasAnyPermission } from '@/features/rbac';

interface RequirePermissionProps {
  require: string | string[];
  children: ReactNode;
}

/** Permission-based counterpart to RequireRole. See that file's comment. */
export function RequirePermission({ require, children }: RequirePermissionProps) {
  const router = useRouter();
  const { permissions } = useAuth();
  const required = Array.isArray(require) ? require : [require];
  const allowed = hasAnyPermission(permissions, required);

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
