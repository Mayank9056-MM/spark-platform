'use client';

import { useSearchParams } from 'next/navigation';
import * as React from 'react';

import { RequirePermission } from '@/components/auth/require-permission';
import { PageHeader } from '@/components/erp/page-header';
import { AdmissionForm } from '@/features/admissions/components/admission-form';

function AdmissionFormContainer() {
  const searchParams = useSearchParams();
  const userId = searchParams.get('userId') ?? undefined;

  return <AdmissionForm initialUserId={userId} />;
}

export default function NewAdmissionPage() {
  return (
    <RequirePermission require="admission:create">
      <div className="space-y-6">
        <PageHeader
          title="New Student Admission"
          description="Institutional enrollment registry & academic program matriculation for HVPM COET."
          badge="Admissions Office"
        />
        <React.Suspense
          fallback={<div className="text-muted-foreground text-xs">Loading candidate form...</div>}
        >
          <AdmissionFormContainer />
        </React.Suspense>
      </div>
    </RequirePermission>
  );
}
