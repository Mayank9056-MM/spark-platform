'use client';

import {
  ArchiveIcon,
  EyeIcon,
  FilterIcon,
  MoreHorizontalIcon,
  PlusIcon,
  RotateCcwIcon,
} from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { useArchiveUser } from '../hooks/use-archive-user';
import { useRestoreUser } from '../hooks/use-restore-user';
import { useUsers } from '../hooks/use-users';
import { USER_STATUSES } from '../schemas/user.schema';
import type { UserProfile, UserStatus } from '../schemas/user.schema';

import { UserStatusBadge } from './user-status-badge';

import { PermissionGuard } from '@/components/auth/permission-guard';
import { type ColumnDef, DataTable } from '@/components/erp/data-table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
import { formatDate, formatRelativeTime } from '@/lib/formatters';

interface UsersTableProps {
  initialStatus?: UserStatus;
}

export function UsersTable({ initialStatus }: UsersTableProps) {
  const [page, setPage] = React.useState(1);
  const [limit, setLimit] = React.useState(20);
  const [search, setSearch] = React.useState('');
  const [selectedStatus, setSelectedStatus] = React.useState<UserStatus | 'ALL'>(
    initialStatus ?? 'ALL',
  );
  const [sortBy, setSortBy] = React.useState<'createdAt' | 'firstName' | 'lastName' | 'email'>(
    'createdAt',
  );
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('desc');

  const { data, isLoading, isError, error, refetch } = useUsers({
    page,
    limit,
    search: search.trim() || undefined,
    status: selectedStatus === 'ALL' ? undefined : selectedStatus,
    sortBy,
    sortOrder,
  });

  const archiveMutation = useArchiveUser();
  const restoreMutation = useRestoreUser();

  const handleSortChange = (field: string) => {
    if (field === sortBy) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field as 'createdAt' | 'firstName' | 'lastName' | 'email');
      setSortOrder('asc');
    }
  };

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return (name[0] || 'U').toUpperCase();
  };

  const columns: ColumnDef<UserProfile>[] = [
    {
      key: 'fullName',
      header: 'User Identity',
      sortable: true,
      cell: (user) => (
        <div className="flex items-center gap-3">
          <Avatar className="border-border size-8 rounded-md border">
            {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.fullName} />}
            <AvatarFallback className="bg-muted text-muted-foreground rounded-md text-[11px] font-semibold">
              {getInitials(user.fullName)}
            </AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-col">
            <Link
              href={`/app/users/${user.id}`}
              className="text-foreground hover:text-primary truncate text-xs font-semibold hover:underline"
            >
              {user.fullName}
            </Link>
            <span className="text-muted-foreground truncate font-mono text-[11px]">
              {user.email}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Account Status',
      sortable: false,
      className: 'w-[140px]',
      cell: (user) => <UserStatusBadge status={user.status} />,
    },
    {
      key: 'lastLoginAt',
      header: 'Last Session',
      sortable: false,
      className: 'w-[140px]',
      cell: (user) => (
        <span className="text-muted-foreground text-xs">
          {user.lastLoginAt ? formatRelativeTime(user.lastLoginAt) : 'Never logged in'}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Created On',
      sortable: true,
      className: 'w-[130px]',
      cell: (user) => (
        <span className="text-muted-foreground font-mono text-xs">
          {formatDate(user.createdAt)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: <span className="sr-only">Actions</span>,
      sortable: false,
      className: 'w-[60px] text-right',
      cell: (user) => {
        const isArchived = user.status === 'ARCHIVED';
        const isProcessing =
          (archiveMutation.isPending && archiveMutation.variables === user.id) ||
          (restoreMutation.isPending && restoreMutation.variables === user.id);

        return (
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger
                className="hover:bg-accent text-muted-foreground hover:text-foreground flex size-7 cursor-pointer items-center justify-center rounded-sm outline-hidden disabled:opacity-50"
                disabled={isProcessing}
                aria-label={`Actions for ${user.fullName}`}
              >
                <MoreHorizontalIcon className="size-3.5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="text-muted-foreground text-[11px] font-medium">
                    User Actions
                  </DropdownMenuLabel>
                  <DropdownMenuItem
                    render={<Link href={`/app/users/${user.id}`} />}
                    className="cursor-pointer gap-2 text-xs"
                  >
                    <EyeIcon className="text-muted-foreground size-3.5" />
                    <span>View Record</span>
                  </DropdownMenuItem>

                  <PermissionGuard require="user:delete">
                    <DropdownMenuSeparator />
                    {isArchived ? (
                      <DropdownMenuItem
                        onClick={() => restoreMutation.mutate(user.id)}
                        className="cursor-pointer gap-2 text-xs text-emerald-600 focus:text-emerald-700"
                      >
                        <RotateCcwIcon className="size-3.5" />
                        <span>Restore Account</span>
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem
                        onClick={() => archiveMutation.mutate(user.id)}
                        className="cursor-pointer gap-2 text-xs text-rose-600 focus:text-rose-700"
                      >
                        <ArchiveIcon className="size-3.5" />
                        <span>Archive Account</span>
                      </DropdownMenuItem>
                    )}
                  </PermissionGuard>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

  return (
    <DataTable<UserProfile>
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
      searchPlaceholder="Search users by name or email..."
      sortBy={sortBy}
      sortOrder={sortOrder}
      onSortChange={handleSortChange}
      keyExtractor={(user) => user.id}
      filterSlot={
        <div className="flex items-center gap-2">
          <Select
            value={selectedStatus}
            onValueChange={(val) => {
              setSelectedStatus(val!);
              setPage(1);
            }}
          >
            <SelectTrigger className="bg-background h-8 w-[160px] text-xs">
              <FilterIcon className="text-muted-foreground mr-1.5 size-3.5" />
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              {USER_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {status.replace(/_/g, ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      }
      actions={
        <PermissionGuard require="user:create">
          <Button
            render={<Link href="/app/users/new" />}
            size="sm"
            className="h-8 gap-1.5 text-xs font-semibold"
          >
            <PlusIcon className="size-3.5" aria-hidden="true" />
            <span>Create User</span>
          </Button>
        </PermissionGuard>
      }
      emptyTitle="No institutional users found"
      emptyDescription={
        search || selectedStatus !== 'ALL'
          ? 'No user records match the active search or filter criteria. Try adjusting your parameters.'
          : 'No user accounts have been provisioned in the system yet.'
      }
      emptyAction={
        <PermissionGuard require="user:create">
          <Button
            render={<Link href="/app/users/new" />}
            size="sm"
            variant="outline"
            className="h-8 gap-1.5 text-xs"
          >
            <PlusIcon className="size-3.5" />
            <span>Provision First User</span>
          </Button>
        </PermissionGuard>
      }
    />
  );
}
