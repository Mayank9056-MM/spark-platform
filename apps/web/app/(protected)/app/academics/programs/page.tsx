'use client';

import { RequirePermission } from '@/components/auth/require-permission';
import { PageHeader } from '@/components/erp/page-header';
import { ProgramsTable } from '@/features/academics/components/programs-table';

export default function ProgramsPage() {
  return (
    <RequirePermission require="program:read">
      <div className="space-y-4">
        <PageHeader
          title="Degree & Diploma Programs"
          description="Formal educational degree curricula registered under institutional academic departments."
        />
        <ProgramsTable />
      </div>
    </RequirePermission>
  );
}
