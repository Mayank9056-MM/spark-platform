'use client';

import {
  ArchiveIcon,
  EyeIcon,
  FilterIcon,
  LockIcon,
  MoreHorizontalIcon,
  PlusIcon,
  ShieldCheckIcon,
} from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { useArchiveRole } from '../hooks/use-archive-role';
import { useRestoreRole } from '../hooks/use-restore-role';
import { useRoles } from '../hooks/use-roles';
import type { RoleItem } from '../schemas/role.schema';

import { PermissionGuard } from '@/components/auth/permission-guard';
import { type ColumnDef, DataTable } from '@/components/erp/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatDate } from '@/lib/formatters';

export function RolesTable() {
  const [page, setPage] = React.useState(1);
  const [limit, setLimit] = React.useState(20);
  const [search, setSearch] = React.useState('');
  const [typeFilter, setTypeFilter] = React.useState<'ALL' | 'SYSTEM' | 'CUSTOM'>('ALL');
  const [sortBy, setSortBy] = React.useState<'createdAt' | 'key' | 'displayName'>('displayName');
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('asc');

  const isSystemDefinedParam =
    typeFilter === 'SYSTEM' ? true : typeFilter === 'CUSTOM' ? false : undefined;

  const { data, isLoading, isError, error, refetch } = useRoles({
    page,
    limit,
    search: search.trim() || undefined,
    isSystemDefined: isSystemDefinedParam,
    sortBy,
    sortOrder,
  });

  const archiveMutation = useArchiveRole();
  const restoreMutation = useRestoreRole();

  const handleSortChange = (field: string) => {
    if (field === sortBy) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field as 'createdAt' | 'key' | 'displayName');
      setSortOrder('asc');
    }
  };

  const columns: ColumnDef<RoleItem>[] = [
    {
      key: 'displayName',
      header: 'Role Name',
      sortable: true,
      cell: (role) => (
        <div className="flex min-w-0 flex-col">
          <Link
            href={`/app/roles/${role.id}`}
            className="text-foreground hover:text-primary truncate text-xs font-semibold hover:underline"
          >
            {role.displayName}
          </Link>
          <code className="text-muted-foreground font-mono text-[11px]">{role.key}</code>
        </div>
      ),
    },
    {
      key: 'isSystemDefined',
      header: 'Classification',
      sortable: false,
      className: 'w-[160px]',
      cell: (role) =>
        role.isSystemDefined ? (
          <Badge
            variant="outline"
            className="border-primary/30 text-primary bg-primary/5 gap-1 px-2 py-0.5 font-mono text-[10px] uppercase"
          >
            <LockIcon className="size-3" aria-hidden="true" />
            <span>System Role</span>
          </Badge>
        ) : (
          <Badge
            variant="secondary"
            className="border-muted text-muted-foreground gap-1 px-2 py-0.5 font-mono text-[10px] uppercase"
          >
            <ShieldCheckIcon className="size-3" aria-hidden="true" />
            <span>Custom Role</span>
          </Badge>
        ),
    },
    {
      key: 'createdAt',
      header: 'Created On',
      sortable: true,
      className: 'w-[140px]',
      cell: (role) => (
        <span className="text-muted-foreground font-mono text-xs">
          {formatDate(role.createdAt)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: <span className="sr-only">Actions</span>,
      sortable: false,
      className: 'w-[60px] text-right',
      cell: (role) => {
        const isProcessing =
          (archiveMutation.isPending && archiveMutation.variables === role.id) ||
          (restoreMutation.isPending && restoreMutation.variables === role.id);

        return (
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger
                className="hover:bg-accent text-muted-foreground hover:text-foreground flex size-7 cursor-pointer items-center justify-center rounded-sm outline-hidden disabled:opacity-50"
                disabled={isProcessing}
                aria-label={`Actions for ${role.displayName}`}
              >
                <MoreHorizontalIcon className="size-3.5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="text-muted-foreground text-[11px] font-medium">
                    Role Operations
                  </DropdownMenuLabel>
                  <DropdownMenuItem
                    render={<Link href={`/app/roles/${role.id}`} />}
                    className="cursor-pointer gap-2 text-xs"
                  >
                    <EyeIcon className="text-muted-foreground size-3.5" />
                    <span>View Permissions</span>
                  </DropdownMenuItem>

                  {!role.isSystemDefined && (
                    <PermissionGuard require="role:archive">
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => archiveMutation.mutate(role.id)}
                        className="cursor-pointer gap-2 text-xs text-rose-600 focus:text-rose-700"
                      >
                        <ArchiveIcon className="size-3.5" />
                        <span>Archive Role</span>
                      </DropdownMenuItem>
                    </PermissionGuard>
                  )}
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

  return (
    <DataTable<RoleItem>
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
      searchPlaceholder="Search roles by key or name..."
      sortBy={sortBy}
      sortOrder={sortOrder}
      onSortChange={handleSortChange}
      keyExtractor={(role) => role.id}
      filterSlot={
        <div className="flex items-center gap-2">
          <Select
            value={typeFilter}
            onValueChange={(val) => {
              if (val) {
                setTypeFilter(val);
                setPage(1);
              }
            }}
          >
            <SelectTrigger className="bg-background h-8 w-[160px] text-xs">
              <FilterIcon className="text-muted-foreground mr-1.5 size-3.5" />
              <SelectValue placeholder="All Roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Roles</SelectItem>
              <SelectItem value="SYSTEM">System Built-in</SelectItem>
              <SelectItem value="CUSTOM">Custom Defined</SelectItem>
            </SelectContent>
          </Select>
        </div>
      }
      actions={
        <PermissionGuard require="role:create">
          <Button
            render={<Link href="/app/roles/new" />}
            size="sm"
            className="h-8 gap-1.5 text-xs font-semibold"
          >
            <PlusIcon className="size-3.5" aria-hidden="true" />
            <span>Create Role</span>
          </Button>
        </PermissionGuard>
      }
      emptyTitle="No roles found"
      emptyDescription={
        search || typeFilter !== 'ALL'
          ? 'No roles match the active search or classification filter.'
          : 'No roles configured in the catalog.'
      }
    />
  );
}
