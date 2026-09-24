import type { ReactNode } from 'react';

interface DashboardShellProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  headerMeta?: ReactNode;
  children: ReactNode;
}

/** The one layout every dashboard route renders inside. */
export function DashboardShell({
  title,
  description,
  actions,
  headerMeta,
  children,
}: DashboardShellProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="border-border/70 flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-foreground font-heading text-xl font-bold tracking-tight sm:text-2xl">
              {title}
            </h1>
            {headerMeta}
          </div>
          {description !== undefined && (
            <p className="text-muted-foreground max-w-2xl text-xs leading-relaxed sm:text-sm">
              {description}
            </p>
          )}
        </div>
        {actions !== undefined && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
      <div className="flex flex-col gap-6">{children}</div>
    </div>
  );
}
