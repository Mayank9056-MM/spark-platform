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
      <SidebarInset className="bg-background text-foreground flex min-h-screen flex-col">
        <Topbar />
        <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
