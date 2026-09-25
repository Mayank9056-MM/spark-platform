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
    <div className="flex flex-col gap-6">
      <div className="border-border/70 flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-foreground font-heading text-xl font-bold tracking-tight sm:text-2xl">
            {title}
          </h1>
          <p className="text-muted-foreground text-xs leading-relaxed sm:text-sm">{description}</p>
        </div>
        {actions !== undefined && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
      <div className="w-full">{children}</div>
    </div>
  );
}
