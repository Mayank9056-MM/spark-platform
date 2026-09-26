'use client';

import { RequireRole } from '@/components/auth/require-role';
import { FacultyAttendanceView } from '@/features/faculty';

export default function FacultyAttendancePage() {
  return (
    <RequireRole allow={['faculty', 'hod', 'admin', 'super_admin']}>
      <FacultyAttendanceView />
    </RequireRole>
  );
}
