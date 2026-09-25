'use client';

import type { ReactNode } from 'react';

import { Badge } from '@/components/ui/badge';

export interface PageHeaderProps {
  title: string;
  description?: string;
  badge?: string;
  actions?: ReactNode;
  children?: ReactNode;
}

/**
 * Standard enterprise Page Header used across S.P.A.R.K. List, Detail, and Role Center pages.
 * Features institutional typography, status badge, description, and permission-aware action bar.
 */
export function PageHeader({ title, description, badge, actions, children }: PageHeaderProps) {
  return (
    <div className="border-border/70 flex flex-col gap-3 border-b pb-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-foreground font-heading text-lg font-bold tracking-tight sm:text-xl">
              {title}
            </h1>
            {badge && (
              <Badge
                variant="outline"
                className="border-primary/30 text-primary bg-primary/5 font-mono text-[10px] uppercase"
              >
                {badge}
              </Badge>
            )}
          </div>
          {description && (
            <p className="text-muted-foreground max-w-3xl text-xs leading-relaxed">{description}</p>
          )}
        </div>
        {actions !== undefined && (
          <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
        )}
      </div>
      {children}
    </div>
  );
}
