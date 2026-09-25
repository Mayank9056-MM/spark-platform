'use client';

import { RequirePermission } from '@/components/auth/require-permission';
import { PageHeader } from '@/components/erp/page-header';
import { CurriculaTable } from '@/features/academics';

export default function CurriculaPage() {
  return (
    <RequirePermission require="curriculumVersion:read">
      <div className="space-y-4">
        <PageHeader
          title="Curriculum Versions & Syllabi"
          description="Institutional academic regulations, term courses, and semester structures across degree programs."
        />
        <CurriculaTable />
      </div>
    </RequirePermission>
  );
}
