import * as React from 'react';

import type { StudentLifecycleStatus } from '../schemas/student.schema';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface StudentStatusBadgeProps {
  status: StudentLifecycleStatus;
  className?: string;
}

export function StudentStatusBadge({ status, className }: StudentStatusBadgeProps) {
  switch (status) {
    case 'ACTIVE':
      return (
        <Badge
          variant="outline"
          className={cn(
            'border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-emerald-700 uppercase dark:text-emerald-400',
            className,
          )}
        >
          Active
        </Badge>
      );
    case 'ON_GAP_YEAR':
      return (
        <Badge
          variant="outline"
          className={cn(
            'border-amber-500/30 bg-amber-500/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-amber-700 uppercase dark:text-amber-400',
            className,
          )}
        >
          Gap Year
        </Badge>
      );
    case 'GRADUATED':
      return (
        <Badge
          variant="outline"
          className={cn(
            'border-blue-500/30 bg-blue-500/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-blue-700 uppercase dark:text-blue-400',
            className,
          )}
        >
          Graduated
        </Badge>
      );
    case 'ALUMNI':
      return (
        <Badge
          variant="outline"
          className={cn(
            'border-indigo-500/30 bg-indigo-500/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-indigo-700 uppercase dark:text-indigo-400',
            className,
          )}
        >
          Alumni
        </Badge>
      );
    case 'WITHDRAWN':
      return (
        <Badge
          variant="secondary"
          className={cn(
            'border-muted text-muted-foreground px-2 py-0.5 font-mono text-[10px] uppercase',
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
            'border-rose-500/30 bg-rose-500/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-rose-700 uppercase dark:text-rose-400',
            className,
          )}
        >
          Discontinued
        </Badge>
      );
    case 'CANCELLED':
      return (
        <Badge
          variant="destructive"
          className={cn('px-2 py-0.5 font-mono text-[10px] font-semibold uppercase', className)}
        >
          Cancelled
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
