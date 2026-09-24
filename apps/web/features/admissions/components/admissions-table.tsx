'use client';

import { BanIcon, EyeIcon, FileTextIcon, FilterIcon, MoreHorizontalIcon } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { useAdmissions } from '../hooks/use-admissions';
import { useCancelAdmission } from '../hooks/use-cancel-admission';
import type { Admission, AdmissionStatus, AdmissionType } from '../schemas/admission.schema';

import { AdmissionStatusBadge } from './admission-status-badge';

import { PermissionGuard } from '@/components/auth/permission-guard';
import { type ColumnDef, DataTable } from '@/components/erp/data-table';
import { Badge } from '@/components/ui/badge';
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
import { toast } from '@/components/ui/toast';
import { formatDate } from '@/lib/formatters';

export function AdmissionsTable() {
  const [page, setPage] = React.useState(1);
  const [limit, setLimit] = React.useState(20);
  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<AdmissionStatus | 'ALL'>('ALL');
  const [typeFilter, setTypeFilter] = React.useState<AdmissionType | 'ALL'>('ALL');
  const [sortBy, setSortBy] = React.useState<'admissionNumber' | 'admissionDate' | 'createdAt'>(
    'createdAt',
  );
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('desc');

  const { data, isLoading, isError, error, refetch } = useAdmissions({
    page,
    limit,
    search: search.trim() || undefined,
    status: statusFilter === 'ALL' ? undefined : statusFilter,
    admissionType: typeFilter === 'ALL' ? undefined : typeFilter,
    sortBy,
    sortOrder,
  });

  const cancelMutation = useCancelAdmission();

  const handleSortChange = (field: string) => {
    if (field === sortBy) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field as 'admissionNumber' | 'admissionDate' | 'createdAt');
      setSortOrder('asc');
    }
  };

  const handleCancel = (admission: Admission) => {
    cancelMutation.mutate(admission.id, {
      onSuccess: () => {
        toast.add({
          title: 'Admission cancelled',
          description: `Admission ${admission.admissionNumber} has been marked cancelled.`,
          type: 'success',
        });
      },
      onError: (err) => {
        toast.add({
          title: 'Cancellation failed',
          description: err.message,
          type: 'error',
        });
      },
    });
  };

  const columns: ColumnDef<Admission>[] = [
    {
      key: 'admissionNumber',
      header: 'Admission Reg No',
      sortable: true,
      className: 'w-[180px]',
      cell: (adm) => (
        <div className="flex items-center gap-2">
          <FileTextIcon className="text-muted-foreground size-3.5 shrink-0" />
          <Link
            href={`/app/admissions/${adm.id}`}
            className="text-foreground hover:text-primary font-mono text-xs font-bold select-all hover:underline"
          >
            {adm.admissionNumber}
          </Link>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type & Quota',
      sortable: false,
      cell: (adm) => (
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-mono text-[10px] uppercase">
            {adm.admissionType}
          </Badge>
          <span className="text-muted-foreground text-[11px]">{adm.quota.replace(/_/g, ' ')}</span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: false,
      className: 'w-[140px]',
      cell: (adm) => <AdmissionStatusBadge status={adm.status} />,
    },
    {
      key: 'admissionDate',
      header: 'Admission Date',
      sortable: true,
      className: 'w-[140px]',
      cell: (adm) => (
        <span className="text-muted-foreground font-mono text-xs">
          {formatDate(adm.admissionDate)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: <span className="sr-only">Actions</span>,
      sortable: false,
      className: 'w-[60px] text-right',
      cell: (adm) => {
        const isCancelled = adm.status === 'CANCELLED';
        const isCancelling = cancelMutation.isPending && cancelMutation.variables === adm.id;

        return (
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger
                className="hover:bg-accent text-muted-foreground hover:text-foreground flex size-7 cursor-pointer items-center justify-center rounded-sm outline-hidden disabled:opacity-50"
                disabled={isCancelling}
                aria-label={`Actions for admission ${adm.admissionNumber}`}
              >
                <MoreHorizontalIcon className="size-3.5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="text-muted-foreground text-[11px] font-medium">
                    Admission Actions
                  </DropdownMenuLabel>
                  <DropdownMenuItem
                    render={<Link href={`/app/admissions/${adm.id}`} />}
                    className="cursor-pointer gap-2 text-xs"
                  >
                    <EyeIcon className="text-muted-foreground size-3.5" />
                    <span>View Details</span>
                  </DropdownMenuItem>

                  {!isCancelled && (
                    <PermissionGuard require="admission:cancel">
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleCancel(adm)}
                        className="cursor-pointer gap-2 text-xs text-rose-600 focus:text-rose-700"
                      >
                        <BanIcon className="size-3.5" />
                        <span>Cancel Admission</span>
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
    <DataTable<Admission>
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
      searchPlaceholder="Search admissions by number..."
      sortBy={sortBy}
      sortOrder={sortOrder}
      onSortChange={handleSortChange}
      keyExtractor={(adm) => adm.id}
      filterSlot={
        <div className="flex items-center gap-2">
          <Select
            value={statusFilter}
            onValueChange={(val) => {
              if (val) {
                setStatusFilter(val);
                setPage(1);
              }
            }}
          >
            <SelectTrigger className="bg-background h-8 w-[140px] text-xs">
              <FilterIcon className="text-muted-foreground mr-1.5 size-3.5" />
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              <SelectItem value="CONFIRMED">Confirmed</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={typeFilter}
            onValueChange={(val) => {
              if (val) {
                setTypeFilter(val);
                setPage(1);
              }
            }}
          >
            <SelectTrigger className="bg-background h-8 w-[140px] text-xs">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Types</SelectItem>
              <SelectItem value="NORMAL">Normal</SelectItem>
              <SelectItem value="LATERAL">Lateral Entry</SelectItem>
              <SelectItem value="EXCEPTION">Exception</SelectItem>
            </SelectContent>
          </Select>
        </div>
      }
      emptyTitle="No admission records found"
      emptyDescription={
        search || statusFilter !== 'ALL' || typeFilter !== 'ALL'
          ? 'No admissions match your active search or filter criteria.'
          : 'No student admissions have been enrolled in the system.'
      }
    />
  );
}
