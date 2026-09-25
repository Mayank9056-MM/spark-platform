'use client';

import * as React from 'react';

import { Spinner } from '@/components/ui/spinner';
import { useAuth } from '@/features/auth';
import { DASHBOARD_SECTIONS, PermissionFilteredDashboard } from '@/features/dashboard';
import { FacultyDashboardContent } from '@/features/faculty';
import { hasAnyRole, hasRole } from '@/features/rbac';
import { StudentDashboardContent } from '@/features/student';

export default function DashboardPage() {
  const { roles, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="text-muted-foreground flex h-64 items-center justify-center gap-2 text-xs">
        <Spinner aria-hidden="true" className="size-4" />
        <span>Loading workspace…</span>
      </div>
    );
  }

  const isStudentOnly =
    hasRole(roles, 'student') &&
    !hasAnyRole(roles, [
      'admin',
      'super_admin',
      'faculty',
      'hod',
      'principal',
      'officer',
      'clerk',
      'secretary',
    ]);

  if (isStudentOnly) {
    return <StudentDashboardContent />;
  }

  const isFacultyRole =
    hasAnyRole(roles, ['faculty', 'hod']) && !hasAnyRole(roles, ['admin', 'super_admin']);

  if (isFacultyRole) {
    return <FacultyDashboardContent />;
  }

  return (
    <PermissionFilteredDashboard
      title="Dashboard"
      description="An overview of the modules available to your account."
      sections={DASHBOARD_SECTIONS}
    />
  );
}
