'use client';

import { ModuleNotConnected } from '@/components/erp/module-not-connected';
import { ModuleShell } from '@/components/erp/module-shell';

export default function PromotionsPage() {
  return (
    <ModuleShell
      title="Promotions"
      description="Promotion batches and student progression decisions."
    >
      <ModuleNotConnected resource="Promotion batches" />
    </ModuleShell>
  );
}
