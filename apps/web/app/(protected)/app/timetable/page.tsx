'use client';

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
    <EnterpriseListView
      title="Timetable"
      description="Scheduled lectures, lab sessions, and classroom allocations across departments."
      resourceName="Timetable Entries"
      columns={TIMETABLE_COLUMNS}
    />
  );
}
