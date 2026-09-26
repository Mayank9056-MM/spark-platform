'use client';

import * as React from 'react';
import { AlertCircle } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { useAuth } from '@/features/auth';
import { FacultyAttendanceView } from '@/features/faculty';
import { HodDashboardContent } from '@/features/hod';
import { hasAnyRole, hasRole } from '@/features/rbac';
import { StudentAttendanceCard, useStudentAttendance } from '@/features/student';

function StudentAttendanceSection() {
  const { data: attendance, isLoading, error } = useStudentAttendance();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48 rounded-none" />
        <Skeleton className="h-96 rounded-none" />
      </div>
    );
  }

  if (error || !attendance) {
    return (
      <Alert variant="destructive" className="rounded-none">
        <AlertCircle className="size-4" />
        <AlertTitle>Error loading attendance</AlertTitle>
        <AlertDescription>
          {error?.message ?? 'Could not retrieve attendance records for your enrollment.'}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-foreground text-2xl font-bold tracking-tight">
          Attendance Record
        </h1>
        <p className="text-muted-foreground text-sm">
          Subject-by-subject attendance telemetry and detailed session history.
        </p>
      </div>

      <StudentAttendanceCard attendance={attendance} compact={false} />
    </div>
  );
}

export default function AttendancePage() {
  const { roles, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="text-muted-foreground flex h-64 items-center justify-center gap-2 text-xs">
        <Spinner aria-hidden="true" className="size-4" />
        <span>Loading attendance workspace…</span>
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
    ]);

  if (isStudentOnly) {
    return <StudentAttendanceSection />;
  }

  const isFacultyOnly =
    hasRole(roles, 'faculty') &&
    !hasAnyRole(roles, ['admin', 'super_admin', 'hod', 'principal']);

  if (isFacultyOnly) {
    return <FacultyAttendanceView />;
  }

  return <HodDashboardContent initialTab="attendance" />;
}
