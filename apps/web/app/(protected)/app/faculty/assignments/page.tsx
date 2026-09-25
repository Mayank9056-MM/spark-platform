'use client';

import { RequireRole } from '@/components/auth/require-role';
import { FacultyAssignmentsCard, useFacultyAssignments } from '@/features/faculty';

export default function FacultyAssignmentsViewPage() {
  const { data: assignments = [], isLoading } = useFacultyAssignments();

  return (
    <RequireRole allow={['faculty', 'hod', 'admin', 'super_admin']}>
      <div className="space-y-6">
        <div>
          <h1 className="font-heading text-foreground text-2xl font-bold tracking-tight">
            Teaching Workload & Allocations
          </h1>
          <p className="text-muted-foreground text-sm">
            Curricular course components, instructional hours, and teaching distribution.
          </p>
        </div>

        <FacultyAssignmentsCard assignments={assignments} isLoading={isLoading} />
      </div>
    </RequireRole>
  );
}
