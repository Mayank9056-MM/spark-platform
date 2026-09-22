'use client';

import { ADMINISTRATION_SECTIONS, PermissionFilteredDashboard } from '@/features/dashboard';

export default function AdminPage() {
  return (
    <PermissionFilteredDashboard
      title="Administration"
      description="Manage users, roles, and permissions for the institution."
      sections={ADMINISTRATION_SECTIONS}
    />
  );
}
