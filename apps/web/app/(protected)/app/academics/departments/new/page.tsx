'use client';

import { PageHeader } from '@/components/erp/page-header';
import { DepartmentForm } from '@/features/academics/components/department-form';

export default function NewDepartmentPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Register Academic Department"
        description="Establish a top-level academic division for degree programs and faculty allocation."
      />
      <DepartmentForm />
    </div>
  );
}
