'use client';

import { EnterpriseListView } from '@/components/erp/enterprise-list-view';

const PROMOTION_COLUMNS = [
  { header: 'Batch Identifier' },
  { header: 'Academic Program' },
  { header: 'Current Semester' },
  { header: 'Target Semester' },
  { header: 'Academic Year' },
  { header: 'Progression Status' },
] as const;

export default function PromotionsPage() {
  return (
    <EnterpriseListView
      title="Student Promotions"
      description="Progression batches, semester promotion evaluations, and academic standing decisions."
      resourceName="Promotion Batches"
      columns={PROMOTION_COLUMNS}
    />
  );
}
