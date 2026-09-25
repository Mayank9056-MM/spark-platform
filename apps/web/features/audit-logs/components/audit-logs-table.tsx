'use client';

import {
  CalendarIcon,
  EyeIcon,
  FilterIcon,
  GlobeIcon,
  RefreshCwIcon,
  RotateCcwIcon,
  ShieldIcon,
} from 'lucide-react';
import * as React from 'react';

import { useAuditLogs } from '../hooks/use-audit-logs';
import { AUDIT_ACTIONS } from '../schemas/audit-log.schema';
import type { AuditAction, AuditLog } from '../schemas/audit-log.schema';

import { AuditLogDetailDialog } from './audit-log-detail-dialog';

import { type ColumnDef, DataTable } from '@/components/erp/data-table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatDate, formatRelativeTime } from '@/lib/formatters';

const COMMON_ENTITY_TYPES = [
  'ALL',
  'User',
  'Role',
  'RoleAssignment',
  'Department',
  'Program',
  'CurriculumVersion',
  'SemesterCatalog',
  'Subject',
  'ElectiveGroup',
  'AcademicYear',
  'Admission',
  'StudentEnrollment',
  'SemesterEnrollment',
  'PromotionBatch',
  'PromotionDecision',
  'Attendance',
  'Timetable',
  'Lecture',
] as const;

function getActionBadge(action: AuditAction) {
  switch (action) {
    case 'CREATE':
      return (
        <Badge
          variant="outline"
          className="border-emerald-500/30 bg-emerald-500/10 font-mono text-[10px] text-emerald-700"
        >
          CREATE
        </Badge>
      );
    case 'UPDATE':
      return (
        <Badge
          variant="outline"
          className="border-amber-500/30 bg-amber-500/10 font-mono text-[10px] text-amber-700 dark:text-amber-400"
        >
          UPDATE
        </Badge>
      );
    case 'DELETE':
      return (
        <Badge
          variant="outline"
          className="border-destructive/30 bg-destructive/10 text-destructive font-mono text-[10px]"
        >
          DELETE
        </Badge>
      );
    case 'ARCHIVE':
      return (
        <Badge
          variant="secondary"
          className="border-border/60 bg-muted/60 text-muted-foreground font-mono text-[10px]"
        >
          ARCHIVE
        </Badge>
      );
    case 'RESTORE':
      return (
        <Badge
          variant="outline"
          className="border-primary/30 bg-primary/10 text-primary font-mono text-[10px]"
        >
          RESTORE
        </Badge>
      );
    default:
      return <Badge variant="secondary">{action}</Badge>;
  }
}

export function AuditLogsTable() {
  const [page, setPage] = React.useState(1);
  const [limit, setLimit] = React.useState(20);
  const [search, setSearch] = React.useState('');
  const [selectedAction, setSelectedAction] = React.useState<AuditAction | 'ALL'>('ALL');
  const [selectedEntityType, setSelectedEntityType] = React.useState<string>('ALL');
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('desc');

  const [selectedLogId, setSelectedLogId] = React.useState<string | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = React.useState(false);

  const { data, isLoading, isError, error, refetch } = useAuditLogs({
    page,
    limit,
    search: search.trim() || undefined,
    action: selectedAction === 'ALL' ? undefined : selectedAction,
    entityType: selectedEntityType === 'ALL' ? undefined : selectedEntityType,
    sortOrder,
  });

  const handleInspect = (logId: string) => {
    setSelectedLogId(logId);
    setDetailDialogOpen(true);
  };

  const columns: ColumnDef<AuditLog>[] = [
    {
      key: 'createdAt',
      header: 'Timestamp',
      className: 'w-[160px]',
      cell: (log) => (
        <div className="space-y-0.5">
          <div className="text-foreground flex items-center gap-1.5 font-mono text-[11px] font-medium">
            <CalendarIcon className="text-muted-foreground size-3 shrink-0" />
            <span>{formatDate(log.createdAt)}</span>
          </div>
          <p className="text-muted-foreground text-[10px]">{formatRelativeTime(log.createdAt)}</p>
        </div>
      ),
    },
    {
      key: 'action',
      header: 'Action',
      className: 'w-[100px]',
      cell: (log) => getActionBadge(log.action),
    },
    {
      key: 'entity',
      header: 'Entity / Resource',
      className: 'min-w-[180px]',
      cell: (log) => (
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5">
            <span className="text-foreground text-xs font-semibold">{log.entityType}</span>
          </div>
          <p
            className="text-muted-foreground max-w-[200px] truncate font-mono text-[10px]"
            title={log.entityId}
          >
            ID: {log.entityId}
          </p>
        </div>
      ),
    },
    {
      key: 'actor',
      header: 'Actor',
      className: 'min-w-[180px]',
      cell: (log) =>
        log.actor ? (
          <div className="flex items-center gap-2">
            <Avatar className="border-border size-6 rounded-md border">
              {log.actor.avatarUrl && (
                <AvatarImage src={log.actor.avatarUrl} alt={log.actor.firstName} />
              )}
              <AvatarFallback className="bg-primary/10 text-primary rounded-md text-[10px] font-semibold">
                {log.actor.firstName[0]}
                {log.actor.lastName[0]}
              </AvatarFallback>
            </Avatar>
            <div className="max-w-[160px] space-y-0.5 truncate">
              <p className="text-foreground truncate text-xs font-medium">
                {log.actor.firstName} {log.actor.lastName}
              </p>
              <p className="text-muted-foreground truncate text-[10px]">{log.actor.email}</p>
            </div>
          </div>
        ) : (
          <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
            <ShieldIcon className="size-3.5" />
            <span>System Automation</span>
          </div>
        ),
    },
    {
      key: 'network',
      header: 'Request Telemetry',
      className: 'hidden md:table-cell min-w-[140px]',
      cell: (log) => (
        <div className="text-muted-foreground space-y-0.5 font-mono text-[10px]">
          <div className="flex items-center gap-1">
            <GlobeIcon className="size-2.5 shrink-0" />
            <span>{log.ipAddress ?? '—'}</span>
          </div>
          {log.requestId && (
            <div className="max-w-[140px] truncate" title={log.requestId}>
              Req: {log.requestId}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Details',
      className: 'w-[80px] text-right',
      cell: (log) => (
        <Button
          variant="outline"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={() => handleInspect(log.id)}
        >
          <EyeIcon className="mr-1 size-3" />
          Inspect
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Filter Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {/* Action Filter */}
          <Select
            value={selectedAction}
            onValueChange={(val) => {
              if (val) {
                setSelectedAction(val);
                setPage(1);
              }
            }}
          >
            <SelectTrigger className="h-8 w-[140px] text-xs">
              <FilterIcon className="text-muted-foreground mr-1.5 size-3" />
              <SelectValue placeholder="Action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Actions</SelectItem>
              {AUDIT_ACTIONS.map((action) => (
                <SelectItem key={action} value={action}>
                  {action}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Entity Type Filter */}
          <Select
            value={selectedEntityType}
            onValueChange={(val) => {
              if (val) {
                setSelectedEntityType(val);
                setPage(1);
              }
            }}
          >
            <SelectTrigger className="h-8 w-[160px] text-xs">
              <SelectValue placeholder="Entity Type" />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              {COMMON_ENTITY_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {type === 'ALL' ? 'All Entities' : type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Reset Filters */}
          {(selectedAction !== 'ALL' || selectedEntityType !== 'ALL' || search) && (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground h-8 text-xs"
              onClick={() => {
                setSelectedAction('ALL');
                setSelectedEntityType('ALL');
                setSearch('');
                setPage(1);
              }}
            >
              <RotateCcwIcon className="mr-1 size-3" />
              Reset
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 font-mono text-xs"
            onClick={() => setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
            title={`Sort order: ${sortOrder.toUpperCase()}`}
          >
            {sortOrder === 'desc' ? 'DESC' : 'ASC'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={() => {
              void refetch();
            }}
            disabled={isLoading}
          >
            <RefreshCwIcon className={`mr-1.5 size-3 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Main DataTable */}
      <DataTable
        columns={columns}
        data={data?.items ?? []}
        keyExtractor={(log) => log.id}
        total={data?.pagination?.total ?? 0}
        page={page}
        limit={limit}
        onPageChange={setPage}
        onLimitChange={setLimit}
        isLoading={isLoading}
        isError={isError}
        error={error instanceof Error ? error : null}
        onRetry={() => {
          void refetch();
        }}
        search={search}
        onSearchChange={(val) => {
          setSearch(val);
          setPage(1);
        }}
        searchPlaceholder="Search by Entity ID, Type, IP, or Request ID..."
        emptyTitle="No audit log records found"
        emptyDescription="System transactions and mutations matching the specified criteria will appear here."
      />

      {/* Detail Modal */}
      <AuditLogDetailDialog
        logId={selectedLogId}
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
      />
    </div>
  );
}
