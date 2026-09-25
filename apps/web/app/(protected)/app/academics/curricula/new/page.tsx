'use client';

import { RequirePermission } from '@/components/auth/require-permission';
import { PageHeader } from '@/components/erp/page-header';
import { CurriculumForm } from '@/features/academics';

export default function NewCurriculumPage() {
  return (
    <RequirePermission require="curriculumVersion:create">
      <div className="space-y-6">
        <PageHeader
          title="Create Curriculum Version"
          description="Register a new academic curriculum edition under an authorized institutional degree program."
        />
        <CurriculumForm />
      </div>
    </RequirePermission>
  );
}
