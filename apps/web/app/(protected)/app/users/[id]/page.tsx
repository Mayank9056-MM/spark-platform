'use client';

import { AlertCircleIcon, Loader2Icon } from 'lucide-react';
import { useParams } from 'next/navigation';

import { PageHeader } from '@/components/erp/page-header';
import { Button } from '@/components/ui/button';
import { UserDetailCard } from '@/features/users/components/user-detail-card';
import { useUser } from '@/features/users/hooks/use-user';

export default function UserDetailPage() {
  const params = useParams<{ id: string }>();
  const userId = params?.id ?? '';

  const { data: user, isLoading, isError, error, refetch } = useUser(userId);

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-3">
        <Loader2Icon className="text-primary size-6 animate-spin" />
        <p className="text-muted-foreground font-mono text-xs">Loading user record...</p>
      </div>
    );
  }

  if (isError || !user) {
    return (
      <div className="mx-auto max-w-xl space-y-4 py-12">
        <div className="border-destructive/30 bg-destructive/5 space-y-3 rounded-lg border p-6 text-center">
          <AlertCircleIcon className="text-destructive mx-auto size-8" />
          <h2 className="text-foreground text-sm font-semibold">User Record Unavailable</h2>
          <p className="text-muted-foreground text-xs">
            {error?.message ??
              'The requested user could not be found or you do not have permission to view it.'}
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              void refetch();
            }}
            className="h-8 text-xs"
          >
            Retry Retrieval
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={user.fullName}
        description="Institutional user record, security status, and assigned operational roles."
      />
      <UserDetailCard user={user} />
    </div>
  );
}
