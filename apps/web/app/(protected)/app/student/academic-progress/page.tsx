'use client';

import { AlertCircle } from 'lucide-react';

import { RequireRole } from '@/components/auth/require-role';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { StudentProgressCard, useStudentProgress } from '@/features/student';

function StudentProgressPageContent() {
  const { data: progress, isLoading, error } = useStudentProgress();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-64 rounded-none" />
        <Skeleton className="h-64 rounded-none" />
      </div>
    );
  }

  if (error || !progress) {
    return (
      <Alert variant="destructive" className="rounded-none">
        <AlertCircle className="size-4" />
        <AlertTitle>Error loading academic progress</AlertTitle>
        <AlertDescription>
          {error?.message ?? 'Could not load enrollment progression history.'}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-foreground text-2xl font-bold tracking-tight">
          Academic Progression & Promotion Record
        </h1>
        <p className="text-muted-foreground text-sm">
          Official history of semester enrollments and Academic Board promotion decisions.
        </p>
      </div>

      <StudentProgressCard progress={progress} />
    </div>
  );
}

export default function StudentProgressPage() {
  return (
    <RequireRole allow={['student']}>
      <StudentProgressPageContent />
    </RequireRole>
  );
}
