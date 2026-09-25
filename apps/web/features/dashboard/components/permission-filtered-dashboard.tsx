import { ArrowRightIcon, CheckCircle2Icon, ShieldCheckIcon } from 'lucide-react';
import Link from 'next/link';

import type { DashboardSection } from '../config/dashboard-sections';

import { DashboardShell } from './dashboard-shell';
import { EmptyDashboardState } from './empty-dashboard-state';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuth } from '@/features/auth';
import { hasPermission } from '@/features/rbac';

interface PermissionFilteredDashboardProps {
  title: string;
  description: string;
  sections: readonly DashboardSection[];
}

/**
 * Enterprise Role Center for S.P.A.R.K. College ERP.
 * Inspired by the Role Center architecture of Microsoft Dynamics 365 Business Central:
 * Surfaces role-relevant headlines, activity cues, and dense operational directory tables
 * while strictly adhering to real, backend-granted permissions.
 */
export function PermissionFilteredDashboard({
  title,
  description,
  sections,
}: PermissionFilteredDashboardProps) {
  const { currentUser, roles, permissions } = useAuth();

  const visible = sections.filter(
    (section) => section.permission === undefined || hasPermission(permissions, section.permission),
  );

  const userName = currentUser?.user
    ? [currentUser.user.firstName, currentUser.user.lastName].filter(Boolean).join(' ')
    : 'Administrator';

  const primaryRole = roles[0]?.displayName ?? 'Authorized User';

  return (
    <DashboardShell
      title={title}
      description={description}
      headerMeta={
        <Badge
          variant="outline"
          className="border-primary/30 text-primary bg-primary/5 px-2 py-0.5 font-mono text-[11px] uppercase"
        >
          {primaryRole}
        </Badge>
      }
    >
      {/* 1. Role Center Headline Strip */}
      <Card className="border-border/80 from-card via-muted/20 to-card rounded-lg border bg-linear-to-r shadow-xs">
        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground font-mono text-xs font-semibold tracking-wider uppercase">
                Role Center
              </span>
              <span className="text-muted-foreground/60">•</span>
              <span className="text-muted-foreground text-xs">HVPM COET Amravati</span>
            </div>
            <h2 className="text-foreground text-base font-bold sm:text-lg">
              Welcome back, {userName}
            </h2>
            <p className="text-muted-foreground text-xs leading-relaxed">
              Academic Session 2025–26 (Odd Semester) • Node AMV-01 Operational
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <CheckCircle2Icon className="size-3.5" aria-hidden="true" />
              <span>System Nominal</span>
            </span>
          </div>
        </CardContent>
      </Card>

      {visible.length === 0 ? (
        <EmptyDashboardState />
      ) : (
        <>
          {/* 2. Activity Cues (Role Cue Tiles) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-muted-foreground font-mono text-xs font-bold tracking-wider uppercase">
                Active Workspaces &amp; Cues
              </h3>
              <span className="text-muted-foreground text-xs">
                {visible.length} {visible.length === 1 ? 'module' : 'modules'} authorized
              </span>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {visible.map((section) => {
                const Icon = section.icon;
                return (
                  <Link
                    key={section.id}
                    href={section.href ?? '#'}
                    className="group border-border/80 bg-card hover:border-primary/50 hover:bg-muted/10 relative flex flex-col justify-between rounded-lg border p-3.5 transition-all hover:shadow-xs"
                  >
                    <div className="mb-2.5 flex items-center justify-between">
                      <div className="border-primary/20 bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground flex size-8 items-center justify-center rounded-md border transition-colors">
                        <Icon className="size-4" aria-hidden="true" />
                      </div>
                      <Badge
                        variant="secondary"
                        className="text-muted-foreground h-4 px-1.5 py-0 font-mono text-[10px] font-normal uppercase"
                      >
                        Operational
                      </Badge>
                    </div>
                    <div className="space-y-0.5">
                      <div className="flex items-center justify-between">
                        <span className="text-foreground group-hover:text-primary text-xs font-semibold transition-colors">
                          {section.title}
                        </span>
                        <ArrowRightIcon className="text-muted-foreground group-hover:text-primary size-3 transition-all group-hover:translate-x-0.5" />
                      </div>
                      <p className="text-muted-foreground line-clamp-1 text-[11px] leading-snug">
                        {section.description}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* 3. Operational Workspaces Table */}
          <Card className="border-border/80 bg-card rounded-lg border shadow-xs">
            <CardHeader className="border-border/70 border-b pb-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-foreground font-heading text-sm font-bold">
                    Operational Directory &amp; Functional Workspaces
                  </CardTitle>
                  <CardDescription className="text-muted-foreground mt-0.5 text-xs">
                    Authorized enterprise domains available to your role profile
                  </CardDescription>
                </div>
                <Badge
                  variant="outline"
                  className="text-muted-foreground w-fit font-mono text-[10px] uppercase"
                >
                  RBAC Verified
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/70 border-b hover:bg-transparent">
                    <TableHead className="w-[35%] text-xs font-semibold">Workspace</TableHead>
                    <TableHead className="hidden text-xs font-semibold md:table-cell">
                      Scope / Permission
                    </TableHead>
                    <TableHead className="text-xs font-semibold">Status</TableHead>
                    <TableHead className="text-right text-xs font-semibold">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visible.map((section) => {
                    const Icon = section.icon;
                    const canPerformAction =
                      section.actionHref !== undefined &&
                      section.actionPermission !== undefined &&
                      hasPermission(permissions, section.actionPermission);

                    return (
                      <TableRow key={section.id} className="hover:bg-muted/30">
                        <TableCell className="py-2.5">
                          <div className="flex items-center gap-2.5">
                            <div className="border-primary/20 bg-primary/10 text-primary flex size-7 shrink-0 items-center justify-center rounded-md border">
                              <Icon className="size-3.5" aria-hidden="true" />
                            </div>
                            <div className="space-y-0.5">
                              <p className="text-foreground text-xs leading-none font-semibold">
                                {section.title}
                              </p>
                              <p className="text-muted-foreground line-clamp-1 text-[11px] leading-snug">
                                {section.description}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden py-2.5 md:table-cell">
                          {section.permission ? (
                            <code className="bg-muted text-muted-foreground border-border/60 rounded border px-1.5 py-0.5 font-mono text-[10px]">
                              {section.permission}
                            </code>
                          ) : (
                            <span className="text-muted-foreground text-[11px]">
                              General Access
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="py-2.5">
                          <span className="text-muted-foreground inline-flex items-center gap-1.5 text-[11px]">
                            <span
                              className="size-1.5 rounded-full bg-emerald-500"
                              aria-hidden="true"
                            />
                            Active
                          </span>
                        </TableCell>
                        <TableCell className="py-2.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {canPerformAction && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="hidden h-7 px-2 text-xs font-medium sm:inline-flex"
                                render={<Link href={section.actionHref!} />}
                              >
                                {section.actionLabel}
                              </Button>
                            )}
                            {section.href && (
                              <Button
                                size="sm"
                                className="h-7 px-2.5 text-xs font-medium"
                                render={<Link href={section.href} />}
                              >
                                <span>Open</span>
                                <ArrowRightIcon className="size-3" aria-hidden="true" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* 4. Governance & Compliance Information */}
          <div className="text-muted-foreground border-border/70 bg-muted/20 flex items-center justify-between rounded-md border p-3 text-[11px]">
            <div className="flex items-center gap-2">
              <ShieldCheckIcon className="text-primary size-4 shrink-0" aria-hidden="true" />
              <span>
                Institutional Operations: S.P.A.R.K. role-based authorization for HVPM COET.
              </span>
            </div>
            <span className="hidden font-mono text-[10px] md:inline-block">Node AMV-01</span>
          </div>
        </>
      )}
    </DashboardShell>
  );
}
