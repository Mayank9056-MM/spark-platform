import type { PromotionOutcome } from '../schemas/promotion.schema';

import { Badge } from '@/components/ui/badge';

interface PromotionOutcomeBadgeProps {
  outcome: PromotionOutcome;
  className?: string;
}

export function PromotionOutcomeBadge({ outcome, className }: PromotionOutcomeBadgeProps) {
  switch (outcome) {
    case 'PROMOTE':
      return (
        <Badge
          variant="outline"
          className={`border-emerald-600/40 bg-emerald-500/10 font-mono text-[10px] text-emerald-700 dark:text-emerald-400 ${className ?? ''}`}
        >
          PROMOTE
        </Badge>
      );
    case 'REPEAT':
      return (
        <Badge
          variant="outline"
          className={`border-amber-600/40 bg-amber-500/10 font-mono text-[10px] text-amber-700 dark:text-amber-400 ${className ?? ''}`}
        >
          REPEAT
        </Badge>
      );
    case 'GRADUATE':
      return (
        <Badge
          variant="outline"
          className={`border-indigo-600/40 bg-indigo-500/10 font-mono text-[10px] text-indigo-700 dark:text-indigo-400 ${className ?? ''}`}
        >
          GRADUATE
        </Badge>
      );
    case 'WITHDRAW':
      return (
        <Badge
          variant="outline"
          className={`border-rose-600/40 bg-rose-500/10 font-mono text-[10px] text-rose-700 dark:text-rose-400 ${className ?? ''}`}
        >
          WITHDRAW
        </Badge>
      );
    case 'DISCONTINUE':
      return (
        <Badge variant="destructive" className={`font-mono text-[10px] ${className ?? ''}`}>
          DISCONTINUE
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className={`font-mono text-[10px] ${className ?? ''}`}>
          {outcome}
        </Badge>
      );
  }
}
