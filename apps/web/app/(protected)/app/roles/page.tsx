'use client';

import { RequirePermission } from '@/components/auth/require-permission';
import { PageHeader } from '@/components/erp/page-header';
import { RolesTable } from '@/features/roles/components/roles-table';

export default function RolesPage() {
  return (
    <RequirePermission require="role:read">
      <div className="space-y-4">
        <PageHeader
          title="Role Management"
          description="System roles, security policies, and functional capability definitions."
        />
        <RolesTable />
      </div>
    </RequirePermission>
  );
}
