'use client';

import { ADMINISTRATION_SECTIONS, PermissionFilteredDashboard } from '@/features/dashboard';

export default function SuperAdminPage() {
  return (
    <PermissionFilteredDashboard
      title="Super Admin Console"
      description="System-wide administration and configuration."
      sections={ADMINISTRATION_SECTIONS}
    />
  );
}
