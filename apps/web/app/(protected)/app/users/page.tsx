'use client';

import { PageHeader } from '@/components/erp/page-header';
import { UsersTable } from '@/features/users/components/users-table';

export default function UsersPage() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="User Management"
        description="Institutional user accounts, role allocations, and identity governance for HVPM COET."
      />
      <UsersTable />
    </div>
  );
}
