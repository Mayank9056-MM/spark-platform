'use client';

import { FilterIcon, GraduationCapIcon, Loader2Icon, PlusIcon } from 'lucide-react';
import * as React from 'react';

import { useCreateProgram } from '../hooks/use-create-program';
import { useDepartments } from '../hooks/use-departments';
import { usePrograms } from '../hooks/use-programs';
import type { Program } from '../schemas/academic.schema';

import { PermissionGuard } from '@/components/auth/permission-guard';
import { type ColumnDef, DataTable } from '@/components/erp/data-table';
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
  ];

  return (
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
  );
}
