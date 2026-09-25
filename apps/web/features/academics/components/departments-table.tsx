'use client';

import { Building2Icon, MoreHorizontalIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { useDeleteDepartment } from '../hooks/use-delete-department';
import { useDepartments } from '../hooks/use-departments';
import type { Department } from '../schemas/academic.schema';

import { PermissionGuard } from '@/components/auth/permission-guard';
import { type ColumnDef, DataTable } from '@/components/erp/data-table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
import { toast } from '@/components/ui/toast';
import { formatDate } from '@/lib/formatters';

export function DepartmentsTable() {
  const [page, setPage] = React.useState(1);
  const [limit, setLimit] = React.useState(20);
  const [search, setSearch] = React.useState('');
  const [sortBy, setSortBy] = React.useState<'name' | 'code' | 'createdAt'>('name');
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('asc');
  const [deptToDelete, setDeptToDelete] = React.useState<Department | null>(null);

  const { data, isLoading, isError, error, refetch } = useDepartments({
    page,
    limit,
    search: search.trim() || undefined,
    sortBy,
    sortOrder,
  });

  const deleteMutation = useDeleteDepartment();

  const handleSortChange = (field: string) => {
    if (field === sortBy) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field as 'name' | 'code' | 'createdAt');
      setSortOrder('asc');
    }
  };

  const handleDelete = (dept: Department) => {
    deleteMutation.mutate(dept.id, {
      onSuccess: () => {
        toast.add({
          title: 'Department removed',
          description: `Department "${dept.name}" removed successfully.`,
          type: 'success',
        });
      },
      onError: (err) => {
        toast.add({
          title: 'Failed to delete department',
          description: err.message,
          type: 'error',
        });
      },
    });
  };

  const columns: ColumnDef<Department>[] = [
    {
      key: 'code',
      header: 'Dept Code',
      sortable: true,
      className: 'w-[140px]',
      cell: (dept) => (
        <div className="flex items-center gap-2">
          <Building2Icon className="text-muted-foreground size-3.5 shrink-0" />
          <code className="text-foreground font-mono text-xs font-bold">{dept.code}</code>
        </div>
      ),
    },
    {
      key: 'name',
      header: 'Department Name',
      sortable: true,
      cell: (dept) => <span className="text-foreground text-xs font-medium">{dept.name}</span>,
    },
    {
      key: 'createdAt',
      header: 'Created On',
      sortable: true,
      className: 'w-[140px]',
      cell: (dept) => (
        <span className="text-muted-foreground font-mono text-xs">
          {formatDate(dept.createdAt)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: <span className="sr-only">Actions</span>,
      sortable: false,
      className: 'w-[60px] text-right',
      cell: (dept) => (
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger
              className="hover:bg-accent text-muted-foreground hover:text-foreground flex size-7 cursor-pointer items-center justify-center rounded-sm outline-hidden"
              aria-label={`Actions for ${dept.name}`}
            >
              <MoreHorizontalIcon className="size-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuGroup>
                <DropdownMenuLabel className="text-muted-foreground text-[11px] font-medium">
                  Department
                </DropdownMenuLabel>
                <PermissionGuard require="department:delete">
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setDeptToDelete(dept)}
                    className="cursor-pointer gap-2 text-xs text-rose-600 focus:text-rose-700"
                  >
                    <Trash2Icon className="size-3.5" />
                    <span>Delete Dept</span>
                  </DropdownMenuItem>
                </PermissionGuard>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  return (
    <>
      <DataTable<Department>
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
        onSearchChange={(q) => {
          setSearch(q);
          setPage(1);
        }}
        searchPlaceholder="Search departments by name or code..."
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={handleSortChange}
        keyExtractor={(dept) => dept.id}
        actions={
          <PermissionGuard require="department:create">
            <Button
              render={<Link href="/app/academics/departments/new" />}
              size="sm"
              className="h-8 gap-1.5 text-xs font-semibold"
            >
              <PlusIcon className="size-3.5" />
              <span>Add Department</span>
            </Button>
          </PermissionGuard>
        }
        emptyTitle="No departments found"
        emptyDescription={
          search
            ? 'No departments match your search criteria.'
            : 'No academic departments have been configured yet.'
        }
      />

      <AlertDialog
        open={Boolean(deptToDelete)}
        onOpenChange={(open) => {
          if (!open) setDeptToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm font-semibold text-rose-700 dark:text-rose-400">
              Delete Academic Department?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground text-xs">
              Are you sure you want to delete department{' '}
              <strong className="text-foreground">{deptToDelete?.name}</strong> (
              {deptToDelete?.code})? This action cannot be undone and will fail if active programs,
              curriculum offerings, or faculty assignments remain attached to this department.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-2 gap-2">
            <AlertDialogCancel size="sm" className="h-8 text-xs">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              size="sm"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 h-8 text-xs"
              onClick={() => {
                if (deptToDelete) {
                  handleDelete(deptToDelete);
                  setDeptToDelete(null);
                }
              }}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Confirm Deletion'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
