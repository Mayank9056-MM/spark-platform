'use client';

import { RequirePermission } from '@/components/auth/require-permission';
import { PageHeader } from '@/components/erp/page-header';
import { PermissionsTable } from '@/features/permissions/components/permissions-table';

export default function PermissionsPage() {
  return (
    <RequirePermission require="permission:read">
      <div className="space-y-4">
        <PageHeader
          title="Permission Catalog"
          description="Comprehensive inventory of platform capabilities, resource grants, and security primitives."
        />
        <PermissionsTable />
      </div>
    </RequirePermission>
  );
}
