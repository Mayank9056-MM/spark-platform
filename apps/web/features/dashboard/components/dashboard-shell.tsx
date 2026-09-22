import type { ReactNode } from 'react';

interface DashboardShellProps {
  title: string;
  description?: string;
  children: ReactNode;
}

/** The one layout every dashboard route renders inside. */
export function DashboardShell({ title, description, children }: DashboardShellProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-lg font-semibold">{title}</h1>
        {description !== undefined && (
          <p className="text-muted-foreground text-sm">{description}</p>
        )}
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">{children}</div>
    </div>
  );
}
