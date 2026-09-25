'use client';

import type { ReactNode } from 'react';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface AuthFormPanelProps {
  /** Uppercase category badge (e.g. "INSTITUTIONAL ACCESS") */
  badge?: string;
  /** Primary title of the authentication task */
  title: string;
  /** Secondary task description or subtitle */
  subtitle?: string;
  /** Institutional label */
  institution?: string;
  /** Custom description node (overrides subtitle/institution) */
  description?: ReactNode;
  /** Interactive form content */
  children: ReactNode;
  /** Secondary navigation or institutional help footer */
  cardFooter?: ReactNode;
  className?: string;
}

/**
 * Primary Task Surface for S.P.A.R.K. Authentication.
 *
 * Implements a focused, production-grade enterprise authentication container:
 * - High-contrast clean card surface.
 * - Clear information hierarchy.
 * - Restrained typography and compact enterprise controls.
 * - Direct, predictable interaction without marketing interference.
 */
export function AuthFormPanel({
  badge,
  title,
  subtitle = 'Access your S.P.A.R.K. account',
  institution = 'HVPM College of Engineering and Technology',
  description,
  children,
  cardFooter,
  className,
}: AuthFormPanelProps) {
  return (
    <div
      className={cn(
        'bg-card flex flex-col justify-between p-6 transition-colors sm:p-8 xl:p-10',
        className,
      )}
    >
      <div className="space-y-6">
        {/* Task Header & Context Hierarchy */}
        <div className="space-y-2">
          {badge && (
            <div className="flex items-center justify-between">
              <Badge
                variant="outline"
                className="text-muted-foreground border-border/80 bg-surface-secondary px-2 py-0.5 font-mono text-[10px] tracking-wider uppercase"
              >
                {badge}
              </Badge>
            </div>
          )}

          <div className="space-y-1">
            <h1 className="text-foreground font-heading text-xl font-bold tracking-tight sm:text-2xl">
              {title}
            </h1>

            {description !== undefined ? (
              <div className="text-muted-foreground text-xs leading-relaxed">{description}</div>
            ) : (
              <div className="space-y-0.5">
                <p className="text-foreground/90 text-xs font-semibold">{subtitle}</p>
                <p className="text-muted-foreground text-[11px]">{institution}</p>
              </div>
            )}
          </div>
        </div>

        {/* Interactive Form Body */}
        <div>{children}</div>
      </div>

      {/* Institutional Assistance & Route Navigation Footer */}
      {cardFooter && (
        <div className="border-border/70 text-muted-foreground mt-6 border-t pt-4 text-xs">
          {cardFooter}
        </div>
      )}
    </div>
  );
}
