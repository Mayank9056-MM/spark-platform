'use client';

import { PageHeader } from '@/components/erp/page-header';
import { RolesTable } from '@/features/roles/components/roles-table';

export default function RolesPage() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Role Management"
        description="System roles, security policies, and functional capability definitions."
      />
      <RolesTable />
    </div>
  );
}
