'use client';

import { DASHBOARD_SECTIONS, PermissionFilteredDashboard } from '@/features/dashboard';

export default function DashboardPage() {
  return (
    <PermissionFilteredDashboard
      title="Dashboard"
      description="An overview of the modules available to your account."
      sections={DASHBOARD_SECTIONS}
    />
  );
}
