'use client';

import { PageHeader } from '@/components/erp/page-header';
import { DepartmentsTable } from '@/features/academics/components/departments-table';

export default function DepartmentsPage() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Departments"
        description="Institutional academic divisions and administrative structures for HVPM COET."
      />
      <DepartmentsTable />
    </div>
  );
}
