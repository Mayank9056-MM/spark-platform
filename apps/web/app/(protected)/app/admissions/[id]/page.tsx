'use client';

import { AlertCircleIcon, Loader2Icon } from 'lucide-react';
import { useParams } from 'next/navigation';

import { PageHeader } from '@/components/erp/page-header';
import { Button } from '@/components/ui/button';
import { AdmissionDetailCard } from '@/features/admissions/components/admission-detail-card';
import { useAdmission } from '@/features/admissions/hooks/use-admission';

export default function AdmissionDetailPage() {
  const params = useParams<{ id: string }>();
  const admissionId = params?.id ?? '';

  const { data: admission, isLoading, isError, error, refetch } = useAdmission(admissionId);

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-3">
        <Loader2Icon className="text-primary size-6 animate-spin" />
        <p className="text-muted-foreground font-mono text-xs">Loading admission record...</p>
      </div>
    );
  }

  if (isError || !admission) {
    return (
      <div className="mx-auto max-w-xl space-y-4 py-12">
        <div className="border-destructive/30 bg-destructive/5 space-y-3 rounded-lg border p-6 text-center">
          <AlertCircleIcon className="text-destructive mx-auto size-8" />
          <h2 className="text-foreground text-sm font-semibold">Admission Record Unavailable</h2>
          <p className="text-muted-foreground text-xs">
            {error?.message ??
              'The requested admission record could not be found or you do not have permission to view it.'}
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
        title={`Admission: ${admission.admissionNumber}`}
        description="Institutional student admission credentials, program allocation, and status."
      />
      <AdmissionDetailCard admission={admission} />
    </div>
  );
}
