'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { NAVIGATION } from './nav-config';

import { Badge } from '@/components/ui/badge';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { HvpmLogo, useAuth } from '@/features/auth';
import { hasAnyPermission, hasAnyRole } from '@/features/rbac';

const SECTIONS = [
  'Overview',
  'Administration',
  'Academic & Operations',
  'Portals',
  'System',
] as const;

/**
 * One shell, every role. Visibility is metadata-driven (nav-config.ts)
 * and filtered by permission and role — never a per-role sidebar component.
 */
export function AppSidebar() {
  const { permissions, roles } = useAuth();
  const pathname = usePathname();

  const items = NAVIGATION.filter((item) => {
    if (item.roles !== undefined && !hasAnyRole(roles, item.roles)) {
      return false;
    }
    if (item.permission === undefined) {
      return true;
    }
    const required = Array.isArray(item.permission) ? item.permission : [item.permission];
    return hasAnyPermission(permissions, required);
  });

  const grouped = SECTIONS.map((section) => ({
    title: section,
    items: items.filter((item) => (item.section ?? 'Overview') === section),
  })).filter((group) => group.items.length > 0);

  return (
    <Sidebar collapsible="icon" className="border-sidebar-border bg-sidebar border-r select-none">
      {/* Institutional S.P.A.R.K. & HVPM COET Header */}
      <SidebarHeader className="border-sidebar-border border-b px-3 py-3">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <HvpmLogo size="nav" className="h-7 w-auto shrink-0" priority />
          <div className="flex flex-col overflow-hidden group-data-[collapsible=icon]:hidden">
            <div className="flex items-center gap-1.5">
              <span className="font-heading text-sidebar-foreground text-sm font-bold tracking-wider">
                S.P.A.R.K.
              </span>
              <Badge
                variant="outline"
                className="border-primary/30 text-primary h-4 px-1 py-0 font-mono text-[9px] uppercase"
              >
                ERP
              </Badge>
            </div>
            <span className="text-muted-foreground truncate text-[11px]">HVPM COET Amravati</span>
          </div>
        </div>
      </SidebarHeader>

      {/* Main Navigation Links Grouped by Section */}
      <SidebarContent className="py-1">
        {grouped.map((group) => (
          <SidebarGroup key={group.title} className="py-1">
            <SidebarGroupLabel className="text-muted-foreground/70 h-6 px-2 text-[10px] font-bold tracking-wider uppercase">
              {group.title}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-0.5 px-1">
                {group.items.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        isActive={isActive}
                        tooltip={item.label}
                        className="data-active:border-primary data-active:bg-sidebar-accent data-active:text-sidebar-accent-foreground hover:bg-sidebar-accent/60 rounded-md transition-all duration-150 data-active:border-l-2 data-active:pl-2.5 data-active:font-semibold"
                        render={<Link href={item.href} />}
                      >
                        <item.icon className="size-4 shrink-0 transition-colors" />
                        <span className="truncate text-xs">{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      {/* Institutional System Status Footer */}
      <SidebarFooter className="border-sidebar-border border-t p-3 group-data-[collapsible=icon]:hidden">
        <div className="text-muted-foreground flex items-center justify-between text-[11px]">
          <span className="flex items-center gap-1.5 font-medium">
            <span
              className="size-1.5 animate-pulse rounded-full bg-emerald-500"
              aria-hidden="true"
            />
            HVPM Campus Node
          </span>
          <span className="text-muted-foreground/75 font-mono text-[10px]">AMV-01</span>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
