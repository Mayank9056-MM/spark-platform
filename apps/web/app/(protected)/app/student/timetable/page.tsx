'use client';

import { AlertCircle } from 'lucide-react';

import { RequireRole } from '@/components/auth/require-role';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { StudentTimetableCard, useStudentTimetable } from '@/features/student';

function StudentTimetablePageContent() {
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

export default function StudentTimetablePage() {
  return (
    <RequireRole allow={['student']}>
      <StudentTimetablePageContent />
    </RequireRole>
  );
}
