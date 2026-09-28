'use client';

import { AlertCircle, Filter, Lock, Percent, RefreshCw, Search, Unlock, Users } from 'lucide-react';
import * as React from 'react';

import { useAttendanceSessions } from '../hooks/use-attendance';
import type { AttendanceSessionStatus } from '../schemas/attendance.schema';

import { PageHeader } from '@/components/erp/page-header';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

export function InstitutionalAttendanceView() {
  const [statusFilter, setStatusFilter] = React.useState<AttendanceSessionStatus | 'ALL'>('ALL');
  const [search, setSearch] = React.useState('');
  const [page, setPage] = React.useState(1);

  const queryParams = React.useMemo(() => {
    return {
      page,
      limit: 20,
      ...(statusFilter !== 'ALL' && { status: statusFilter }),
      sortBy: 'createdAt' as const,
      sortOrder: 'desc' as const,
    };
  }, [page, statusFilter]);

  const { data, isLoading, isError, error, refetch, isFetching } =
    useAttendanceSessions(queryParams);

  const sessions = React.useMemo(() => data?.items ?? [], [data?.items]);
  const total = data?.pagination.total ?? 0;

  const filteredSessions = React.useMemo(() => {
    if (!search.trim()) return sessions;
    const q = search.toLowerCase();
    return sessions.filter(
      (s) =>
        s.id.toLowerCase().includes(q) ||
        s.lectureId.toLowerCase().includes(q) ||
        s.takenByUserId.toLowerCase().includes(q),
    );
  }, [sessions, search]);

  const openCount = sessions.filter((s) => s.status === 'OPEN').length;
  const lockedCount = sessions.filter((s) => s.status === 'LOCKED').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Institutional Attendance Operations"
        description="Comprehensive attendance session auditing, lecture roster telemetry, and statutory threshold compliance."
        badge="Academic Operations"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void refetch()}
              disabled={isFetching}
              className="h-8 gap-1.5 text-xs"
            >
              <RefreshCw className={`size-3.5 ${isFetching ? 'animate-spin' : ''}`} />
              <span>Sync</span>
            </Button>
          </div>
        }
      />

      {/* KPI Metrics Row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="border-border/80 shadow-2xs">
          <CardHeader className="flex flex-row items-center justify-between px-4 pt-3 pb-1">
            <span className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">
              Total Recorded Sessions
            </span>
            <Users className="text-primary size-4" />
          </CardHeader>
          <CardContent className="px-4 pt-0 pb-3">
            {isLoading ? (
              <Skeleton className="h-7 w-12" />
            ) : (
              <div className="text-foreground font-mono text-2xl font-bold">{total}</div>
            )}
            <p className="text-muted-foreground mt-0.5 text-[11px]">Logged instructional rosters</p>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-2xs">
          <CardHeader className="flex flex-row items-center justify-between px-4 pt-3 pb-1">
            <span className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">
              Open Roster Sessions
            </span>
            <Unlock className="size-4 text-amber-600 dark:text-amber-400" />
          </CardHeader>
          <CardContent className="px-4 pt-0 pb-3">
            {isLoading ? (
              <Skeleton className="h-7 w-12" />
            ) : (
              <div className="text-foreground font-mono text-2xl font-bold text-amber-600 dark:text-amber-400">
                {openCount}
              </div>
            )}
            <p className="text-muted-foreground mt-0.5 text-[11px]">Awaiting final faculty lock</p>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-2xs">
          <CardHeader className="flex flex-row items-center justify-between px-4 pt-3 pb-1">
            <span className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">
              Audited & Locked
            </span>
            <Lock className="size-4 text-emerald-600 dark:text-emerald-400" />
          </CardHeader>
          <CardContent className="px-4 pt-0 pb-3">
            {isLoading ? (
              <Skeleton className="h-7 w-12" />
            ) : (
              <div className="text-foreground font-mono text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {lockedCount}
              </div>
            )}
            <p className="text-muted-foreground mt-0.5 text-[11px]">Immutable finalized records</p>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-2xs">
          <CardHeader className="flex flex-row items-center justify-between px-4 pt-3 pb-1">
            <span className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">
              Statutory Threshold
            </span>
            <Percent className="size-4 text-indigo-600 dark:text-indigo-400" />
          </CardHeader>
          <CardContent className="px-4 pt-0 pb-3">
            <div className="text-foreground font-mono text-2xl font-bold">75%</div>
            <p className="text-muted-foreground mt-0.5 text-[11px]">University exam eligibility</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Sessions Card */}
      <Card className="border-border/80 shadow-2xs">
        <CardHeader className="flex flex-col gap-4 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="font-heading text-lg">Classroom Attendance Sessions</CardTitle>
            <CardDescription>
              Real-time audit trail of lecture sessions, verifying faculty, and recorded student
              headcounts
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-60">
              <Search className="text-muted-foreground absolute top-2.5 left-2.5 size-3.5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search session or lecture ID..."
                className="border-border bg-background placeholder:text-muted-foreground focus:ring-ring h-8 w-full border py-1 pr-3 pl-8 text-xs focus:ring-1 focus:outline-hidden"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(val) => {
                setStatusFilter(val!);
                setPage(1);
              }}
            >
              <SelectTrigger className="bg-background h-8 w-[140px] text-xs">
                <Filter className="text-muted-foreground mr-1.5 size-3.5" />
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="OPEN">Open Only</SelectItem>
                <SelectItem value="LOCKED">Locked Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="pt-4">
          {isLoading ? (
            <div className="space-y-3 py-6">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : isError ? (
            <Alert variant="destructive" className="rounded-none">
              <AlertCircle className="size-4" />
              <AlertTitle>Failed to load attendance sessions</AlertTitle>
              <AlertDescription className="mt-1 flex items-center justify-between text-xs">
                <span>
                  {error?.message || 'Could not retrieve attendance sessions from server.'}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void refetch()}
                  className="h-7 text-xs"
                >
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          ) : filteredSessions.length === 0 ? (
            <div className="border-border bg-muted/10 text-muted-foreground space-y-2 border p-12 text-center text-xs">
              <Users className="text-muted-foreground/50 mx-auto size-8" />
              <p className="font-semibold">No attendance sessions recorded</p>
              <p>
                {statusFilter === 'ALL'
                  ? 'No attendance sessions have been opened in the system yet.'
                  : `No attendance sessions currently with status ${statusFilter}.`}
              </p>
            </div>
          ) : (
            <div className="border-border divide-border divide-y border text-xs">
              <div className="bg-muted/50 text-muted-foreground grid grid-cols-12 px-4 py-2.5 font-semibold">
                <div className="col-span-3">Session ID</div>
                <div className="col-span-3">Lecture Ref</div>
                <div className="col-span-3">Faculty Actor</div>
                <div className="col-span-2 text-center">Status</div>
                <div className="col-span-1 text-right">Created</div>
              </div>
              {filteredSessions.map((session) => (
                <div
                  key={session.id}
                  className="hover:bg-muted/20 grid grid-cols-12 items-center px-4 py-3 transition-colors"
                >
                  <div className="text-foreground col-span-3 truncate pr-2 font-mono font-medium">
                    {session.id}
                  </div>
                  <div className="text-muted-foreground col-span-3 truncate pr-2 font-mono">
                    {session.lectureId}
                  </div>
                  <div className="text-muted-foreground col-span-3 truncate pr-2 font-mono">
                    {session.takenByUserId}
                  </div>
                  <div className="col-span-2 text-center">
                    <Badge
                      variant={session.status === 'LOCKED' ? 'outline' : 'secondary'}
                      className={`font-mono text-[10px] ${
                        session.status === 'LOCKED'
                          ? 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                          : 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
                      }`}
                    >
                      {session.status}
                    </Badge>
                  </div>
                  <div className="text-muted-foreground col-span-1 text-right text-[11px]">
                    {new Date(session.createdAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
