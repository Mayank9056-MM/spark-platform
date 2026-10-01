'use client';

import {
  ArrowRightIcon,
  Building2Icon,
  CalendarClockIcon,
  CalendarIcon,
  CheckCircle2Icon,
  ClockIcon,
  FileTextIcon,
  GraduationCapIcon,
  IdCardIcon,
  KeyRoundIcon,
  LandmarkIcon,
  PlusIcon,
  SettingsIcon,
  ShieldCheckIcon,
  TrendingUpIcon,
  UserCheckIcon,
  UserCogIcon,
  UsersIcon,
} from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { RequireRole } from '@/components/auth/require-role';
import { PageHeader } from '@/components/erp/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAcademicYears } from '@/features/academics/hooks/use-academic-years';
import { useDepartments } from '@/features/academics/hooks/use-departments';
import { usePrograms } from '@/features/academics/hooks/use-programs';
import { useAdmissions } from '@/features/admissions/hooks/use-admissions';
import { useRoles } from '@/features/roles/hooks/use-roles';
import { CreateUserDialog } from '@/features/users';
import { UserStatusBadge } from '@/features/users/components/user-status-badge';
import { useUsers } from '@/features/users/hooks/use-users';
import { formatDate } from '@/lib/formatters';

export default function SuperAdminRoleCenterPage() {
  const { data: usersData, isLoading: usersLoading } = useUsers({
    limit: 5,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });
  const { data: rolesData, isLoading: rolesLoading } = useRoles({ limit: 100 });
  const { data: deptsData, isLoading: deptsLoading } = useDepartments({ limit: 50 });
  const { data: progsData, isLoading: progsLoading } = usePrograms({ limit: 50 });
  const { data: admissionsData, isLoading: admissionsLoading } = useAdmissions({ limit: 5 });
  const { data: yearsData, isLoading: yearsLoading } = useAcademicYears({ limit: 10 });

  const activeYear = yearsData?.items?.find((y) => y.isActive);

  return (
    <RequireRole allow={['super_admin']}>
      <div className="space-y-6">
        {/* Page Header with Institutional Hierarchy & Primary Operational Actions */}
        <PageHeader
          title="Super Admin Platform Console"
          description="Institutional governance, enterprise identity, and full administrative oversight for HVPM COET."
          badge="Platform Governance"
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <CreateUserDialog
                trigger={
                  <Button size="sm" className="h-8 gap-1.5 text-xs font-semibold">
                    <PlusIcon className="size-3.5" />
                    <span>Add User</span>
                  </Button>
                }
              />
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs font-semibold"
                render={<Link href="/app/admin" />}
              >
                <UserCogIcon className="size-3.5" />
                <span>Admin Console</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs font-semibold"
                render={<Link href="/app/roles" />}
              >
                <KeyRoundIcon className="size-3.5" />
                <span>Roles</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs font-semibold"
                render={<Link href="/app/permissions" />}
              >
                <ShieldCheckIcon className="size-3.5" />
                <span>Permissions</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs font-semibold"
                render={<Link href="/app/audit-logs" />}
              >
                <FileTextIcon className="size-3.5" />
                <span>Audit Logs</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs font-semibold"
                render={<Link href="/app/settings" />}
              >
                <SettingsIcon className="size-3.5" />
                <span>Settings</span>
              </Button>
            </div>
          }
        />

        {/* Institutional Context Strip */}
        <div className="border-border/80 bg-muted/30 flex flex-wrap items-center justify-between gap-3 border px-4 py-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-foreground font-semibold">HVPM COET Amravati</span>
            <span className="text-muted-foreground">•</span>
            <span className="text-muted-foreground">Central Campus Platform</span>
          </div>
          <div className="flex items-center gap-2 font-mono text-[11px]">
            <span className="text-muted-foreground">Current Session:</span>
            {yearsLoading ? (
              <Skeleton className="h-4 w-16" />
            ) : activeYear ? (
              <Badge
                variant="outline"
                className="border-emerald-500/30 font-mono text-[10px] text-emerald-600 dark:text-emerald-400"
              >
                {activeYear.label} (Active)
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="border-amber-500/30 font-mono text-[10px] text-amber-600"
              >
                Setup Pending
              </Badge>
            )}
          </div>
        </div>

        {/* 6 Semantic KPI Cards with Intentional Color Coding */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {/* 1. Users: Blue */}
          <Link href="/app/users" className="group block focus:outline-hidden">
            <Card className="border-border/80 shadow-2xs transition-all duration-150 hover:border-blue-500/50 hover:bg-blue-500/[0.02]">
              <CardHeader className="flex flex-row items-center justify-between p-3 pb-1">
                <span className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">
                  Total Users
                </span>
                <div className="flex size-6 items-center justify-center rounded-sm bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <UsersIcon className="size-3.5" />
                </div>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                {usersLoading ? (
                  <Skeleton className="h-7 w-12" />
                ) : (
                  <div className="text-foreground font-mono text-xl font-bold">
                    {usersData?.pagination.total ?? 0}
                  </div>
                )}
                <div className="text-muted-foreground mt-1 inline-flex items-center gap-0.5 text-[10px] font-medium transition-colors group-hover:text-blue-600 dark:group-hover:text-blue-400">
                  <span>Manage accounts</span>
                  <ArrowRightIcon className="size-2.5 transition-transform group-hover:translate-x-0.5" />
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* 2. RBAC Roles: Violet */}
          <Link href="/app/roles" className="group block focus:outline-hidden">
            <Card className="border-border/80 shadow-2xs transition-all duration-150 hover:border-violet-500/50 hover:bg-violet-500/[0.02]">
              <CardHeader className="flex flex-row items-center justify-between p-3 pb-1">
                <span className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">
                  RBAC Roles
                </span>
                <div className="flex size-6 items-center justify-center rounded-sm bg-violet-500/10 text-violet-600 dark:text-violet-400">
                  <ShieldCheckIcon className="size-3.5" />
                </div>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                {rolesLoading ? (
                  <Skeleton className="h-7 w-12" />
                ) : (
                  <div className="text-foreground font-mono text-xl font-bold">
                    {rolesData?.pagination.total ?? 0}
                  </div>
                )}
                <div className="text-muted-foreground mt-1 inline-flex items-center gap-0.5 text-[10px] font-medium transition-colors group-hover:text-violet-600 dark:group-hover:text-violet-400">
                  <span>Configure roles</span>
                  <ArrowRightIcon className="size-2.5 transition-transform group-hover:translate-x-0.5" />
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* 3. Departments: Indigo */}
          <Link href="/app/academics/departments" className="group block focus:outline-hidden">
            <Card className="border-border/80 shadow-2xs transition-all duration-150 hover:border-indigo-500/50 hover:bg-indigo-500/[0.02]">
              <CardHeader className="flex flex-row items-center justify-between p-3 pb-1">
                <span className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">
                  Departments
                </span>
                <div className="flex size-6 items-center justify-center rounded-sm bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                  <Building2Icon className="size-3.5" />
                </div>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                {deptsLoading ? (
                  <Skeleton className="h-7 w-12" />
                ) : (
                  <div className="text-foreground font-mono text-xl font-bold">
                    {deptsData?.pagination.total ?? 0}
                  </div>
                )}
                <div className="text-muted-foreground mt-1 inline-flex items-center gap-0.5 text-[10px] font-medium transition-colors group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                  <span>View units</span>
                  <ArrowRightIcon className="size-2.5 transition-transform group-hover:translate-x-0.5" />
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* 4. Degree Programs: Indigo */}
          <Link href="/app/academics/programs" className="group block focus:outline-hidden">
            <Card className="border-border/80 shadow-2xs transition-all duration-150 hover:border-indigo-500/50 hover:bg-indigo-500/[0.02]">
              <CardHeader className="flex flex-row items-center justify-between p-3 pb-1">
                <span className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">
                  Degree Programs
                </span>
                <div className="flex size-6 items-center justify-center rounded-sm bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                  <LandmarkIcon className="size-3.5" />
                </div>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                {progsLoading ? (
                  <Skeleton className="h-7 w-12" />
                ) : (
                  <div className="text-foreground font-mono text-xl font-bold">
                    {progsData?.pagination.total ?? 0}
                  </div>
                )}
                <div className="text-muted-foreground mt-1 inline-flex items-center gap-0.5 text-[10px] font-medium transition-colors group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                  <span>Curricula</span>
                  <ArrowRightIcon className="size-2.5 transition-transform group-hover:translate-x-0.5" />
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* 5. Admissions: Emerald */}
          <Link href="/app/admissions" className="group block focus:outline-hidden">
            <Card className="border-border/80 shadow-2xs transition-all duration-150 hover:border-emerald-500/50 hover:bg-emerald-500/[0.02]">
              <CardHeader className="flex flex-row items-center justify-between p-3 pb-1">
                <span className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">
                  Admissions
                </span>
                <div className="flex size-6 items-center justify-center rounded-sm bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <GraduationCapIcon className="size-3.5" />
                </div>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                {admissionsLoading ? (
                  <Skeleton className="h-7 w-12" />
                ) : (
                  <div className="text-foreground font-mono text-xl font-bold">
                    {admissionsData?.pagination.total ?? 0}
                  </div>
                )}
                <div className="text-muted-foreground mt-1 inline-flex items-center gap-0.5 text-[10px] font-medium transition-colors group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                  <span>Enrollment registry</span>
                  <ArrowRightIcon className="size-2.5 transition-transform group-hover:translate-x-0.5" />
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* 6. Academic Term: Amber */}
          <Link href="/app/academics/academic-years" className="group block focus:outline-hidden">
            <Card className="border-border/80 shadow-2xs transition-all duration-150 hover:border-amber-500/50 hover:bg-amber-500/[0.02]">
              <CardHeader className="flex flex-row items-center justify-between p-3 pb-1">
                <span className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">
                  Academic Term
                </span>
                <div className="flex size-6 items-center justify-center rounded-sm bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <CalendarIcon className="size-3.5" />
                </div>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                {yearsLoading ? (
                  <Skeleton className="h-7 w-16" />
                ) : activeYear ? (
                  <div className="text-foreground truncate font-mono text-base font-bold">
                    {activeYear.label}
                  </div>
                ) : (
                  <div className="text-xs font-medium text-amber-600">Pending Setup</div>
                )}
                <div className="text-muted-foreground mt-1 inline-flex items-center gap-0.5 text-[10px] font-medium transition-colors group-hover:text-amber-600 dark:group-hover:text-amber-400">
                  <span>Terms & years</span>
                  <ArrowRightIcon className="size-2.5 transition-transform group-hover:translate-x-0.5" />
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Operational Administration Workspaces Grid */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-heading text-foreground text-sm font-bold tracking-tight">
                Operational Administration Workspaces
              </h2>
              <p className="text-muted-foreground text-xs">
                Direct access to institutional management consoles and daily academic operations.
              </p>
            </div>
            <Badge variant="outline" className="font-mono text-[10px]">
              Full Privileges
            </Badge>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {/* Admin Console */}
            <Link href="/app/admin" className="group block focus:outline-hidden">
              <div className="border-border/80 bg-card hover:border-primary/40 hover:bg-muted/20 flex h-full flex-col justify-between border p-3.5 shadow-2xs transition-all">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="bg-primary/10 text-primary flex size-8 items-center justify-center rounded-md">
                      <UserCogIcon className="size-4" />
                    </div>
                    <Badge variant="secondary" className="font-mono text-[9px] uppercase">
                      Admin Hub
                    </Badge>
                  </div>
                  <div>
                    <h3 className="text-foreground group-hover:text-primary text-xs font-semibold transition-colors">
                      Admin Console
                    </h3>
                    <p className="text-muted-foreground mt-0.5 text-[11px] leading-snug">
                      Daily operational administration, registry overview, and student lifecycle.
                    </p>
                  </div>
                </div>
                <div className="text-muted-foreground group-hover:text-primary border-border/40 mt-3 flex items-center justify-between border-t pt-2 text-[10px] font-medium transition-colors">
                  <span>Enter console</span>
                  <ArrowRightIcon className="size-3 transition-transform group-hover:translate-x-0.5" />
                </div>
              </div>
            </Link>

            {/* User Directory */}
            <Link href="/app/users" className="group block focus:outline-hidden">
              <div className="border-border/80 bg-card hover:border-primary/40 hover:bg-muted/20 flex h-full flex-col justify-between border p-3.5 shadow-2xs transition-all">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex size-8 items-center justify-center rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400">
                      <UsersIcon className="size-4" />
                    </div>
                    <Badge variant="outline" className="font-mono text-[9px]">
                      Identity
                    </Badge>
                  </div>
                  <div>
                    <h3 className="text-foreground group-hover:text-primary text-xs font-semibold transition-colors">
                      Users & Directory
                    </h3>
                    <p className="text-muted-foreground mt-0.5 text-[11px] leading-snug">
                      Institutional user profiles, account lifecycle, status audit, and role
                      bindings.
                    </p>
                  </div>
                </div>
                <div className="text-muted-foreground group-hover:text-primary border-border/40 mt-3 flex items-center justify-between border-t pt-2 text-[10px] font-medium transition-colors">
                  <span>Manage users</span>
                  <ArrowRightIcon className="size-3 transition-transform group-hover:translate-x-0.5" />
                </div>
              </div>
            </Link>

            {/* Academic Structure */}
            <Link href="/app/academics" className="group block focus:outline-hidden">
              <div className="border-border/80 bg-card hover:border-primary/40 hover:bg-muted/20 flex h-full flex-col justify-between border p-3.5 shadow-2xs transition-all">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex size-8 items-center justify-center rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                      <LandmarkIcon className="size-4" />
                    </div>
                    <Badge variant="outline" className="font-mono text-[9px]">
                      Structure
                    </Badge>
                  </div>
                  <div>
                    <h3 className="text-foreground group-hover:text-primary text-xs font-semibold transition-colors">
                      Academic Units
                    </h3>
                    <p className="text-muted-foreground mt-0.5 text-[11px] leading-snug">
                      Departments, degree programs, curricula versions, and semester course
                      catalogs.
                    </p>
                  </div>
                </div>
                <div className="text-muted-foreground group-hover:text-primary border-border/40 mt-3 flex items-center justify-between border-t pt-2 text-[10px] font-medium transition-colors">
                  <span>View curriculum</span>
                  <ArrowRightIcon className="size-3 transition-transform group-hover:translate-x-0.5" />
                </div>
              </div>
            </Link>

            {/* Admissions */}
            <Link href="/app/admissions" className="group block focus:outline-hidden">
              <div className="border-border/80 bg-card hover:border-primary/40 hover:bg-muted/20 flex h-full flex-col justify-between border p-3.5 shadow-2xs transition-all">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex size-8 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      <GraduationCapIcon className="size-4" />
                    </div>
                    <Badge variant="outline" className="font-mono text-[9px]">
                      Enrollment
                    </Badge>
                  </div>
                  <div>
                    <h3 className="text-foreground group-hover:text-primary text-xs font-semibold transition-colors">
                      Admissions Desk
                    </h3>
                    <p className="text-muted-foreground mt-0.5 text-[11px] leading-snug">
                      Intake candidates, verification workflows, quota allotments, and
                      confirmations.
                    </p>
                  </div>
                </div>
                <div className="text-muted-foreground group-hover:text-primary border-border/40 mt-3 flex items-center justify-between border-t pt-2 text-[10px] font-medium transition-colors">
                  <span>View registry</span>
                  <ArrowRightIcon className="size-3 transition-transform group-hover:translate-x-0.5" />
                </div>
              </div>
            </Link>

            {/* Timetable */}
            <Link href="/app/timetable" className="group block focus:outline-hidden">
              <div className="border-border/80 bg-card hover:border-primary/40 hover:bg-muted/20 flex h-full flex-col justify-between border p-3.5 shadow-2xs transition-all">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex size-8 items-center justify-center rounded-md bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                      <CalendarClockIcon className="size-4" />
                    </div>
                    <Badge variant="outline" className="font-mono text-[9px]">
                      Schedule
                    </Badge>
                  </div>
                  <div>
                    <h3 className="text-foreground group-hover:text-primary text-xs font-semibold transition-colors">
                      Class Timetable
                    </h3>
                    <p className="text-muted-foreground mt-0.5 text-[11px] leading-snug">
                      Campus weekly schedules, lecture time slots, room assignments, and conflict
                      audits.
                    </p>
                  </div>
                </div>
                <div className="text-muted-foreground group-hover:text-primary border-border/40 mt-3 flex items-center justify-between border-t pt-2 text-[10px] font-medium transition-colors">
                  <span>Inspect schedule</span>
                  <ArrowRightIcon className="size-3 transition-transform group-hover:translate-x-0.5" />
                </div>
              </div>
            </Link>

            {/* Attendance */}
            <Link href="/app/attendance" className="group block focus:outline-hidden">
              <div className="border-border/80 bg-card hover:border-primary/40 hover:bg-muted/20 flex h-full flex-col justify-between border p-3.5 shadow-2xs transition-all">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex size-8 items-center justify-center rounded-md bg-teal-500/10 text-teal-600 dark:text-teal-400">
                      <UserCheckIcon className="size-4" />
                    </div>
                    <Badge variant="outline" className="font-mono text-[9px]">
                      Telemetry
                    </Badge>
                  </div>
                  <div>
                    <h3 className="text-foreground group-hover:text-primary text-xs font-semibold transition-colors">
                      Attendance Telemetry
                    </h3>
                    <p className="text-muted-foreground mt-0.5 text-[11px] leading-snug">
                      Lecture attendance rosters, session lock audits, and statutory 75% monitoring.
                    </p>
                  </div>
                </div>
                <div className="text-muted-foreground group-hover:text-primary border-border/40 mt-3 flex items-center justify-between border-t pt-2 text-[10px] font-medium transition-colors">
                  <span>Monitor attendance</span>
                  <ArrowRightIcon className="size-3 transition-transform group-hover:translate-x-0.5" />
                </div>
              </div>
            </Link>

            {/* Faculty Assignments */}
            <Link href="/app/faculty-assignments" className="group block focus:outline-hidden">
              <div className="border-border/80 bg-card hover:border-primary/40 hover:bg-muted/20 flex h-full flex-col justify-between border p-3.5 shadow-2xs transition-all">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex size-8 items-center justify-center rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400">
                      <IdCardIcon className="size-4" />
                    </div>
                    <Badge variant="outline" className="font-mono text-[9px]">
                      Workload
                    </Badge>
                  </div>
                  <div>
                    <h3 className="text-foreground group-hover:text-primary text-xs font-semibold transition-colors">
                      Faculty Assignments
                    </h3>
                    <p className="text-muted-foreground mt-0.5 text-[11px] leading-snug">
                      Subject component allocations, teaching loads, and instructor assignments.
                    </p>
                  </div>
                </div>
                <div className="text-muted-foreground group-hover:text-primary border-border/40 mt-3 flex items-center justify-between border-t pt-2 text-[10px] font-medium transition-colors">
                  <span>View assignments</span>
                  <ArrowRightIcon className="size-3 transition-transform group-hover:translate-x-0.5" />
                </div>
              </div>
            </Link>

            {/* Promotions */}
            <Link href="/app/promotions" className="group block focus:outline-hidden">
              <div className="border-border/80 bg-card hover:border-primary/40 hover:bg-muted/20 flex h-full flex-col justify-between border p-3.5 shadow-2xs transition-all">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex size-8 items-center justify-center rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400">
                      <TrendingUpIcon className="size-4" />
                    </div>
                    <Badge variant="outline" className="font-mono text-[9px]">
                      Academic
                    </Badge>
                  </div>
                  <div>
                    <h3 className="text-foreground group-hover:text-primary text-xs font-semibold transition-colors">
                      Student Promotions
                    </h3>
                    <p className="text-muted-foreground mt-0.5 text-[11px] leading-snug">
                      Semester progression batches, eligibility evaluation, and standing decisions.
                    </p>
                  </div>
                </div>
                <div className="text-muted-foreground group-hover:text-primary border-border/40 mt-3 flex items-center justify-between border-t pt-2 text-[10px] font-medium transition-colors">
                  <span>Inspect batches</span>
                  <ArrowRightIcon className="size-3 transition-transform group-hover:translate-x-0.5" />
                </div>
              </div>
            </Link>
          </div>
        </div>

        {/* Live Operational Tables & Governance Panels */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left Column (2 Cols): Live Operational Tables */}
          <div className="space-y-6 lg:col-span-2">
            {/* FastTab 1: Recent User Provisioning */}
            <Card className="border-border/80 shadow-2xs">
              <CardHeader className="border-border/40 flex flex-row items-center justify-between border-b pb-3">
                <div>
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                    <UsersIcon className="text-primary size-4" />
                    <span>Recent User Provisioning</span>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Latest accounts provisioned across institutional domains.
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1 text-xs"
                  render={<Link href="/app/users" />}
                >
                  <span>View All Users</span>
                  <ArrowRightIcon className="size-3.5" />
                </Button>
              </CardHeader>
              <CardContent className="pt-3">
                {usersLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-9 w-full" />
                    <Skeleton className="h-9 w-full" />
                    <Skeleton className="h-9 w-full" />
                  </div>
                ) : usersData?.items?.length === 0 ? (
                  <p className="text-muted-foreground py-4 text-center text-xs">
                    No users provisioned in the system yet.
                  </p>
                ) : (
                  <div className="divide-border/40 divide-y text-xs">
                    {usersData?.items?.map((user) => (
                      <div key={user.id} className="flex items-center justify-between gap-4 py-2.5">
                        <div className="flex min-w-0 flex-col">
                          <Link
                            href={`/app/users/${user.id}`}
                            className="text-foreground hover:text-primary truncate font-semibold hover:underline"
                          >
                            {user.fullName}
                          </Link>
                          <span className="text-muted-foreground truncate font-mono text-[11px]">
                            {user.email}
                          </span>
                        </div>
                        <div className="flex shrink-0 items-center gap-3">
                          <UserStatusBadge status={user.status} />
                          <span className="text-muted-foreground hidden font-mono text-[11px] sm:inline">
                            {formatDate(user.createdAt)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* FastTab 2: Recent Student Admissions */}
            <Card className="border-border/80 shadow-2xs">
              <CardHeader className="border-border/40 flex flex-row items-center justify-between border-b pb-3">
                <div>
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                    <GraduationCapIcon className="text-primary size-4" />
                    <span>Recent Admissions</span>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Latest admitted candidate registrations and confirmations.
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1 text-xs"
                  render={<Link href="/app/admissions" />}
                >
                  <span>View Registry</span>
                  <ArrowRightIcon className="size-3.5" />
                </Button>
              </CardHeader>
              <CardContent className="pt-3">
                {admissionsLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-9 w-full" />
                    <Skeleton className="h-9 w-full" />
                  </div>
                ) : admissionsData?.items?.length === 0 ? (
                  <p className="text-muted-foreground py-4 text-center text-xs">
                    No student admissions recorded yet.
                  </p>
                ) : (
                  <div className="divide-border/40 divide-y text-xs">
                    {admissionsData?.items?.map((adm) => (
                      <div key={adm.id} className="flex items-center justify-between gap-4 py-2.5">
                        <div className="flex min-w-0 flex-col">
                          <Link
                            href={`/app/admissions/${adm.id}`}
                            className="text-foreground hover:text-primary truncate font-mono font-semibold hover:underline"
                          >
                            {adm.admissionNumber}
                          </Link>
                          <span className="text-muted-foreground text-[11px]">
                            {adm.admissionType} &bull; {adm.quota.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <div className="flex shrink-0 items-center gap-3">
                          <Badge
                            variant={adm.status === 'CONFIRMED' ? 'outline' : 'destructive'}
                            className="font-mono text-[10px] uppercase"
                          >
                            {adm.status}
                          </Badge>
                          <span className="text-muted-foreground hidden font-mono text-[11px] sm:inline">
                            {formatDate(adm.admissionDate)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column (1 Col): Governance, Configuration & Audit */}
          <div className="space-y-6">
            {/* Section: Platform Governance & RBAC */}
            <Card className="border-border/80 shadow-2xs">
              <CardHeader className="border-border/40 border-b pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <ShieldCheckIcon className="text-primary size-4" />
                  <span>Security & Authorization</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Role-based access matrix and permission boundaries.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 pt-4">
                <Link
                  href="/app/roles"
                  className="border-border/70 hover:bg-muted/40 hover:border-primary/40 flex items-center justify-between border p-2.5 text-xs transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <KeyRoundIcon className="text-primary size-4 shrink-0" />
                    <div>
                      <div className="text-foreground font-semibold">Role Definitions</div>
                      <div className="text-muted-foreground text-[11px]">
                        {rolesData?.pagination.total ?? 0} active roles configured
                      </div>
                    </div>
                  </div>
                  <ArrowRightIcon className="text-muted-foreground size-3.5" />
                </Link>

                <Link
                  href="/app/permissions"
                  className="border-border/70 hover:bg-muted/40 hover:border-primary/40 flex items-center justify-between border p-2.5 text-xs transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <ShieldCheckIcon className="text-primary size-4 shrink-0" />
                    <div>
                      <div className="text-foreground font-semibold">Permission Catalog</div>
                      <div className="text-muted-foreground text-[11px]">
                        Platform-wide granular action gates
                      </div>
                    </div>
                  </div>
                  <ArrowRightIcon className="text-muted-foreground size-3.5" />
                </Link>

                <Link
                  href="/app/settings"
                  className="border-border/70 hover:bg-muted/40 hover:border-primary/40 flex items-center justify-between border p-2.5 text-xs transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <SettingsIcon className="text-primary size-4 shrink-0" />
                    <div>
                      <div className="text-foreground font-semibold">System Settings</div>
                      <div className="text-muted-foreground text-[11px]">
                        Institutional configuration parameters
                      </div>
                    </div>
                  </div>
                  <ArrowRightIcon className="text-muted-foreground size-3.5" />
                </Link>
              </CardContent>
            </Card>

            {/* Section: Audit & Security Trail */}
            <Card className="border-border/80 bg-muted/20 shadow-2xs">
              <CardHeader className="border-border/40 border-b pb-3">
                <CardTitle className="text-foreground flex items-center gap-2 text-sm font-semibold">
                  <ClockIcon className="text-muted-foreground size-4" />
                  <span>Audit & Security Trail</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Platform transaction telemetry and operator audit records.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 pt-4 text-xs">
                <div className="border-border/80 bg-card border p-3">
                  <div className="flex items-start gap-2">
                    <CheckCircle2Icon className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <div className="space-y-1">
                      <p className="text-foreground text-xs font-semibold">Audit Service Online</p>
                      <p className="text-muted-foreground text-[11px] leading-relaxed">
                        Transaction journal and actor accountability logs active. All administrative
                        mutations are recorded with cryptographic timestamps.
                      </p>
                    </div>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-full justify-between text-xs font-medium"
                  render={<Link href="/app/audit-logs" />}
                >
                  <span>Open Audit Telemetry Log</span>
                  <ArrowRightIcon className="size-3.5" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </RequireRole>
  );
}
