'use client';

import { RequireRole } from '@/components/auth/require-role';
import { FacultyDashboardContent } from '@/features/faculty';

export default function FacultyPage() {
  return (
    <RequireRole allow={['faculty', 'hod', 'admin', 'super_admin']}>
      <FacultyDashboardContent />
    </RequireRole>
  );
}
