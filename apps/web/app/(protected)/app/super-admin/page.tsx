'use client';

import {
  AlertCircleIcon,
  ArrowRightIcon,
  ClockIcon,
  GraduationCapIcon,
  KeyRoundIcon,
  PlusIcon,
  SettingsIcon,
  ShieldCheckIcon,
  UsersIcon,
} from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

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
import { UserStatusBadge } from '@/features/users/components/user-status-badge';
import { useUsers } from '@/features/users/hooks/use-users';
import { formatDate } from '@/lib/formatters';

export default function SuperAdminRoleCenterPage() {
  const { data: usersData, isLoading: usersLoading } = useUsers({
    limit: 5,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });
  const { data: rolesData, isLoading: rolesLoading } = useRoles({ limit: 5 });
  const { data: deptsData, isLoading: deptsLoading } = useDepartments({ limit: 5 });
  const { data: progsData, isLoading: progsLoading } = usePrograms({ limit: 5 });
  const { data: admissionsData, isLoading: admissionsLoading } = useAdmissions({ limit: 5 });
  const { data: yearsData, isLoading: yearsLoading } = useAcademicYears({ limit: 5 });

  const activeYear = yearsData?.items?.find((y) => y.isActive);

  return (
    <div className="space-y-6">
      {/* Page Header with Dynamics 365 BC Role Center Title & Quick Actions */}
      <PageHeader
        title="Super Admin Role Center"
        description="Strategic governance, platform management, and system-wide identity administration for HVPM COET."
        badge="System Administration"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              render={<Link href="/app/users/new" />}
              size="sm"
              className="h-8 gap-1.5 text-xs font-semibold"
            >
              <PlusIcon className="size-3.5" />
              <span>Add User</span>
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
              render={<Link href="/app/settings" />}
            >
              <SettingsIcon className="size-3.5" />
              <span>Settings</span>
            </Button>
          </div>
        }
      />

      {/* Operational Cues / Real Metrics Bar (Dynamics 365 BC Style) */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Card className="border-border/80 hover:border-primary/40 shadow-2xs transition-colors">
          <CardHeader className="p-3 pb-1">
            <span className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">
              Total Users
            </span>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            {usersLoading ? (
              <Skeleton className="h-7 w-12" />
            ) : (
              <div className="text-foreground font-mono text-xl font-bold">
                {usersData?.pagination.total ?? 0}
              </div>
            )}
            <Link
              href="/app/users"
              className="text-primary mt-1 inline-flex items-center gap-0.5 text-[10px] font-medium hover:underline"
            >
              <span>Manage accounts</span>
              <ArrowRightIcon className="size-2.5" />
            </Link>
          </CardContent>
        </Card>

        <Card className="border-border/80 hover:border-primary/40 shadow-2xs transition-colors">
          <CardHeader className="p-3 pb-1">
            <span className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">
              RBAC Roles
            </span>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            {rolesLoading ? (
              <Skeleton className="h-7 w-12" />
            ) : (
              <div className="text-foreground font-mono text-xl font-bold">
                {rolesData?.pagination.total ?? 0}
              </div>
            )}
            <Link
              href="/app/roles"
              className="text-primary mt-1 inline-flex items-center gap-0.5 text-[10px] font-medium hover:underline"
            >
              <span>Configure roles</span>
              <ArrowRightIcon className="size-2.5" />
            </Link>
          </CardContent>
        </Card>

        <Card className="border-border/80 hover:border-primary/40 shadow-2xs transition-colors">
          <CardHeader className="p-3 pb-1">
            <span className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">
              Departments
            </span>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            {deptsLoading ? (
              <Skeleton className="h-7 w-12" />
            ) : (
              <div className="text-foreground font-mono text-xl font-bold">
                {deptsData?.pagination.total ?? 0}
              </div>
            )}
            <Link
              href="/app/academics/departments"
              className="text-primary mt-1 inline-flex items-center gap-0.5 text-[10px] font-medium hover:underline"
            >
              <span>View units</span>
              <ArrowRightIcon className="size-2.5" />
            </Link>
          </CardContent>
        </Card>

        <Card className="border-border/80 hover:border-primary/40 shadow-2xs transition-colors">
          <CardHeader className="p-3 pb-1">
            <span className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">
              Degree Programs
            </span>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            {progsLoading ? (
              <Skeleton className="h-7 w-12" />
            ) : (
              <div className="text-foreground font-mono text-xl font-bold">
                {progsData?.pagination.total ?? 0}
              </div>
            )}
            <Link
              href="/app/academics/programs"
              className="text-primary mt-1 inline-flex items-center gap-0.5 text-[10px] font-medium hover:underline"
            >
              <span>Curricula</span>
              <ArrowRightIcon className="size-2.5" />
            </Link>
          </CardContent>
        </Card>

        <Card className="border-border/80 hover:border-primary/40 shadow-2xs transition-colors">
          <CardHeader className="p-3 pb-1">
            <span className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">
              Admissions
            </span>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            {admissionsLoading ? (
              <Skeleton className="h-7 w-12" />
            ) : (
              <div className="text-foreground font-mono text-xl font-bold">
                {admissionsData?.pagination.total ?? 0}
              </div>
            )}
            <Link
              href="/app/admissions"
              className="text-primary mt-1 inline-flex items-center gap-0.5 text-[10px] font-medium hover:underline"
            >
              <span>Enrollment registry</span>
              <ArrowRightIcon className="size-2.5" />
            </Link>
          </CardContent>
        </Card>

        <Card className="border-border/80 hover:border-primary/40 shadow-2xs transition-colors">
          <CardHeader className="p-3 pb-1">
            <span className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">
              Academic Term
            </span>
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
            <Link
              href="/app/academics/academic-years"
              className="text-primary mt-1 inline-flex items-center gap-0.5 text-[10px] font-medium hover:underline"
            >
              <span>Terms</span>
              <ArrowRightIcon className="size-2.5" />
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Role Center Operational FastTabs */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column (2 Cols): Live Operational Tables */}
        <div className="space-y-6 lg:col-span-2">
          {/* FastTab 1: Recent User Provisioning */}
          <Card className="border-border/80 shadow-sm">
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
          <Card className="border-border/80 shadow-sm">
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
          <Card className="border-border/80 shadow-sm">
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
                className="border-border/70 hover:bg-accent/40 flex items-center justify-between rounded-md border p-2.5 text-xs transition-colors"
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
                className="border-border/70 hover:bg-accent/40 flex items-center justify-between rounded-md border p-2.5 text-xs transition-colors"
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
                className="border-border/70 hover:bg-accent/40 flex items-center justify-between rounded-md border p-2.5 text-xs transition-colors"
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

          {/* Section: Audit & Security Trail (Honest Status Display) */}
          <Card className="border-border/80 bg-muted/20 shadow-sm">
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
              <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-amber-900 dark:text-amber-200">
                <div className="flex items-start gap-2">
                  <AlertCircleIcon className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                  <div className="space-y-1">
                    <p className="text-xs font-semibold">Query Endpoint Staged</p>
                    <p className="text-[11px] text-amber-800 dark:text-amber-300">
                      Audit log ingestion is active in backend database models. The query controller
                      endpoint is pending deployment in an upcoming core patch.
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
                <span>View Audit Telemetry Console</span>
                <ArrowRightIcon className="size-3.5" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
