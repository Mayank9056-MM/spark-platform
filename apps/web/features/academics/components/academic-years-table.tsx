'use client';

import {
  CalendarIcon,
  CheckCircle2Icon,
  ClockIcon,
  Loader2Icon,
  PlayCircleIcon,
  PlusIcon,
} from 'lucide-react';
import * as React from 'react';

import { useAcademicYears } from '../hooks/use-academic-years';
import { useActivateAcademicYear } from '../hooks/use-activate-academic-year';
import { useCreateAcademicYear } from '../hooks/use-create-academic-year';
import type { AcademicYear } from '../schemas/academic.schema';

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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/toast';
import { formatDate } from '@/lib/formatters';

export function AcademicYearsTable() {
  const [page, setPage] = React.useState(1);
  const [limit, setLimit] = React.useState(20);

  // Create session dialog state
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  const [newLabel, setNewLabel] = React.useState('');
  const [newStartDate, setNewStartDate] = React.useState('');
  const [newEndDate, setNewEndDate] = React.useState('');

  const { data, isLoading, isError, error, refetch } = useAcademicYears({
    page,
    limit,
    sortBy: 'startDate',
    sortOrder: 'desc',
  });

  const activateMutation = useActivateAcademicYear();
  const createMutation = useCreateAcademicYear();

  const handleActivate = (year: AcademicYear) => {
    activateMutation.mutate(year.id, {
      onSuccess: () => {
        toast.add({
          title: 'Session activated',
          description: `Academic term "${year.label}" is now the active operational session.`,
          type: 'success',
        });
      },
      onError: (err) => {
        toast.add({
          title: 'Activation failed',
          description: err.message,
          type: 'error',
        });
      },
    });
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel.trim() || !newStartDate || !newEndDate) {
      toast.add({
        title: 'Validation error',
        description: 'Please complete all required fields for the academic session.',
        type: 'error',
      });
      return;
    }

    createMutation.mutate(
      {
        label: newLabel.trim(),
        startDate: newStartDate,
        endDate: newEndDate,
      },
      {
        onSuccess: (created) => {
          toast.add({
            title: 'Academic session created',
            description: `Configured session "${created.label}" successfully.`,
            type: 'success',
          });
          setCreateDialogOpen(false);
          setNewLabel('');
          setNewStartDate('');
          setNewEndDate('');
        },
        onError: (err) => {
          toast.add({
            title: 'Creation failed',
            description: err.message,
            type: 'error',
          });
        },
      },
    );
  };

  const columns: ColumnDef<AcademicYear>[] = [
    {
      key: 'label',
      header: 'Academic Term / Session',
      sortable: false,
      cell: (year) => (
        <div className="flex items-center gap-2">
          <CalendarIcon className="text-muted-foreground size-3.5 shrink-0" />
          <span className="text-foreground text-xs font-semibold">{year.label}</span>
        </div>
      ),
    },
    {
      key: 'isActive',
      header: 'Operational Status',
      sortable: false,
      className: 'w-[160px]',
      cell: (year) =>
        year.isActive ? (
          <Badge
            variant="outline"
            className="gap-1 border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-emerald-700 uppercase dark:text-emerald-400"
          >
            <CheckCircle2Icon className="size-3" aria-hidden="true" />
            <span>Active Session</span>
          </Badge>
        ) : (
          <Badge
            variant="secondary"
            className="border-muted text-muted-foreground gap-1 px-2 py-0.5 font-mono text-[10px] uppercase"
          >
            <ClockIcon className="size-3" aria-hidden="true" />
            <span>Archived Term</span>
          </Badge>
        ),
    },
    {
      key: 'startDate',
      header: 'Session Start',
      sortable: false,
      className: 'w-[140px]',
      cell: (year) => (
        <span className="text-muted-foreground font-mono text-xs">
          {formatDate(year.startDate)}
        </span>
      ),
    },
    {
      key: 'endDate',
      header: 'Session End',
      sortable: false,
      className: 'w-[140px]',
      cell: (year) => (
        <span className="text-muted-foreground font-mono text-xs">{formatDate(year.endDate)}</span>
      ),
    },
    {
      key: 'actions',
      header: <span className="sr-only">Actions</span>,
      sortable: false,
      className: 'w-[140px] text-right',
      cell: (year) =>
        !year.isActive ? (
          <PermissionGuard require="academicYear:activate">
            <AlertDialog>
              <AlertDialogTrigger className="bg-background inline-flex h-7 cursor-pointer items-center justify-center gap-1 rounded-md border border-emerald-500/30 px-2.5 text-[11px] font-medium text-emerald-600 shadow-2xs hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/20">
                <PlayCircleIcon className="size-3.5" />
                <span>Activate Term</span>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                    Activate Academic Session?
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-muted-foreground text-xs">
                    Activating <strong className="text-foreground">{year.label}</strong> will set it
                    as the college-wide active academic session. Any currently active session will
                    be archived.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="mt-2 gap-2">
                  <AlertDialogCancel size="sm" className="h-8 text-xs">
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    size="sm"
                    className="h-8 bg-emerald-600 text-xs text-white hover:bg-emerald-700"
                    onClick={() => handleActivate(year)}
                    disabled={activateMutation.isPending}
                  >
                    {activateMutation.isPending ? 'Activating...' : 'Confirm Activation'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </PermissionGuard>
        ) : null,
    },
  ];

  return (
    <DataTable<AcademicYear>
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
      keyExtractor={(year) => year.id}
      actions={
        <PermissionGuard require="academicYear:create">
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-md px-3 text-xs font-semibold shadow-xs">
              <PlusIcon className="size-3.5" />
              <span>Add Academic Session</span>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-sm font-semibold">New Academic Session</DialogTitle>
                <DialogDescription className="text-xs">
                  Configure an institutional academic term and its calendar bounds.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleCreate} className="space-y-4 py-2">
                <FieldGroup className="gap-3">
                  <Field>
                    <FieldLabel className="text-xs font-medium">Session Label</FieldLabel>
                    <Input
                      placeholder="e.g. 2025-26"
                      value={newLabel}
                      onChange={(e) => setNewLabel(e.target.value)}
                      className="h-9 text-xs"
                      disabled={createMutation.isPending}
                      required
                    />
                  </Field>

                  <div className="grid grid-cols-2 gap-3">
                    <Field>
                      <FieldLabel className="text-xs font-medium">Start Date</FieldLabel>
                      <Input
                        type="date"
                        value={newStartDate}
                        onChange={(e) => setNewStartDate(e.target.value)}
                        className="h-9 font-mono text-xs"
                        disabled={createMutation.isPending}
                        required
                      />
                    </Field>

                    <Field>
                      <FieldLabel className="text-xs font-medium">End Date</FieldLabel>
                      <Input
                        type="date"
                        value={newEndDate}
                        onChange={(e) => setNewEndDate(e.target.value)}
                        className="h-9 font-mono text-xs"
                        disabled={createMutation.isPending}
                        required
                      />
                    </Field>
                  </div>
                </FieldGroup>

                <DialogFooter className="gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => setCreateDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    className="h-8 gap-1.5 text-xs font-semibold"
                    disabled={createMutation.isPending}
                  >
                    {createMutation.isPending ? (
                      <Loader2Icon className="size-3.5 animate-spin" />
                    ) : (
                      <PlusIcon className="size-3.5" />
                    )}
                    <span>Create Session</span>
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </PermissionGuard>
      }
      emptyTitle="No academic sessions recorded"
      emptyDescription="No institutional academic sessions have been configured in the system."
    />
  );
}
