import {
  BookOpenIcon,
  BuildingIcon,
  CalendarClockIcon,
  ClipboardListIcon,
  GraduationCapIcon,
  KeyIcon,
  type LucideIcon,
  ShieldIcon,
  UserCheckIcon,
  UserCogIcon,
  UsersIcon,
} from 'lucide-react';

export interface DashboardSection {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  /** Every key below is a real entry in PERMISSION_CATALOG — none invented. */
  permission?: string;
  actionPermission?: string;
  actionLabel?: string;
  href?: string;
  actionHref?: string;
}

/**
 * Academic/operational sections shared by the six /app/dashboard roles
 * (principal, hod, faculty, officer, clerk, secretary). Visibility is
 * decided entirely by hasPermission against the user's real, backend-
 * granted permissions — never by role name — so this one config plus
 * PermissionFilteredDashboard's filtering IS the "PrincipalDashboard /
 * HodDashboard / FacultyDashboard / ..." differentiation the spec asks
 * for, without nine near-duplicate components.
 */
export const DASHBOARD_SECTIONS: readonly DashboardSection[] = [
  {
    id: 'admissions',
    title: 'Admissions',
    description: 'Admission activity for the current academic year.',
    icon: ClipboardListIcon,
    permission: 'admission:read',
    actionPermission: 'admission:create',
    actionLabel: 'Record admission',
    href: '/app/admissions',
    actionHref: '/app/admissions/new',
  },
  {
    id: 'attendance',
    title: 'Attendance',
    description: 'Attendance sessions and records.',
    icon: UserCheckIcon,
    permission: 'attendance:read',
    href: '/app/attendance',
  },
  {
    id: 'faculty-assignments',
    title: 'Faculty Assignments',
    description: 'Faculty assigned to subjects and components.',
    icon: UsersIcon,
    permission: 'facultyAssignment:read',
    actionPermission: 'facultyAssignment:create',
    actionLabel: 'Assign faculty',
    href: '/app/faculty-assignments',
  },
  {
    id: 'timetable',
    title: 'Timetable',
    description: 'Scheduled lectures across subjects and rooms.',
    icon: CalendarClockIcon,
    permission: 'timetable:read',
    actionPermission: 'timetable:create',
    actionLabel: 'Add timetable entry',
    href: '/app/timetable',
  },
  {
    id: 'academics',
    title: 'Academic Structure',
    description: 'Departments, programs, and curriculum versions.',
    icon: BuildingIcon,
    permission: 'program:read',
    href: '/app/academics',
  },
  {
    id: 'subjects',
    title: 'Subjects',
    description: 'Subjects across active semester catalogs.',
    icon: BookOpenIcon,
    permission: 'program:read',
    href: '/app/academics',
  },
  {
    id: 'promotion',
    title: 'Promotions',
    description: 'Promotion batches and student progression decisions.',
    icon: GraduationCapIcon,
    permission: 'promotion:read',
    actionPermission: 'promotion:create',
    actionLabel: 'Open promotion batch',
    href: '/app/promotions',
  },
] as const;

/**
 * Administration-only sections for /app/admin and /app/super-admin.
 * NOTE: no "Students" or "Faculty" management section exists here —
 * see the report accompanying this file for why (missing backend
 * permissions, not an oversight).
 */
export const ADMINISTRATION_SECTIONS: readonly DashboardSection[] = [
  {
    id: 'users',
    title: 'User Management',
    description: 'User accounts across the institution.',
    icon: UsersIcon,
    permission: 'user:read',
    actionPermission: 'user:create',
    actionLabel: 'Create user',
  },
  {
    id: 'roles',
    title: 'Role Management',
    description: 'Roles and the permissions they grant.',
    icon: ShieldIcon,
    permission: 'role:read',
    actionPermission: 'role:create',
    actionLabel: 'Create role',
  },
  {
    id: 'role-assignments',
    title: 'Role Assignments',
    description: 'Active role assignments for users.',
    icon: UserCogIcon,
    permission: 'roleAssignment:read',
    actionPermission: 'roleAssignment:create',
    actionLabel: 'Assign role',
  },
  {
    id: 'permissions',
    title: 'Permissions',
    description: 'The system permission catalog.',
    icon: KeyIcon,
    permission: 'permission:read',
  },
] as const;
