import type { ReactNode } from 'react';

import { AppSidebar } from './sidebar';
import { Topbar } from './topbar';

import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';

/**
 * The one shell every authenticated route renders inside. Not
 * role-specific: visibility of individual nav entries is handled
 * inside AppSidebar via permissions (Phase 15).
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <Topbar />
        <div className="flex flex-1 flex-col gap-4 p-4">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
