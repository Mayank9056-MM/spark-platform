'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { NAVIGATION } from './nav-config';

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { useAuth } from '@/features/auth';
import { hasAnyPermission } from '@/features/rbac';

/**
 * One shell, every role. Visibility is metadata-driven (nav-config.ts)
 * and filtered by permission — never a per-role sidebar component.
 */
export function AppSidebar() {
  const { permissions } = useAuth();
  const pathname = usePathname();

  const items = NAVIGATION.filter((item) => {
    if (item.permission === undefined) {
      return true;
    }
    const required = Array.isArray(item.permission) ? item.permission : [item.permission];
    return hasAnyPermission(permissions, required);
  });

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <span className="px-2 py-1 text-sm font-semibold">S.P.A.R.K.</span>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      isActive={isActive}
                      tooltip={item.label}
                      render={<Link href={item.href} />}
                    >
                      <item.icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
