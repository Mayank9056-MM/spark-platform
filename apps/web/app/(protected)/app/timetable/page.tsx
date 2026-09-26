'use client';

import * as React from 'react';
import { AlertCircle } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { useAuth } from '@/features/auth';
import { FacultyTimetableCard, useFacultyTimetable } from '@/features/faculty';
import { HodDashboardContent } from '@/features/hod';
import { hasAnyRole, hasRole } from '@/features/rbac';
import { StudentTimetableCard, useStudentTimetable } from '@/features/student';

function StudentTimetableSection() {
  const { data: timetable = [], isLoading, error } = useStudentTimetable();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-16 rounded-none" />
        <Skeleton className="h-96 rounded-none" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="rounded-none">
        <AlertCircle className="size-4" />
        <AlertTitle>Error loading class schedule</AlertTitle>
        <AlertDescription>
          {error.message || 'Could not load timetable schedule for your current semester.'}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-foreground text-2xl font-bold tracking-tight">
          Weekly Class Schedule
        </h1>
        <p className="text-muted-foreground text-sm">
          Official timetable for lectures, laboratory sessions, and tutorials.
        </p>
      </div>

      <StudentTimetableCard entries={timetable} compact={false} />
    </div>
  );
}

function FacultyTimetableSection() {
  const { data: timetable = [], isLoading } = useFacultyTimetable();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-foreground text-2xl font-bold tracking-tight">
          Weekly Instructional Schedule
        </h1>
        <p className="text-muted-foreground text-sm">
          Recurring weekly timetable slots, room assignments, and cohort class allocations.
        </p>
      </div>

      <FacultyTimetableCard timetable={timetable} isLoading={isLoading} />
    </div>
  );
}

export default function TimetablePage() {
  const { roles, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="text-muted-foreground flex h-64 items-center justify-center gap-2 text-xs">
        <Spinner aria-hidden="true" className="size-4" />
        <span>Loading timetable…</span>
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
    return <StudentTimetableSection />;
  }

  const isFacultyOnly =
    hasRole(roles, 'faculty') &&
    !hasAnyRole(roles, ['admin', 'super_admin', 'hod', 'principal']);

  if (isFacultyOnly) {
    return <FacultyTimetableSection />;
  }

  return <HodDashboardContent initialTab="timetable" />;
}
