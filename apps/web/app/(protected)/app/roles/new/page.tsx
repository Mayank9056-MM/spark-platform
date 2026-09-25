'use client';

import { PageHeader } from '@/components/erp/page-header';
import { RoleForm } from '@/features/roles/components/role-form';

export default function NewRolePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Create Custom Role"
        description="Provision a new institutional authorization role for specialized responsibilities."
      />
      <RoleForm mode="create" />
    </div>
  );
}
