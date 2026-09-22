import {
  CalendarClockIcon,
  ClipboardListIcon,
  GraduationCapIcon,
  IdCardIcon,
  LandmarkIcon,
  LayoutDashboardIcon,
  type LucideIcon,
  ShieldIcon,
  TrendingUpIcon,
  UserCheckIcon,
  UserCogIcon,
  UsersIcon,
} from 'lucide-react';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** One key, or any-of-these keys. Omitted items are unrestricted. */
  permission?: string | string[];
}

export const NAVIGATION: readonly NavItem[] = [
  { label: 'Dashboard', href: '/app/dashboard', icon: LayoutDashboardIcon },
  {
    label: 'Admissions',
    href: '/app/admissions',
    icon: ClipboardListIcon,
    permission: 'admission:read',
  },
  {
    label: 'Academics',
    href: '/app/academics',
    icon: LandmarkIcon,
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
    permission: 'attendance:read',
  },
  {
    label: 'Timetable',
    href: '/app/timetable',
    icon: CalendarClockIcon,
    permission: 'timetable:read',
  },
  {
    label: 'Promotions',
    href: '/app/promotions',
    icon: TrendingUpIcon,
    permission: 'promotion:read',
  },
  {
    label: 'Faculty Assignments',
    href: '/app/faculty-assignments',
    icon: IdCardIcon,
    permission: 'facultyAssignment:read',
  },
  { label: 'Super Admin', href: '/app/super-admin', icon: ShieldIcon },
  { label: 'Admin', href: '/app/admin', icon: UserCogIcon },
  { label: 'Student', href: '/app/student', icon: GraduationCapIcon },
  { label: 'Users', href: '/app/users', icon: UsersIcon, permission: 'user:read' },
] as const;
