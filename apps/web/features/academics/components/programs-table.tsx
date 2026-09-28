'use client';

import {
  FilterIcon,
  GraduationCapIcon,
  Loader2Icon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from 'lucide-react';
import * as React from 'react';

import { useCreateProgram } from '../hooks/use-create-program';
import { useDeleteProgram } from '../hooks/use-delete-program';
import { useDepartments } from '../hooks/use-departments';
import { usePrograms } from '../hooks/use-programs';
import { useUpdateProgram } from '../hooks/use-update-program';
import type { Program } from '../schemas/academic.schema';

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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/components/ui/toast';
import { formatDate } from '@/lib/formatters';

export function ProgramsTable() {
  const [page, setPage] = React.useState(1);
  const [limit, setLimit] = React.useState(20);
  const [search, setSearch] = React.useState('');
  const [selectedDeptId, setSelectedDeptId] = React.useState<string>('ALL');
  const [sortBy, setSortBy] = React.useState<'name' | 'code' | 'createdAt'>('name');
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('asc');

  // Register program dialog state
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  const [progCode, setProgCode] = React.useState('');
  const [progName, setProgName] = React.useState('');
  const [progDeptId, setProgDeptId] = React.useState('');
  const [progDurationYears, setProgDurationYears] = React.useState(4);
  const [progTotalSemesters, setProgTotalSemesters] = React.useState(8);

  const { data: deptData } = useDepartments({ limit: 100 });
  const createProgramMutation = useCreateProgram();

  const handleCreateProgram = (e: React.FormEvent) => {
    e.preventDefault();
    if (!progCode.trim() || !progName.trim() || !progDeptId) {
      toast.add({
        title: 'Validation error',
        description: 'Please specify program code, title, and assigned department.',
        type: 'error',
      });
      return;
    }

    createProgramMutation.mutate(
      {
        code: progCode.trim().toUpperCase(),
        name: progName.trim(),
        departmentId: progDeptId,
        durationYears: Number(progDurationYears),
        totalSemesters: Number(progTotalSemesters),
      },
      {
        onSuccess: (created) => {
          toast.add({
            title: 'Program registered',
            description: `Academic program "${created.name}" (${created.code}) created successfully.`,
            type: 'success',
          });
          setCreateDialogOpen(false);
          setProgCode('');
          setProgName('');
          setProgDeptId('');
          setProgDurationYears(4);
          setProgTotalSemesters(8);
        },
        onError: (err) => {
          toast.add({
            title: 'Registration failed',
            description: err.message,
            type: 'error',
          });
        },
      },
    );
  };

  // Edit & delete program state
  const [editingProgram, setEditingProgram] = React.useState<Program | null>(null);
  const [editName, setEditName] = React.useState('');
  const [editCode, setEditCode] = React.useState('');
  const [editDurationYears, setEditDurationYears] = React.useState(4);
  const [editTotalSemesters, setEditTotalSemesters] = React.useState(8);

  const [deletingProgram, setDeletingProgram] = React.useState<Program | null>(null);

  const updateProgramMutation = useUpdateProgram();
  const deleteProgramMutation = useDeleteProgram();

  const openEditDialog = (prog: Program) => {
    setEditingProgram(prog);
    setEditName(prog.name);
    setEditCode(prog.code);
    setEditDurationYears(prog.durationYears);
    setEditTotalSemesters(prog.totalSemesters);
  };

  const handleUpdateProgram = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProgram) return;
    if (!editName.trim() || !editCode.trim()) {
      toast.add({
        title: 'Validation error',
        description: 'Please specify program code and title.',
        type: 'error',
      });
      return;
    }

    updateProgramMutation.mutate(
      {
        id: editingProgram.id,
        payload: {
          name: editName.trim(),
          code: editCode.trim().toUpperCase(),
          durationYears: Number(editDurationYears),
          totalSemesters: Number(editTotalSemesters),
        },
      },
      {
        onSuccess: (updated) => {
          toast.add({
            title: 'Program updated',
            description: `Program "${updated.name}" updated successfully.`,
            type: 'success',
          });
          setEditingProgram(null);
        },
        onError: (err) => {
          toast.add({
            title: 'Update failed',
            description: err.message,
            type: 'error',
          });
        },
      },
    );
  };

  const handleDeleteProgram = () => {
    if (!deletingProgram) return;
    deleteProgramMutation.mutate(deletingProgram.id, {
      onSuccess: () => {
        toast.add({
          title: 'Program deleted',
          description: `Program "${deletingProgram.name}" was removed successfully.`,
          type: 'success',
        });
        setDeletingProgram(null);
      },
      onError: (err) => {
        toast.add({
          title: 'Deletion failed',
          description: err.message,
          type: 'error',
        });
      },
    });
  };

  const { data, isLoading, isError, error, refetch } = usePrograms({
    page,
    limit,
    search: search.trim() || undefined,
    departmentId: selectedDeptId === 'ALL' ? undefined : selectedDeptId,
    sortBy,
    sortOrder,
  });

  const deptMap = React.useMemo(() => {
    const map = new Map<string, string>();
    if (deptData?.items) {
      for (const d of deptData.items) {
        map.set(d.id, d.name);
      }
    }
    return map;
  }, [deptData]);

  const handleSortChange = (field: string) => {
    if (field === sortBy) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field as 'name' | 'code' | 'createdAt');
      setSortOrder('asc');
    }
  };

  const columns: ColumnDef<Program>[] = [
    {
      key: 'code',
      header: 'Program Code',
      sortable: true,
      className: 'w-[140px]',
      cell: (prog) => (
        <div className="flex items-center gap-2">
          <GraduationCapIcon className="text-muted-foreground size-3.5 shrink-0" />
          <code className="text-foreground font-mono text-xs font-bold">{prog.code}</code>
        </div>
      ),
    },
    {
      key: 'name',
      header: 'Program Title',
      sortable: true,
      cell: (prog) => (
        <div className="flex min-w-0 flex-col">
          <span className="text-foreground text-xs font-medium">{prog.name}</span>
          <span className="text-muted-foreground truncate text-[11px]">
            {deptMap.get(prog.departmentId) ?? 'Department'}
          </span>
        </div>
      ),
    },
    {
      key: 'duration',
      header: 'Curriculum Duration',
      sortable: false,
      className: 'w-[180px]',
      cell: (prog) => (
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-mono text-[10px]">
            {prog.durationYears} {prog.durationYears === 1 ? 'Year' : 'Years'}
          </Badge>
          <span className="text-muted-foreground text-xs">{prog.totalSemesters} Semesters</span>
        </div>
      ),
    },
    {
      key: 'createdAt',
      header: 'Created On',
      sortable: true,
      className: 'w-[140px]',
      cell: (prog) => (
        <span className="text-muted-foreground font-mono text-xs">
          {formatDate(prog.createdAt)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: <span className="sr-only">Actions</span>,
      sortable: false,
      className: 'w-[60px] text-right',
      cell: (prog) => (
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger
              className="hover:bg-accent text-muted-foreground hover:text-foreground flex size-7 cursor-pointer items-center justify-center rounded-sm outline-hidden"
              aria-label={`Actions for ${prog.name}`}
            >
              <MoreHorizontalIcon className="size-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuGroup>
                <DropdownMenuLabel className="text-muted-foreground text-[11px] font-medium">
                  Program Actions
                </DropdownMenuLabel>
                <PermissionGuard require="program:update">
                  <DropdownMenuItem
                    onClick={() => openEditDialog(prog)}
                    className="cursor-pointer gap-2 text-xs"
                  >
                    <PencilIcon className="size-3.5" />
                    <span>Edit Program</span>
                  </DropdownMenuItem>
                </PermissionGuard>
                <PermissionGuard require="program:delete">
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setDeletingProgram(prog)}
                    className="cursor-pointer gap-2 text-xs text-rose-600 focus:text-rose-700"
                  >
                    <Trash2Icon className="size-3.5" />
                    <span>Delete Program</span>
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
      <DataTable<Program>
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
        searchPlaceholder="Search programs by code or title..."
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={handleSortChange}
        keyExtractor={(prog) => prog.id}
        filterSlot={
          <div className="flex items-center gap-2">
            <Select
              value={selectedDeptId}
              onValueChange={(val) => {
                if (val) {
                  setSelectedDeptId(val);
                  setPage(1);
                }
              }}
            >
              <SelectTrigger className="bg-background h-8 w-[180px] text-xs">
                <FilterIcon className="text-muted-foreground mr-1.5 size-3.5" />
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Departments</SelectItem>
                {deptData?.items?.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name} ({d.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
        actions={
          <PermissionGuard require="program:create">
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-md px-3 text-xs font-semibold shadow-xs">
                <PlusIcon className="size-3.5" />
                <span>Register Program</span>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-sm font-semibold">
                    Register Academic Program
                  </DialogTitle>
                  <DialogDescription className="text-xs">
                    Create a new degree or diploma program under an academic department.
                  </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleCreateProgram} className="space-y-4 py-2">
                  <FieldGroup className="gap-3">
                    <Field>
                      <FieldLabel className="text-xs font-medium">Department</FieldLabel>
                      <Select
                        value={progDeptId}
                        onValueChange={(val) => {
                          if (val) setProgDeptId(val);
                        }}
                        disabled={createProgramMutation.isPending}
                      >
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue placeholder="Select parent department..." />
                        </SelectTrigger>
                        <SelectContent>
                          {deptData?.items?.map((d) => (
                            <SelectItem key={d.id} value={d.id} className="text-xs">
                              {d.name} ({d.code})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>

                    <div className="grid grid-cols-3 gap-3">
                      <Field className="col-span-1">
                        <FieldLabel className="text-xs font-medium">Program Code</FieldLabel>
                        <Input
                          placeholder="e.g. BE-CSE"
                          value={progCode}
                          onChange={(e) => setProgCode(e.target.value.toUpperCase())}
                          className="h-9 font-mono text-xs font-bold"
                          disabled={createProgramMutation.isPending}
                          required
                        />
                      </Field>

                      <Field className="col-span-2">
                        <FieldLabel className="text-xs font-medium">Program Title</FieldLabel>
                        <Input
                          placeholder="e.g. B.E. Computer Science"
                          value={progName}
                          onChange={(e) => setProgName(e.target.value)}
                          className="h-9 text-xs"
                          disabled={createProgramMutation.isPending}
                          required
                        />
                      </Field>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <Field>
                        <FieldLabel className="text-xs font-medium">Duration (Years)</FieldLabel>
                        <Input
                          type="number"
                          min={1}
                          max={6}
                          value={progDurationYears}
                          onChange={(e) => setProgDurationYears(Number(e.target.value))}
                          className="h-9 font-mono text-xs"
                          disabled={createProgramMutation.isPending}
                          required
                        />
                      </Field>

                      <Field>
                        <FieldLabel className="text-xs font-medium">Total Semesters</FieldLabel>
                        <Input
                          type="number"
                          min={1}
                          max={12}
                          value={progTotalSemesters}
                          onChange={(e) => setProgTotalSemesters(Number(e.target.value))}
                          className="h-9 font-mono text-xs"
                          disabled={createProgramMutation.isPending}
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
                      disabled={createProgramMutation.isPending}
                    >
                      {createProgramMutation.isPending ? (
                        <Loader2Icon className="size-3.5 animate-spin" />
                      ) : (
                        <PlusIcon className="size-3.5" />
                      )}
                      <span>Create Program</span>
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </PermissionGuard>
        }
        emptyTitle="No academic programs found"
        emptyDescription={
          search || selectedDeptId !== 'ALL'
            ? 'No programs match the active filters or search criteria.'
            : 'No degree or diploma programs have been registered yet.'
        }
      />

      <Dialog
        open={!!editingProgram}
        onOpenChange={(open) => {
          if (!open) setEditingProgram(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">Edit Academic Program</DialogTitle>
            <DialogDescription className="text-xs">
              Update program title, code, or curriculum parameters.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpdateProgram} className="space-y-4 pt-2">
            <FieldGroup className="space-y-3">
              <Field>
                <FieldLabel className="text-xs">Program Code</FieldLabel>
                <Input
                  value={editCode}
                  onChange={(e) => setEditCode(e.target.value.toUpperCase())}
                  placeholder="e.g. BTECH-CSE"
                  className="h-9 font-mono text-xs uppercase"
                  disabled={updateProgramMutation.isPending}
                  required
                />
              </Field>

              <Field>
                <FieldLabel className="text-xs">Program Title</FieldLabel>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="e.g. Bachelor of Technology in Computer Science"
                  className="h-9 text-xs"
                  disabled={updateProgramMutation.isPending}
                  required
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field>
                  <FieldLabel className="text-xs">Duration (Years)</FieldLabel>
                  <Input
                    type="number"
                    min={1}
                    max={6}
                    value={editDurationYears}
                    onChange={(e) => setEditDurationYears(Number(e.target.value))}
                    className="h-9 font-mono text-xs"
                    disabled={updateProgramMutation.isPending}
                    required
                  />
                </Field>

                <Field>
                  <FieldLabel className="text-xs">Total Semesters</FieldLabel>
                  <Input
                    type="number"
                    min={1}
                    max={12}
                    value={editTotalSemesters}
                    onChange={(e) => setEditTotalSemesters(Number(e.target.value))}
                    className="h-9 font-mono text-xs"
                    disabled={updateProgramMutation.isPending}
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
                onClick={() => setEditingProgram(null)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="h-8 gap-1.5 text-xs font-semibold"
                disabled={updateProgramMutation.isPending}
              >
                {updateProgramMutation.isPending ? (
                  <Loader2Icon className="size-3.5 animate-spin" />
                ) : (
                  <PencilIcon className="size-3.5" />
                )}
                <span>Save Changes</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deletingProgram}
        onOpenChange={(open) => {
          if (!open) setDeletingProgram(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm font-semibold text-rose-600">
              Delete Academic Program?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              Are you sure you want to permanently remove program{' '}
              <strong className="text-foreground">{deletingProgram?.name}</strong> (
              {deletingProgram?.code})? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-2 gap-2">
            <AlertDialogCancel size="sm" className="h-8 text-xs">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              size="sm"
              className="h-8 bg-rose-600 text-xs text-white hover:bg-rose-700"
              onClick={handleDeleteProgram}
              disabled={deleteProgramMutation.isPending}
            >
              {deleteProgramMutation.isPending ? 'Deleting...' : 'Confirm Deletion'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
