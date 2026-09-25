'use client';

import { AlertCircle } from 'lucide-react';

import { RequireRole } from '@/components/auth/require-role';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { StudentProfileForm, useStudentProfile } from '@/features/student';

function StudentProfilePageContent() {
  const { data: profile, isLoading, error } = useStudentProfile();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-64 rounded-none" />
        <Skeleton className="h-48 rounded-none" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <Alert variant="destructive" className="rounded-none">
        <AlertCircle className="size-4" />
        <AlertTitle>Error loading profile</AlertTitle>
        <AlertDescription>
          {error?.message ?? 'Could not retrieve student profile details.'}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-foreground text-2xl font-bold tracking-tight">
          My Student Profile
        </h1>
        <p className="text-muted-foreground text-sm">
          View your institutional enrollment identity and update your registered contact details.
        </p>
      </div>

      <StudentProfileForm profile={profile} />
    </div>
  );
}

export default function StudentProfilePage() {
  return (
    <RequireRole allow={['student']}>
      <StudentProfilePageContent />
    </RequireRole>
  );
}
