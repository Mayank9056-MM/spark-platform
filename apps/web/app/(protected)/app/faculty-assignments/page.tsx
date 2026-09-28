'use client';

import { RequireRole } from '@/components/auth/require-role';
import { PageHeader } from '@/components/erp/page-header';
import { FacultyAssignmentsTable } from '@/features/faculty-assignments';

export default function FacultyAssignmentsPage() {
  return (
    <RequireRole allow={['admin', 'super_admin', 'principal', 'hod']}>
      <div className="space-y-4">
        <PageHeader
          title="Faculty Assignments"
          description="Faculty subject teaching allocations, academic workload distribution, and lecture component assignments."
        />
        <FacultyAssignmentsTable />
      </div>
    </RequireRole>
  );
}
