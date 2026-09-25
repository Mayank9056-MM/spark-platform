'use client';

import { RequireRole } from '@/components/auth/require-role';
import { StudentDashboardContent } from '@/features/student';

export default function StudentPage() {
  return (
    <RequireRole allow={['student']}>
      <StudentDashboardContent />
    </RequireRole>
  );
}
