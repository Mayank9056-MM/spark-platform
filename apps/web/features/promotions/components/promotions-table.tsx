'use client';

import { EyeIcon, GraduationCapIcon, PlusIcon, RefreshCwIcon, XIcon } from 'lucide-react';
import * as React from 'react';

import { usePromotionBatches } from '../hooks/use-promotion-batches';
import type { PromotionBatch, PromotionBatchStatus } from '../schemas/promotion.schema';

import { CreatePromotionBatchDialog } from './create-promotion-batch-dialog';
import { PromotionBatchDetailDialog } from './promotion-batch-detail-dialog';
import { PromotionBatchStatusBadge } from './promotion-batch-status-badge';

import { PermissionGuard } from '@/components/auth/permission-guard';
import { type ColumnDef, DataTable } from '@/components/erp/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatDateTime } from '@/lib/formatters';

export function PromotionsTable() {
  const [page, setPage] = React.useState(1);
  const [limit, setLimit] = React.useState(20);
  const [sortBy, setSortBy] = React.useState<'createdAt' | 'finalizedAt'>('createdAt');
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('desc');

  // Filters
  const [statusFilter, setStatusFilter] = React.useState<string>('ALL');
  const [filterCatalogId, setFilterCatalogId] = React.useState('');
  const [filterYearId, setFilterYearId] = React.useState('');

  // Dialogs
  const [createBatchOpen, setCreateBatchOpen] = React.useState(false);
  const [selectedBatchId, setSelectedBatchId] = React.useState<string | null>(null);

  const { data, isLoading, isError, error, refetch } = usePromotionBatches({
    page,
    limit,
    sortBy,
    sortOrder,
    status: statusFilter === 'ALL' ? undefined : (statusFilter as PromotionBatchStatus),
    semesterCatalogId: filterCatalogId.trim() || undefined,
    academicYearId: filterYearId.trim() || undefined,
  });

  const handleSortChange = (field: string) => {
    if (field === sortBy) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field as 'createdAt' | 'finalizedAt');
      setSortOrder('desc');
    }
  };

  const hasActiveFilters = Boolean(statusFilter !== 'ALL' || filterCatalogId || filterYearId);

  const clearFilters = () => {
    setStatusFilter('ALL');
    setFilterCatalogId('');
    setFilterYearId('');
    setPage(1);
  };

  const columns: ColumnDef<PromotionBatch>[] = [
    {
      key: 'id',
      header: 'Batch ID',
      className: 'w-[180px]',
      cell: (item) => (
        <button
          type="button"
          onClick={() => setSelectedBatchId(item.id)}
          className="group flex items-center gap-1.5 text-left hover:underline focus:outline-hidden"
        >
          <GraduationCapIcon className="text-muted-foreground group-hover:text-primary size-3.5 shrink-0" />
          <code className="text-foreground group-hover:text-primary font-mono text-xs font-semibold">
            {item.id.slice(0, 8)}...{item.id.slice(-4)}
          </code>
        </button>
      ),
    },
    {
      key: 'status',
      header: 'Progression Status',
      className: 'w-[140px]',
      cell: (item) => <PromotionBatchStatusBadge status={item.status} />,
    },
    {
      key: 'semesterCatalogId',
      header: 'Semester Catalog ID',
      cell: (item) => (
        <code className="text-muted-foreground font-mono text-[11px] select-all">
          {item.semesterCatalogId}
        </code>
      ),
    },
    {
      key: 'academicYearId',
      header: 'Academic Year ID',
      cell: (item) => (
        <code className="text-muted-foreground font-mono text-[11px] select-all">
          {item.academicYearId}
        </code>
      ),
    },
    {
      key: 'createdAt',
      header: 'Created Date',
      sortable: true,
      className: 'w-[160px]',
      cell: (item) => (
        <span className="text-muted-foreground font-mono text-xs">
          {formatDateTime(item.createdAt)}
        </span>
      ),
    },
    {
      key: 'finalizedAt',
      header: 'Finalized Date',
      sortable: true,
      className: 'w-[160px]',
      cell: (item) => (
        <span className="text-muted-foreground font-mono text-xs">
          {item.finalizedAt ? formatDateTime(item.finalizedAt) : '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-[110px] text-right',
      cell: (item) => (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={() => setSelectedBatchId(item.id)}
        >
          <EyeIcon className="mr-1 size-3.5" />
          Review
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Top action bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={statusFilter}
            onValueChange={(val) => {
              if (val) {
                setStatusFilter(val);
                setPage(1);
              }
            }}
          >
            <SelectTrigger className="h-8 w-32 text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL" className="text-xs">
                All Statuses
              </SelectItem>
              <SelectItem value="DRAFT" className="text-xs">
                Draft Batches
              </SelectItem>
              <SelectItem value="FINALIZED" className="text-xs">
                Finalized Batches
              </SelectItem>
            </SelectContent>
          </Select>

          <Input
            placeholder="Catalog ID..."
            value={filterCatalogId}
            onChange={(e) => {
              setFilterCatalogId(e.target.value);
              setPage(1);
            }}
            className="h-8 w-36 font-mono text-xs"
          />

          <Input
            placeholder="Year ID..."
            value={filterYearId}
            onChange={(e) => {
              setFilterYearId(e.target.value);
              setPage(1);
            }}
            className="h-8 w-36 font-mono text-xs"
          />

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-muted-foreground hover:text-foreground h-8 px-2 text-xs"
            >
              <XIcon className="mr-1 size-3.5" />
              Reset
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void refetch()}
            className="h-8 text-xs"
          >
            <RefreshCwIcon className="mr-1.5 size-3.5" />
            Refresh
          </Button>

          <PermissionGuard
            require="promotion:create"
            allowRoles={['super_admin', 'admin', 'principal', 'hod']}
          >
            <Button size="sm" onClick={() => setCreateBatchOpen(true)} className="h-8 text-xs">
              <PlusIcon className="mr-1.5 size-3.5" />
              Open Promotion Batch
            </Button>
          </PermissionGuard>
        </div>
      </div>

      {/* Main Data Table */}
      <DataTable
        keyExtractor={(item) => item.id}
        columns={columns}
        data={data?.items ?? []}
        total={data?.pagination.total ?? 0}
        page={page}
        limit={limit}
        onPageChange={setPage}
        onLimitChange={(l) => {
          setLimit(l);
          setPage(1);
        }}
        isLoading={isLoading}
        isError={isError}
        error={error}
        onRetry={() => void refetch()}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={handleSortChange}
        emptyTitle="No promotion batches found"
        emptyDescription={
          hasActiveFilters
            ? 'No promotion batches match the active filters.'
            : 'No student promotion progression batches have been created yet.'
        }
      />

      {/* Create Dialog */}
      <CreatePromotionBatchDialog open={createBatchOpen} onOpenChange={setCreateBatchOpen} />

      {/* Detail / Review Dialog */}
      <PromotionBatchDetailDialog
        batchId={selectedBatchId}
        open={Boolean(selectedBatchId)}
        onOpenChange={(open) => {
          if (!open) setSelectedBatchId(null);
        }}
      />
    </div>
  );
}
