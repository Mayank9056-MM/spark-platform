'use client';

import { PageHeader } from '@/components/erp/page-header';
import { CurriculaTable } from '@/features/academics';

export default function CurriculaPage() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Curriculum Versions & Syllabi"
        description="Institutional academic regulations, term courses, and semester structures across degree programs."
      />
      <CurriculaTable />
    </div>
  );
}
