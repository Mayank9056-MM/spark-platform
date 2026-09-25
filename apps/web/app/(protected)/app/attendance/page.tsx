'use client';

import { EnterpriseListView } from '@/components/erp/enterprise-list-view';

const ATTENDANCE_COLUMNS = [
  { header: 'Session Title' },
  { header: 'Faculty / Instructor' },
  { header: 'Subject / Code' },
  { header: 'Department' },
  { header: 'Date & Time' },
  { header: 'Session Status' },
] as const;

export default function AttendancePage() {
  return (
    <EnterpriseListView
      title="Attendance"
      description="Lecture attendance sessions, student participation registers, and compliance records."
      resourceName="Attendance Sessions"
      columns={ATTENDANCE_COLUMNS}
    />
  );
}
