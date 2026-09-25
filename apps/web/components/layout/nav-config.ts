import {
  CalendarClockIcon,
  ClipboardListIcon,
  FileTextIcon,
  GraduationCapIcon,
  IdCardIcon,
  KeyIcon,
  LandmarkIcon,
  LayoutDashboardIcon,
  type LucideIcon,
  SettingsIcon,
  ShieldIcon,
  TrendingUpIcon,
  UserCheckIcon,
  UserCogIcon,
  UsersIcon,
} from 'lucide-react';

import type { RoleKey } from '@/features/auth';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  section?: 'Overview' | 'Administration' | 'Academic & Operations' | 'Portals' | 'System';
  /** One key, or any-of-these keys. Omitted items are unrestricted. */
  permission?: string | string[];
  /** Optional role restrictions. Item shown if user has any of these roles. */
  roles?: readonly RoleKey[];
}

export const NAVIGATION: readonly NavItem[] = [
  { label: 'Dashboard', href: '/app/dashboard', icon: LayoutDashboardIcon, section: 'Overview' },
  {
    label: 'Super Admin',
    href: '/app/super-admin',
    icon: ShieldIcon,
    section: 'Administration',
    roles: ['super_admin'],
  },
  {
    label: 'Admin Console',
    href: '/app/admin',
    icon: UserCogIcon,
    section: 'Administration',
    roles: ['admin', 'super_admin'],
  },
  {
    label: 'Users',
    href: '/app/users',
    icon: UsersIcon,
    section: 'Administration',
    permission: 'user:read',
  },
  {
    label: 'Roles',
    href: '/app/roles',
    icon: ShieldIcon,
    section: 'Administration',
    permission: 'role:read',
  },
  {
    label: 'Permissions',
    href: '/app/permissions',
    icon: KeyIcon,
    section: 'Administration',
    permission: 'permission:read',
  },
  {
    label: 'Audit Logs',
    href: '/app/audit-logs',
    icon: FileTextIcon,
    section: 'Administration',
    permission: 'auditLog:read',
    roles: ['admin', 'super_admin'],
  },
  {
    label: 'Admissions',
    href: '/app/admissions',
    icon: ClipboardListIcon,
    section: 'Academic & Operations',
    permission: 'admission:read',
  },
  {
    label: 'Academic Structure',
    href: '/app/academics',
    icon: LandmarkIcon,
    section: 'Academic & Operations',
    permission: [
      'department:read',
      'program:read',
      'curriculumVersion:read',
      'subject:read',
      'academicYear:read',
      'electiveGroup:read',
    ],
  },
  {
    label: 'Attendance',
    href: '/app/attendance',
    icon: UserCheckIcon,
    section: 'Academic & Operations',
    permission: 'attendance:read',
  },
  {
    label: 'Timetable',
    href: '/app/timetable',
    icon: CalendarClockIcon,
    section: 'Academic & Operations',
    permission: 'timetable:read',
  },
  {
    label: 'Promotions',
    href: '/app/promotions',
    icon: TrendingUpIcon,
    section: 'Academic & Operations',
    permission: 'promotion:read',
  },
  {
    label: 'Faculty Assignments',
    href: '/app/faculty-assignments',
    icon: IdCardIcon,
    section: 'Academic & Operations',
    permission: 'facultyAssignment:read',
  },
  { label: 'Student Portal', href: '/app/student', icon: GraduationCapIcon, section: 'Portals' },
  { label: 'System Settings', href: '/app/settings', icon: SettingsIcon, section: 'System' },
] as const;
