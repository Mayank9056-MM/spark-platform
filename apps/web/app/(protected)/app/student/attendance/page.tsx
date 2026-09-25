'use client';

import { AlertCircle } from 'lucide-react';

import { RequireRole } from '@/components/auth/require-role';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { StudentAttendanceCard, useStudentAttendance } from '@/features/student';

function StudentAttendancePageContent() {
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

export default function StudentAttendancePage() {
  return (
    <RequireRole allow={['student']}>
      <StudentAttendancePageContent />
    </RequireRole>
  );
}
