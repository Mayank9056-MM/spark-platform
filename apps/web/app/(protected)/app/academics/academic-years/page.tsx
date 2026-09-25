'use client';

import { PageHeader } from '@/components/erp/page-header';
import { AcademicYearsTable } from '@/features/academics/components/academic-years-table';

export default function AcademicYearsPage() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Academic Sessions & Terms"
        description="Institutional academic enrollment sessions and validity timelines."
      />
      <AcademicYearsTable />
    </div>
  );
}
