'use client';

import { AlertCircleIcon, Loader2Icon } from 'lucide-react';
import { useParams } from 'next/navigation';

import { PageHeader } from '@/components/erp/page-header';
import { Button } from '@/components/ui/button';
import { RoleForm } from '@/features/roles/components/role-form';
import { useRole } from '@/features/roles/hooks/use-role';

export default function EditRolePage() {
  const params = useParams<{ id: string }>();
  const roleId = params?.id ?? '';

  const { data: role, isLoading, isError, error, refetch } = useRole(roleId);

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-3">
        <Loader2Icon className="text-primary size-6 animate-spin" />
        <p className="text-muted-foreground font-mono text-xs">Loading role definition...</p>
      </div>
    );
  }

  if (isError || !role) {
    return (
      <div className="mx-auto max-w-xl space-y-4 py-12">
        <div className="border-destructive/30 bg-destructive/5 space-y-3 rounded-lg border p-6 text-center">
          <AlertCircleIcon className="text-destructive mx-auto size-8" />
          <h2 className="text-foreground text-sm font-semibold">Role Record Unavailable</h2>
          <p className="text-muted-foreground text-xs">
            {error?.message ?? 'The requested role could not be found.'}
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
        title={`Edit Role: ${role.displayName}`}
        description="Update institutional role display properties."
      />
      <RoleForm mode="edit" role={role} />
    </div>
  );
}
