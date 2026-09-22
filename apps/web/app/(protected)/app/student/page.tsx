'use client';

import { DASHBOARD_SECTIONS, PermissionFilteredDashboard } from '@/features/dashboard';

export default function StudentPage() {
  return (
    <PermissionFilteredDashboard
      title="Student Portal"
      description="Your academic information will appear here as it becomes available."
      sections={DASHBOARD_SECTIONS}
    />
  );
}
