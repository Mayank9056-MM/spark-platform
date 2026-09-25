'use client';

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
    <EnterpriseListView
      title="Faculty Assignments"
      description="Faculty subject teaching allocations, academic workload distribution, and lecture component assignments."
      resourceName="Faculty Assignments"
      columns={FACULTY_ASSIGNMENT_COLUMNS}
    />
  );
}
