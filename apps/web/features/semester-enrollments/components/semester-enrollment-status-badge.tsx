import * as React from 'react';

import type { SemesterEnrollmentStatus } from '../schemas/semester-enrollment.schema';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface SemesterEnrollmentStatusBadgeProps {
  status: SemesterEnrollmentStatus;
  className?: string;
}

export function SemesterEnrollmentStatusBadge({
  status,
  className,
}: SemesterEnrollmentStatusBadgeProps) {
  switch (status) {
    case 'IN_PROGRESS':
      return (
        <Badge
          variant="outline"
          className={cn(
            'border-blue-500/30 bg-blue-500/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-blue-700 uppercase dark:text-blue-400',
            className,
          )}
        >
          In Progress
        </Badge>
      );
    case 'PROMOTED':
      return (
        <Badge
          variant="outline"
          className={cn(
            'border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-emerald-700 uppercase dark:text-emerald-400',
            className,
          )}
        >
          Promoted
        </Badge>
      );
    case 'REPEATED':
      return (
        <Badge
          variant="outline"
          className={cn(
            'border-amber-500/30 bg-amber-500/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-amber-700 uppercase dark:text-amber-400',
            className,
          )}
        >
          Repeated
        </Badge>
      );
    case 'DETAINED':
      return (
        <Badge
          variant="outline"
          className={cn(
            'border-rose-500/30 bg-rose-500/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-rose-700 uppercase dark:text-rose-400',
            className,
          )}
        >
          Detained
        </Badge>
      );
    case 'WITHDRAWN':
      return (
        <Badge
          variant="outline"
          className={cn(
            'border-orange-500/30 bg-orange-500/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-orange-700 uppercase dark:text-orange-400',
            className,
          )}
        >
          Withdrawn
        </Badge>
      );
    case 'DISCONTINUED':
      return (
        <Badge
          variant="outline"
          className={cn(
            'border-zinc-500/30 bg-zinc-500/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-zinc-700 uppercase dark:text-zinc-400',
            className,
          )}
        >
          Discontinued
        </Badge>
      );
    case 'GRADUATED':
      return (
        <Badge
          variant="outline"
          className={cn(
            'border-purple-500/30 bg-purple-500/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-purple-700 uppercase dark:text-purple-400',
            className,
          )}
        >
          Graduated
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className={cn('font-mono text-[10px] uppercase', className)}>
          {status}
        </Badge>
      );
  }
}
