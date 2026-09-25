'use client';

import { RequireRole } from '@/components/auth/require-role';
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
    <RequireRole allow={['admin', 'super_admin', 'principal', 'hod', 'officer']}>
      <EnterpriseListView
        title="Attendance"
        description="Lecture attendance sessions, student participation registers, and compliance records."
        resourceName="Attendance Sessions"
        columns={ATTENDANCE_COLUMNS}
      />
    </RequireRole>
  );
}
