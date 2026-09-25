'use client';

import {
  ArrowRightIcon,
  BookOpenIcon,
  Building2Icon,
  CalendarCheckIcon,
  CalendarIcon,
  GraduationCapIcon,
  PlusIcon,
  UsersIcon,
} from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { PermissionGuard } from '@/components/auth/permission-guard';
import { RequireRole } from '@/components/auth/require-role';
import { PageHeader } from '@/components/erp/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAcademicYears } from '@/features/academics/hooks/use-academic-years';
import { useDepartments } from '@/features/academics/hooks/use-departments';
import { usePrograms } from '@/features/academics/hooks/use-programs';
import { AdmissionStatusBadge } from '@/features/admissions/components/admission-status-badge';
import { useAdmissions } from '@/features/admissions/hooks/use-admissions';
import { UserStatusBadge } from '@/features/users/components/user-status-badge';
import { useUsers } from '@/features/users/hooks/use-users';
import { formatDate } from '@/lib/formatters';

export default function AdminRoleCenterPage() {
  const { data: usersData, isLoading: usersLoading } = useUsers({ limit: 5 });
  const { data: deptsData, isLoading: deptsLoading } = useDepartments({ limit: 5 });
  const { data: _progsData, isLoading: _progsLoading } = usePrograms({ limit: 5 });
  const { data: admissionsData, isLoading: admissionsLoading } = useAdmissions({ limit: 5 });
  const { data: yearsData, isLoading: yearsLoading } = useAcademicYears({ limit: 5 });

  const activeYear = yearsData?.items?.find((y) => y.isActive);

  return (
    <RequireRole allow={['admin', 'super_admin']}>
      <div className="space-y-6">
        {/* Page Header with Dynamics 365 BC Role Center Title & Operational Quick Actions */}
        <PageHeader
          title="Admin Role Center"
          description="Daily operational administration, academic registries, and student lifecycle management for HVPM COET."
          badge="Institutional Operations"
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <PermissionGuard require="user:create">
                <Button
                  render={<Link href="/app/users/new" />}
                  size="sm"
                  className="h-8 gap-1.5 text-xs font-semibold"
                >
                  <PlusIcon className="size-3.5" />
                  <span>Add User</span>
                </Button>
              </PermissionGuard>
              <PermissionGuard require="admission:read">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 text-xs font-semibold"
                  render={<Link href="/app/admissions" />}
                >
                  <GraduationCapIcon className="size-3.5" />
                  <span>Admissions</span>
                </Button>
              </PermissionGuard>
              <PermissionGuard require="department:read">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 text-xs font-semibold"
                  render={<Link href="/app/academics" />}
                >
                  <Building2Icon className="size-3.5" />
                  <span>Academic Units</span>
                </Button>
              </PermissionGuard>
            </div>
          }
        />

        {/* Operational Cues / Real Metrics Bar */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Card className="border-border/80 hover:border-primary/40 shadow-2xs transition-colors">
            <CardHeader className="flex flex-row items-center justify-between px-4 pt-3 pb-1">
              <span className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">
                Enrolled Admissions
              </span>
              <GraduationCapIcon className="text-primary size-4" />
            </CardHeader>
            <CardContent className="px-4 pt-0 pb-3">
              {admissionsLoading ? (
                <Skeleton className="h-7 w-12" />
              ) : (
                <div className="text-foreground font-mono text-2xl font-bold">
                  {admissionsData?.pagination.total ?? 0}
                </div>
              )}
              <Link
                href="/app/admissions"
                className="text-primary mt-1 inline-flex items-center gap-0.5 text-[10px] font-medium hover:underline"
              >
                <span>View admission rolls</span>
                <ArrowRightIcon className="size-2.5" />
              </Link>
            </CardContent>
          </Card>

          <Card className="border-border/80 hover:border-primary/40 shadow-2xs transition-colors">
            <CardHeader className="flex flex-row items-center justify-between px-4 pt-3 pb-1">
              <span className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">
                Total Accounts
              </span>
              <UsersIcon className="text-primary size-4" />
            </CardHeader>
            <CardContent className="px-4 pt-0 pb-3">
              {usersLoading ? (
                <Skeleton className="h-7 w-12" />
              ) : (
                <div className="text-foreground font-mono text-2xl font-bold">
                  {usersData?.pagination.total ?? 0}
                </div>
              )}
              <Link
                href="/app/users"
                className="text-primary mt-1 inline-flex items-center gap-0.5 text-[10px] font-medium hover:underline"
              >
                <span>User accounts</span>
                <ArrowRightIcon className="size-2.5" />
              </Link>
            </CardContent>
          </Card>

          <Card className="border-border/80 hover:border-primary/40 shadow-2xs transition-colors">
            <CardHeader className="flex flex-row items-center justify-between px-4 pt-3 pb-1">
              <span className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">
                Academic Departments
              </span>
              <Building2Icon className="text-primary size-4" />
            </CardHeader>
            <CardContent className="px-4 pt-0 pb-3">
              {deptsLoading ? (
                <Skeleton className="h-7 w-12" />
              ) : (
                <div className="text-foreground font-mono text-2xl font-bold">
                  {deptsData?.pagination.total ?? 0}
                </div>
              )}
              <Link
                href="/app/academics/departments"
                className="text-primary mt-1 inline-flex items-center gap-0.5 text-[10px] font-medium hover:underline"
              >
                <span>Manage departments</span>
                <ArrowRightIcon className="size-2.5" />
              </Link>
            </CardContent>
          </Card>

          <Card className="border-border/80 hover:border-primary/40 shadow-2xs transition-colors">
            <CardHeader className="flex flex-row items-center justify-between px-4 pt-3 pb-1">
              <span className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">
                Current Session
              </span>
              <CalendarIcon className="text-primary size-4" />
            </CardHeader>
            <CardContent className="px-4 pt-0 pb-3">
              {yearsLoading ? (
                <Skeleton className="h-7 w-20" />
              ) : activeYear ? (
                <div className="text-foreground truncate font-mono text-xl font-bold">
                  {activeYear.label}
                </div>
              ) : (
                <div className="text-xs font-medium text-amber-600">Pending Term Setup</div>
              )}
              <Link
                href="/app/academics/academic-years"
                className="text-primary mt-1 inline-flex items-center gap-0.5 text-[10px] font-medium hover:underline"
              >
                <span>Session schedule</span>
                <ArrowRightIcon className="size-2.5" />
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Operational Grids */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left Column: Recent Admissions & Users */}
          <div className="space-y-6 lg:col-span-2">
            <Card className="border-border/80 shadow-sm">
              <CardHeader className="border-border/40 flex flex-row items-center justify-between border-b pb-3">
                <div>
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                    <GraduationCapIcon className="text-primary size-4" />
                    <span>Latest Admissions Roll</span>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Recently processed student enrollments for HVPM COET.
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1 text-xs"
                  render={<Link href="/app/admissions" />}
                >
                  <span>Full Roll</span>
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
                    No admission records enrolled in the active session.
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
                          <AdmissionStatusBadge status={adm.status} />
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

            <Card className="border-border/80 shadow-sm">
              <CardHeader className="border-border/40 flex flex-row items-center justify-between border-b pb-3">
                <div>
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                    <UsersIcon className="text-primary size-4" />
                    <span>Recent User Provisioning</span>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Accounts provisioned under the institutional domain.
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1 text-xs"
                  render={<Link href="/app/users" />}
                >
                  <span>Users</span>
                  <ArrowRightIcon className="size-3.5" />
                </Button>
              </CardHeader>
              <CardContent className="pt-3">
                {usersLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-9 w-full" />
                    <Skeleton className="h-9 w-full" />
                  </div>
                ) : usersData?.items?.length === 0 ? (
                  <p className="text-muted-foreground py-4 text-center text-xs">
                    No accounts provisioned yet.
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
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Operational Quick Access */}
          <div className="space-y-6">
            <Card className="border-border/80 shadow-sm">
              <CardHeader className="border-border/40 border-b pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <BookOpenIcon className="text-primary size-4" />
                  <span>Operational Workflows</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Direct access to daily college administration modules.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2.5 pt-4">
                <Link
                  href="/app/admissions"
                  className="border-border/70 hover:bg-accent/40 flex items-center justify-between rounded-md border p-2.5 text-xs transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <GraduationCapIcon className="text-primary size-4 shrink-0" />
                    <div>
                      <div className="text-foreground font-semibold">Student Admissions</div>
                      <div className="text-muted-foreground text-[11px]">
                        Manage enrollment intake
                      </div>
                    </div>
                  </div>
                  <ArrowRightIcon className="text-muted-foreground size-3.5" />
                </Link>

                <Link
                  href="/app/academics/departments"
                  className="border-border/70 hover:bg-accent/40 flex items-center justify-between rounded-md border p-2.5 text-xs transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <Building2Icon className="text-primary size-4 shrink-0" />
                    <div>
                      <div className="text-foreground font-semibold">Academic Departments</div>
                      <div className="text-muted-foreground text-[11px]">
                        Manage college divisions
                      </div>
                    </div>
                  </div>
                  <ArrowRightIcon className="text-muted-foreground size-3.5" />
                </Link>

                <Link
                  href="/app/academics/programs"
                  className="border-border/70 hover:bg-accent/40 flex items-center justify-between rounded-md border p-2.5 text-xs transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <GraduationCapIcon className="text-primary size-4 shrink-0" />
                    <div>
                      <div className="text-foreground font-semibold">Degree Programs</div>
                      <div className="text-muted-foreground text-[11px]">Curricula & semesters</div>
                    </div>
                  </div>
                  <ArrowRightIcon className="text-muted-foreground size-3.5" />
                </Link>

                <Link
                  href="/app/timetable"
                  className="border-border/70 hover:bg-accent/40 flex items-center justify-between rounded-md border p-2.5 text-xs transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <CalendarCheckIcon className="text-primary size-4 shrink-0" />
                    <div>
                      <div className="text-foreground font-semibold">Timetable & Schedule</div>
                      <div className="text-muted-foreground text-[11px]">Weekly lecture slots</div>
                    </div>
                  </div>
                  <ArrowRightIcon className="text-muted-foreground size-3.5" />
                </Link>

                <Link
                  href="/app/attendance"
                  className="border-border/70 hover:bg-accent/40 flex items-center justify-between rounded-md border p-2.5 text-xs transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <CalendarIcon className="text-primary size-4 shrink-0" />
                    <div>
                      <div className="text-foreground font-semibold">Attendance Records</div>
                      <div className="text-muted-foreground text-[11px]">Daily attendance logs</div>
                    </div>
                  </div>
                  <ArrowRightIcon className="text-muted-foreground size-3.5" />
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </RequireRole>
  );
}
