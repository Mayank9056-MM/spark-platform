import type { PromotionBatchStatus } from '../schemas/promotion.schema';

import { Badge } from '@/components/ui/badge';

interface PromotionBatchStatusBadgeProps {
  status: PromotionBatchStatus;
  className?: string;
}

export function PromotionBatchStatusBadge({ status, className }: PromotionBatchStatusBadgeProps) {
  switch (status) {
    case 'FINALIZED':
      return (
        <Badge
          variant="outline"
          className={`border-emerald-600/40 bg-emerald-500/10 font-mono text-[10px] text-emerald-700 dark:text-emerald-400 ${className ?? ''}`}
        >
          FINALIZED
        </Badge>
      );
    case 'DRAFT':
    default:
      return (
        <Badge
          variant="secondary"
          className={`border-amber-600/40 bg-amber-500/10 font-mono text-[10px] text-amber-700 dark:text-amber-400 ${className ?? ''}`}
        >
          DRAFT
        </Badge>
      );
  }
}
