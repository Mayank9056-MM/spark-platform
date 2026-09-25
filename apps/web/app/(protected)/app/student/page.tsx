'use client';

import { RequireRole } from '@/components/auth/require-role';
import { DASHBOARD_SECTIONS, PermissionFilteredDashboard } from '@/features/dashboard';

export default function StudentPage() {
  return (
    <RequireRole allow={['student']}>
      <PermissionFilteredDashboard
        title="Student Portal"
        description="Your academic information will appear here as it becomes available."
        sections={DASHBOARD_SECTIONS}
      />
    </RequireRole>
  );
}
