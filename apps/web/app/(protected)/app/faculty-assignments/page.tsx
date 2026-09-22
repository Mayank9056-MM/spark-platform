'use client';

import { ModuleNotConnected } from '@/components/erp/module-not-connected';
import { ModuleShell } from '@/components/erp/module-shell';

export default function FacultyAssignmentsPage() {
  return (
    <ModuleShell
      title="Faculty Assignments"
      description="Faculty assigned to teach subject offerings and their components."
    >
      <ModuleNotConnected resource="Faculty assignments" />
    </ModuleShell>
  );
}
