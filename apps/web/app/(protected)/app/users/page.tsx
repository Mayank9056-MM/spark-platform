'use client';

import { RequirePermission } from '@/components/auth/require-permission';
import { PageHeader } from '@/components/erp/page-header';
import { UsersTable } from '@/features/users/components/users-table';

export default function UsersPage() {
  return (
    <RequirePermission require="user:read">
      <div className="space-y-4">
        <PageHeader
          title="User Management"
          description="Institutional user accounts, role allocations, and identity governance for HVPM COET."
        />
        <UsersTable />
      </div>
    </RequirePermission>
  );
}
