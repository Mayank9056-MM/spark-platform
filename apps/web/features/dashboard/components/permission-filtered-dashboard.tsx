'use client';

import type { DashboardSection } from '../config/dashboard-sections';

import { DashboardSectionCard } from './dashboard-section-card';
import { DashboardShell } from './dashboard-shell';
import { EmptyDashboardState } from './empty-dashboard-state';

import { useAuth } from '@/features/auth';
import { hasPermission } from '@/features/rbac';

interface PermissionFilteredDashboardProps {
  title: string;
  description: string;
  sections: readonly DashboardSection[];
}

/**
 * Filters `sections` by the signed-in user's real permissions — the
 * same hasPermission primitive AppSidebar already uses for nav-config.ts
 * — then lays out what's left via DashboardShell. Consumes useAuth()
 * only; performs no second /auth/me fetch.
 */
export function PermissionFilteredDashboard({
  title,
  description,
  sections,
}: PermissionFilteredDashboardProps) {
  const { permissions } = useAuth();

  const visible = sections.filter(
    (section) => section.permission === undefined || hasPermission(permissions, section.permission),
  );

  return (
    <DashboardShell title={title} description={description}>
      {visible.length === 0 ? (
        <EmptyDashboardState />
      ) : (
        visible.map((section) => <DashboardSectionCard key={section.id} section={section} />)
      )}
    </DashboardShell>
  );
}
