'use client';

import { RequireRole } from '@/components/auth/require-role';
import { HodDashboardContent } from '@/features/hod';

export default function HodTimetablePage() {
  return (
    <RequireRole allow={['hod', 'admin', 'super_admin']}>
      <HodDashboardContent initialTab="timetable" />
    </RequireRole>
  );
}
