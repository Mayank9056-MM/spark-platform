import type { ReactNode } from 'react';

interface ModuleShellProps {
  title: string;
  description: string;
  actions?: ReactNode;
  children: ReactNode;
}

/** The one page-level shell every ERP module route renders inside — header + optional gated actions + content. */
export function ModuleShell({ title, description, actions, children }: ModuleShellProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-lg font-semibold">{title}</h1>
          <p className="text-muted-foreground text-sm">{description}</p>
        </div>
        {actions !== undefined && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  );
}
