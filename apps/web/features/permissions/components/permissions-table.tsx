'use client';

import { KeyRoundIcon } from 'lucide-react';
import * as React from 'react';

import { usePermissions } from '../hooks/use-permissions';

import { type ColumnDef, DataTable } from '@/components/erp/data-table';
import type { PermissionItem } from '@/features/roles/schemas/role.schema';
import { formatDate } from '@/lib/formatters';

export function PermissionsTable() {
  const [page, setPage] = React.useState(1);
  const [limit, setLimit] = React.useState(25);
  const [search, setSearch] = React.useState('');
  const [sortBy, setSortBy] = React.useState<'key' | 'createdAt'>('key');
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('asc');

  const { data, isLoading, isError, error, refetch } = usePermissions({
    page,
    limit,
    search: search.trim() || undefined,
    sortBy,
    sortOrder,
  });

  const handleSortChange = (field: string) => {
    if (field === sortBy) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field as 'key' | 'createdAt');
      setSortOrder('asc');
    }
  };

  const columns: ColumnDef<PermissionItem>[] = [
    {
      key: 'key',
      header: 'Permission Key',
      sortable: true,
      className: 'w-[220px]',
      cell: (perm) => (
        <div className="flex items-center gap-2">
          <KeyRoundIcon className="text-muted-foreground size-3.5 shrink-0" />
          <code className="text-foreground font-mono text-xs font-semibold select-all">
            {perm.key}
          </code>
        </div>
      ),
    },
    {
      key: 'displayName',
      header: 'Capability Name',
      sortable: false,
      cell: (perm) => (
        <div className="flex min-w-0 flex-col">
          <span className="text-foreground text-xs font-medium">{perm.displayName}</span>
          <span className="text-muted-foreground truncate text-[11px]">{perm.description}</span>
        </div>
      ),
    },
    {
      key: 'createdAt',
      header: 'Cataloged On',
      sortable: true,
      className: 'w-[140px]',
      cell: (perm) => (
        <span className="text-muted-foreground font-mono text-xs">
          {formatDate(perm.createdAt)}
        </span>
      ),
    },
  ];

  return (
    <DataTable<PermissionItem>
      columns={columns}
      data={data?.items ?? []}
      total={data?.pagination.total ?? 0}
      page={page}
      limit={limit}
      onPageChange={setPage}
      onLimitChange={setLimit}
      isLoading={isLoading}
      isError={isError}
      error={error}
      onRetry={() => {
        void refetch();
      }}
      search={search}
      onSearchChange={(query) => {
        setSearch(query);
        setPage(1);
      }}
      searchPlaceholder="Search permissions by key or description..."
      sortBy={sortBy}
      sortOrder={sortOrder}
      onSortChange={handleSortChange}
      keyExtractor={(perm) => perm.id}
      emptyTitle="No permissions found"
      emptyDescription={
        search
          ? 'No permissions in the catalog match your search query.'
          : 'The platform permission catalog is currently empty.'
      }
    />
  );
}
