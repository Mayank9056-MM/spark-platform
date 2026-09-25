'use client';

import { RequireRole } from '@/components/auth/require-role';
import { EnterpriseListView } from '@/components/erp/enterprise-list-view';

const FACULTY_ASSIGNMENT_COLUMNS = [
  { header: 'Faculty Member' },
  { header: 'Department' },
  { header: 'Subject / Code' },
  { header: 'Component (Th/Pr)' },
  { header: 'Academic Year' },
  { header: 'Status' },
] as const;

export default function FacultyAssignmentsPage() {
  return (
    <RequireRole allow={['admin', 'super_admin', 'principal', 'hod']}>
      <EnterpriseListView
        title="Faculty Assignments"
        description="Faculty subject teaching allocations, academic workload distribution, and lecture component assignments."
        resourceName="Faculty Assignments"
        columns={FACULTY_ASSIGNMENT_COLUMNS}
      />
    </RequireRole>
  );
}
