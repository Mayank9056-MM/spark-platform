'use client';

import { RequirePermission } from '@/components/auth/require-permission';
import { PageHeader } from '@/components/erp/page-header';
import { PromotionsTable } from '@/features/promotions';

export default function PromotionsPage() {
  return (
    <RequirePermission require="promotion:read">
      <div className="space-y-4">
        <PageHeader
          title="Student Promotions"
          description="Progression batches, semester promotion evaluations, and academic standing decisions."
        />
        <PromotionsTable />
      </div>
    </RequirePermission>
  );
}
