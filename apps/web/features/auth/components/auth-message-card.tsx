import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export interface AuthMessageCardProps {
  icon?: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  variant?: 'default' | 'success' | 'destructive' | 'warning';
  title: string;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}

/**
 * Reusable enterprise message card for confirmation, informational, or terminal
 * error states within S.P.A.R.K. authentication workflows.
 */
export function AuthMessageCard({
  icon: Icon,
  variant = 'default',
  title,
  children,
  action,
  className,
}: AuthMessageCardProps) {
  const isSuccess = variant === 'success';
  const isDestructive = variant === 'destructive';
  const isWarning = variant === 'warning';

  return (
    <div
      className={cn(
        'space-y-3.5 rounded-md border p-4 transition-colors sm:p-5',
        isSuccess && 'text-foreground border-emerald-500/30 bg-emerald-500/5',
        isDestructive && 'border-destructive/30 bg-destructive/5 text-foreground',
        isWarning && 'text-foreground border-amber-500/30 bg-amber-500/5',
        !isSuccess &&
          !isDestructive &&
          !isWarning &&
          'border-border/80 bg-muted/20 text-foreground',
        className,
      )}
    >
      <div className="flex items-center gap-3">
        {Icon && (
          <div
            className={cn(
              'shrink-0 rounded-md border p-2',
              isSuccess &&
                'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
              isDestructive &&
                'border-destructive/40 bg-destructive/10 text-destructive dark:text-red-400',
              isWarning && 'border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400',
              !isSuccess &&
                !isDestructive &&
                !isWarning &&
                'border-border bg-muted/60 text-foreground',
            )}
          >
            <Icon className="size-4.5" aria-hidden={true} />
          </div>
        )}
        <h2 className="text-foreground text-sm font-semibold tracking-tight">{title}</h2>
      </div>

      <div className="text-muted-foreground pl-0.5 text-xs leading-relaxed">{children}</div>

      {action && <div className="pt-1.5">{action}</div>}
    </div>
  );
}
