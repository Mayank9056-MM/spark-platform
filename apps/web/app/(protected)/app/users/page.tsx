'use client';

import { PlusIcon } from 'lucide-react';
import Link from 'next/link';

import { PermissionGuard } from '@/components/auth/permission-guard';
import { ModuleNotConnected } from '@/components/erp/module-not-connected';
import { ModuleShell } from '@/components/erp/module-shell';
import { Button } from '@/components/ui/button';

export default function UsersPage() {
  return (
    <ModuleShell
      title="User Management"
      description="User accounts across the institution."
      actions={
        <PermissionGuard require="user:create">
          <Button size="sm" render={<Link href="/app/users/new" />}>
            <PlusIcon aria-hidden="true" />
            Create user
          </Button>
        </PermissionGuard>
      }
    >
      <ModuleNotConnected resource="Users" />
    </ModuleShell>
  );
}
