'use client';

import { EyeIcon, IdCardIcon, PlusIcon, RefreshCwIcon, XIcon } from 'lucide-react';
import * as React from 'react';

import { useFacultyAssignments } from '../hooks/use-faculty-assignments';
import type { FacultyAssignment } from '../schemas/faculty-assignment.schema';

import { CreateFacultyAssignmentDialog } from './create-faculty-assignment-dialog';
import { FacultyAssignmentDetailDialog } from './faculty-assignment-detail-dialog';

import { PermissionGuard } from '@/components/auth/permission-guard';
import { type ColumnDef, DataTable } from '@/components/erp/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatDateTime } from '@/lib/formatters';

export function FacultyAssignmentsTable() {
  const [page, setPage] = React.useState(1);
  const [limit, setLimit] = React.useState(20);
  const [sortBy, setSortBy] = React.useState<'createdAt' | 'updatedAt'>('createdAt');
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('desc');

  // Filters
  const [filterFacultyId, setFilterFacultyId] = React.useState('');
  const [filterOfferingId, setFilterOfferingId] = React.useState('');
  const [filterComponentId, setFilterComponentId] = React.useState('');

  // Dialogs
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  const [selectedAssignmentId, setSelectedAssignmentId] = React.useState<string | null>(null);

  const { data, isLoading, isError, error, refetch } = useFacultyAssignments({
    page,
    limit,
    sortBy,
    sortOrder,
    facultyUserId: filterFacultyId.trim() || undefined,
    subjectOfferingId: filterOfferingId.trim() || undefined,
    subjectComponentId: filterComponentId.trim() || undefined,
  });

  const handleSortChange = (field: string) => {
    if (field === sortBy) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field as 'createdAt' | 'updatedAt');
      setSortOrder('desc');
    }
  };

  const hasActiveFilters = Boolean(filterFacultyId || filterOfferingId || filterComponentId);

  const clearFilters = () => {
    setFilterFacultyId('');
    setFilterOfferingId('');
    setFilterComponentId('');
    setPage(1);
  };

  const columns: ColumnDef<FacultyAssignment>[] = [
    {
      key: 'id',
      header: 'Assignment ID',
      className: 'w-[180px]',
      cell: (item) => (
        <button
          type="button"
          onClick={() => setSelectedAssignmentId(item.id)}
          className="group flex items-center gap-1.5 text-left hover:underline focus:outline-hidden"
        >
          <IdCardIcon className="text-muted-foreground group-hover:text-primary size-3.5 shrink-0" />
          <code className="text-foreground group-hover:text-primary font-mono text-xs font-semibold">
            {item.id.slice(0, 8)}...{item.id.slice(-4)}
          </code>
        </button>
      ),
    },
    {
      key: 'subjectOfferingId',
      header: 'Subject Offering ID',
      cell: (item) => (
        <code className="text-muted-foreground font-mono text-[11px] select-all">
          {item.subjectOfferingId}
        </code>
      ),
    },
    {
      key: 'subjectComponentId',
      header: 'Component ID',
      cell: (item) => (
        <code className="text-muted-foreground font-mono text-[11px] select-all">
          {item.subjectComponentId}
        </code>
      ),
    },
    {
      key: 'facultyUserId',
      header: 'Faculty User ID',
      cell: (item) => (
        <code className="text-foreground font-mono text-[11px] font-medium select-all">
          {item.facultyUserId}
        </code>
      ),
    },
    {
      key: 'createdAt',
      header: 'Assigned At',
      sortable: true,
      className: 'w-[160px]',
      cell: (item) => (
        <span className="text-muted-foreground font-mono text-xs">
          {formatDateTime(item.createdAt)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-[80px] text-right',
      cell: (item) => (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={() => setSelectedAssignmentId(item.id)}
        >
          <EyeIcon className="mr-1 size-3.5" />
          View
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Top action bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="Filter Faculty User ID..."
            value={filterFacultyId}
            onChange={(e) => {
              setFilterFacultyId(e.target.value);
              setPage(1);
            }}
            className="h-8 w-44 font-mono text-xs"
          />
          <Input
            placeholder="Filter Offering ID..."
            value={filterOfferingId}
            onChange={(e) => {
              setFilterOfferingId(e.target.value);
              setPage(1);
            }}
            className="h-8 w-44 font-mono text-xs"
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
            require="facultyAssignment:create"
            allowRoles={['super_admin', 'admin', 'hod', 'principal']}
          >
            <Button size="sm" onClick={() => setCreateDialogOpen(true)} className="h-8 text-xs">
              <PlusIcon className="mr-1.5 size-3.5" />
              Assign Faculty
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
        emptyTitle="No faculty assignments found"
        emptyDescription={
          hasActiveFilters
            ? 'No faculty assignments match the specified query filters.'
            : 'No instructional faculty assignments have been recorded yet.'
        }
      />

      {/* Create Dialog */}
      <CreateFacultyAssignmentDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />

      {/* Detail Dialog */}
      <FacultyAssignmentDetailDialog
        assignmentId={selectedAssignmentId}
        open={Boolean(selectedAssignmentId)}
        onOpenChange={(open) => {
          if (!open) setSelectedAssignmentId(null);
        }}
      />
    </div>
  );
}
