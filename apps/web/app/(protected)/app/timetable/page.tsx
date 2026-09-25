'use client';

import { RequireRole } from '@/components/auth/require-role';
import { EnterpriseListView } from '@/components/erp/enterprise-list-view';

const TIMETABLE_COLUMNS = [
  { header: 'Slot & Day' },
  { header: 'Subject / Code' },
  { header: 'Program & Semester' },
  { header: 'Assigned Faculty' },
  { header: 'Classroom / Lab' },
  { header: 'Schedule Status' },
] as const;

export default function TimetablePage() {
  return (
    <RequireRole allow={['admin', 'super_admin', 'principal', 'hod']}>
      <EnterpriseListView
        title="Timetable"
        description="Scheduled lectures, lab sessions, and classroom allocations across departments."
        resourceName="Timetable Entries"
        columns={TIMETABLE_COLUMNS}
      />
    </RequireRole>
  );
}
