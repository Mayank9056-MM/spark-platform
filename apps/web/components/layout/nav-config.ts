import {
  GraduationCapIcon,
  LayoutDashboardIcon,
  type LucideIcon,
  ShieldIcon,
  UserCogIcon,
  UsersIcon,
} from 'lucide-react';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /**
   * Permission required to see this item. Omitted for most placeholders
   * below, which don't have a real permission mapping yet — real gating
   * arrives with the modules themselves. Frontend filtering is UX only;
   * the backend's authorize() is the real boundary regardless.
   */
  permission?: string;
}

export const NAVIGATION: readonly NavItem[] = [
  { label: 'Dashboard', href: '/app/dashboard', icon: LayoutDashboardIcon },
  { label: 'Super Admin', href: '/app/super-admin', icon: ShieldIcon },
  { label: 'Admin', href: '/app/admin', icon: UserCogIcon },
  { label: 'Student', href: '/app/student', icon: GraduationCapIcon },
  { label: 'Users', href: '/app/users', icon: UsersIcon, permission: 'user:read' },
];
