'use client';

import {
  AlertTriangleIcon,
  ArchiveIcon,
  CheckCircle2Icon,
  ClockIcon,
  Edit2Icon,
  EyeIcon,
  GraduationCapIcon,
  Loader2Icon,
  MoreHorizontalIcon,
  PlusIcon,
  SparklesIcon,
  Trash2Icon,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as React from 'react';

import { useCurricula } from '../hooks/use-curricula';
import {
  useActivateCurriculum,
  useDeleteCurriculum,
  useRetireCurriculum,
  useUpdateCurriculum,
} from '../hooks/use-curriculum-mutations';
import { useDepartments } from '../hooks/use-departments';
import { usePrograms } from '../hooks/use-programs';
import type { CurriculumStatus, CurriculumVersion } from '../schemas/academic.schema';

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
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
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

export function CurriculaTable() {
  const router = useRouter();

  const [page, setPage] = React.useState(1);
  const [limit, setLimit] = React.useState(20);
  const [search, setSearch] = React.useState('');
  const [selectedProgramId, setSelectedProgramId] = React.useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = React.useState<string>('ALL');
  const [sortBy, setSortBy] = React.useState<'label' | 'status' | 'createdAt'>('createdAt');
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('desc');

  // Modals state
  const [editingCurriculum, setEditingCurriculum] = React.useState<CurriculumVersion | null>(null);
  const [editLabel, setEditLabel] = React.useState('');

  const [activatingCurriculum, setActivatingCurriculum] = React.useState<CurriculumVersion | null>(
    null,
  );
  const [activationViolations, setActivationViolations] = React.useState<string[] | null>(null);

  const [retiringCurriculum, setRetiringCurriculum] = React.useState<CurriculumVersion | null>(
    null,
  );
  const [deletingCurriculum, setDeletingCurriculum] = React.useState<CurriculumVersion | null>(
    null,
  );

  // Queries
  const { data: programData } = usePrograms({ limit: 100 });
  const { data: deptData } = useDepartments({ limit: 100 });

  const programsMap = React.useMemo(() => {
    const map = new Map<string, { name: string; code: string; departmentId: string }>();
    programData?.items.forEach((p) => {
      map.set(p.id, { name: p.name, code: p.code, departmentId: p.departmentId });
    });
    return map;
  }, [programData]);

  const departmentsMap = React.useMemo(() => {
    const map = new Map<string, { name: string; code: string }>();
    deptData?.items.forEach((d) => {
      map.set(d.id, { name: d.name, code: d.code });
    });
    return map;
  }, [deptData]);

  const { data, isLoading, isError, error, refetch } = useCurricula({
    page,
    limit,
    search: search.trim() || undefined,
    programId: selectedProgramId !== 'ALL' ? selectedProgramId : undefined,
    status: selectedStatus !== 'ALL' ? (selectedStatus as CurriculumStatus) : undefined,
    sortBy,
    sortOrder,
  });

  // Mutations
  const updateMutation = useUpdateCurriculum();
  const activateMutation = useActivateCurriculum();
  const retireMutation = useRetireCurriculum();
  const deleteMutation = useDeleteCurriculum();

  // Handlers
  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCurriculum || !editLabel.trim()) return;

    updateMutation.mutate(
      { id: editingCurriculum.id, values: { label: editLabel.trim() } },
      {
        onSuccess: () => {
          toast.add({
            title: 'Curriculum updated',
            description: `Curriculum label changed to "${editLabel.trim()}".`,
            type: 'success',
          });
          setEditingCurriculum(null);
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

  const handleActivateConfirm = () => {
    if (!activatingCurriculum) return;
    setActivationViolations(null);

    activateMutation.mutate(activatingCurriculum.id, {
      onSuccess: () => {
        toast.add({
          title: 'Curriculum activated',
          description: `Curriculum "${activatingCurriculum.label}" is now ACTIVE and available for admissions.`,
          type: 'success',
        });
        setActivatingCurriculum(null);
      },
      onError: (err) => {
        // Extract violations if formatted with semicolon or prefix
        const msg = err.message;
        const prefix = 'Curriculum version is not ready for activation: ';
        if (msg.includes(prefix)) {
          const raw = msg.replace(prefix, '');
          const items = raw
            .split(';')
            .map((s) => s.trim())
            .filter(Boolean);
          setActivationViolations(items);
        } else {
          setActivationViolations([msg]);
        }
      },
    });
  };

  const handleRetireConfirm = () => {
    if (!retiringCurriculum) return;

    retireMutation.mutate(retiringCurriculum.id, {
      onSuccess: () => {
        toast.add({
          title: 'Curriculum retired',
          description: `Curriculum "${retiringCurriculum.label}" is now RETIRED. New student admissions are closed.`,
          type: 'success',
        });
        setRetiringCurriculum(null);
      },
      onError: (err) => {
        toast.add({
          title: 'Retirement failed',
          description: err.message,
          type: 'error',
        });
      },
    });
  };

  const handleDeleteConfirm = () => {
    if (!deletingCurriculum) return;

    deleteMutation.mutate(deletingCurriculum.id, {
      onSuccess: () => {
        toast.add({
          title: 'Curriculum deleted',
          description: `Draft curriculum "${deletingCurriculum.label}" was permanently removed.`,
          type: 'success',
        });
        setDeletingCurriculum(null);
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

  const handleSortChange = (field: string) => {
    if (field === sortBy) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field as 'label' | 'status' | 'createdAt');
      setSortOrder('asc');
    }
    setPage(1);
  };

  const columns: ColumnDef<CurriculumVersion>[] = [
    {
      key: 'label',
      header: 'Curriculum Label',
      sortable: true,
      cell: (item) => (
        <div className="flex flex-col">
          <Link
            href={`/app/academics/curricula/${item.id}`}
            className="text-foreground hover:text-primary font-medium transition-colors hover:underline"
          >
            {item.label}
          </Link>
          <span className="text-muted-foreground font-mono text-[11px]">
            ID: {item.id.slice(0, 8)}...
          </span>
        </div>
      ),
    },
    {
      key: 'program',
      header: 'Program',
      cell: (item) => {
        const prog = programsMap.get(item.programId);
        return prog ? (
          <div className="flex flex-col">
            <span className="text-foreground font-medium">{prog.name}</span>
            <Badge variant="secondary" className="mt-0.5 w-fit font-mono text-[10px]">
              {prog.code}
            </Badge>
          </div>
        ) : (
          <span className="text-muted-foreground font-mono text-xs">
            {item.programId.slice(0, 8)}...
          </span>
        );
      },
    },
    {
      key: 'department',
      header: 'Department',
      cell: (item) => {
        const prog = programsMap.get(item.programId);
        const dept = prog ? departmentsMap.get(prog.departmentId) : undefined;
        return dept ? (
          <div className="flex flex-col">
            <span className="text-foreground text-xs">{dept.name}</span>
            <span className="text-muted-foreground font-mono text-[11px]">{dept.code}</span>
          </div>
        ) : (
          <span className="text-muted-foreground text-xs">-</span>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      cell: (item) => {
        switch (item.status) {
          case 'ACTIVE':
            return (
              <Badge
                variant="outline"
                className="gap-1 border-emerald-500/30 bg-emerald-500/10 font-mono text-[10px] text-emerald-700 uppercase dark:text-emerald-400"
              >
                <CheckCircle2Icon className="size-3 text-emerald-600 dark:text-emerald-400" />
                Active
              </Badge>
            );
          case 'DRAFT':
            return (
              <Badge
                variant="outline"
                className="gap-1 border-amber-500/30 bg-amber-500/10 font-mono text-[10px] text-amber-700 uppercase dark:text-amber-400"
              >
                <ClockIcon className="size-3 text-amber-600 dark:text-amber-400" />
                Draft
              </Badge>
            );
          case 'RETIRED':
            return (
              <Badge
                variant="outline"
                className="gap-1 border-zinc-500/30 bg-zinc-500/10 font-mono text-[10px] text-zinc-600 uppercase dark:text-zinc-400"
              >
                <ArchiveIcon className="size-3 text-zinc-500" />
                Retired
              </Badge>
            );
          default:
            return <Badge variant="outline">{item.status}</Badge>;
        }
      },
    },
    {
      key: 'createdAt',
      header: 'Created On',
      sortable: true,
      cell: (item) => (
        <span className="text-muted-foreground text-xs">{formatDate(item.createdAt)}</span>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-[60px] text-right',
      cell: (item) => (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="icon-sm" className="size-7">
                <MoreHorizontalIcon className="size-3.5" />
                <span className="sr-only">Actions</span>
              </Button>
            }
          />
          <DropdownMenuContent align="end" className="w-48 text-xs">
            <DropdownMenuLabel>Curriculum Actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => router.push(`/app/academics/curricula/${item.id}`)}>
              <EyeIcon className="mr-2 size-3.5" />
              View Structure
            </DropdownMenuItem>

            {item.status === 'DRAFT' && (
              <PermissionGuard require="curriculumVersion:update">
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    setEditingCurriculum(item);
                    setEditLabel(item.label);
                  }}
                >
                  <Edit2Icon className="mr-2 size-3.5" />
                  Edit Label
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setActivatingCurriculum(item);
                    setActivationViolations(null);
                  }}
                  className="text-emerald-600 focus:text-emerald-600 dark:text-emerald-400"
                >
                  <SparklesIcon className="mr-2 size-3.5" />
                  Activate Version
                </DropdownMenuItem>
              </PermissionGuard>
            )}

            {item.status === 'ACTIVE' && (
              <PermissionGuard require="curriculumVersion:update">
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setRetiringCurriculum(item)}
                  className="text-amber-600 focus:text-amber-600 dark:text-amber-400"
                >
                  <ArchiveIcon className="mr-2 size-3.5" />
                  Retire Version
                </DropdownMenuItem>
              </PermissionGuard>
            )}

            {item.status === 'DRAFT' && (
              <PermissionGuard require="curriculumVersion:delete">
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setDeletingCurriculum(item)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2Icon className="mr-2 size-3.5" />
                  Delete Draft
                </DropdownMenuItem>
              </PermissionGuard>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const filterSlot = (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={selectedProgramId}
        onValueChange={(val) => {
          if (val) {
            setSelectedProgramId(val);
            setPage(1);
          }
        }}
      >
        <SelectTrigger className="h-8 min-w-[170px] text-xs">
          <GraduationCapIcon className="text-muted-foreground mr-1 size-3" />
          <SelectValue placeholder="All Programs" />
        </SelectTrigger>
        <SelectContent className="max-h-60 text-xs">
          <SelectItem value="ALL">All Degree Programs</SelectItem>
          {programData?.items.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.code} - {p.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={selectedStatus}
        onValueChange={(val) => {
          if (val) {
            setSelectedStatus(val);
            setPage(1);
          }
        }}
      >
        <SelectTrigger className="h-8 w-[130px] text-xs">
          <SelectValue placeholder="All Statuses" />
        </SelectTrigger>
        <SelectContent className="text-xs">
          <SelectItem value="ALL">All Statuses</SelectItem>
          <SelectItem value="DRAFT">Draft</SelectItem>
          <SelectItem value="ACTIVE">Active</SelectItem>
          <SelectItem value="RETIRED">Retired</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <>
      <DataTable
        columns={columns}
        data={data?.items}
        total={data?.pagination.total}
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
        search={search}
        onSearchChange={(s) => {
          setSearch(s);
          setPage(1);
        }}
        searchPlaceholder="Search curriculum label (e.g. R22-CSE)..."
        filterSlot={filterSlot}
        keyExtractor={(item) => item.id}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={handleSortChange}
        emptyTitle="No curriculum versions found"
        emptyDescription="Create a draft curriculum version under a degree program to begin defining its semester and subject syllabus."
        emptyAction={
          <PermissionGuard require="curriculumVersion:create">
            <Button
              size="sm"
              className="gap-1.5 text-xs"
              render={<Link href="/app/academics/curricula/new" />}
            >
              <PlusIcon className="size-3.5" />
              <span>Create Curriculum Version</span>
            </Button>
          </PermissionGuard>
        }
        actions={
          <PermissionGuard require="curriculumVersion:create">
            <Button
              size="sm"
              className="gap-1.5 text-xs"
              render={<Link href="/app/academics/curricula/new" />}
            >
              <PlusIcon className="size-3.5" />
              <span>New Curriculum</span>
            </Button>
          </PermissionGuard>
        }
      />

      {/* Edit Label Dialog */}
      <Dialog
        open={Boolean(editingCurriculum)}
        onOpenChange={(open) => !open && setEditingCurriculum(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Curriculum Label</DialogTitle>
            <DialogDescription>
              Update the administrative label for this draft version.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditSubmit} className="space-y-4 pt-2">
            <FieldGroup>
              <Field>
                <FieldLabel>Curriculum Label</FieldLabel>
                <Input
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                  placeholder="e.g. R22-CSE"
                  required
                />
              </Field>
            </FieldGroup>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingCurriculum(null)}
                disabled={updateMutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateMutation.isPending || !editLabel.trim()}>
                {updateMutation.isPending && <Loader2Icon className="mr-1.5 size-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Activate Curriculum Dialog */}
      <AlertDialog
        open={Boolean(activatingCurriculum)}
        onOpenChange={(open) => {
          if (!open) {
            setActivatingCurriculum(null);
            setActivationViolations(null);
          }
        }}
      >
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <SparklesIcon className="size-5 text-emerald-600" />
              <span>Activate Curriculum Version</span>
            </AlertDialogTitle>
            <AlertDialogDescription render={<div />} className="space-y-3 pt-2 text-left">
              <div>
                Activating <strong>{activatingCurriculum?.label}</strong> will lock its semester
                structure permanently and enable it for student intake.
              </div>

              {activationViolations && activationViolations.length > 0 && (
                <div className="border-destructive/40 bg-destructive/10 space-y-2 rounded-md border p-3">
                  <div className="text-destructive flex items-center gap-2 text-xs font-semibold">
                    <AlertTriangleIcon className="size-4" />
                    <span>Readiness Validation Failed</span>
                  </div>
                  <ul className="text-destructive list-disc space-y-1 pl-4 text-xs">
                    {activationViolations.map((v, i) => (
                      <li key={i}>{v}</li>
                    ))}
                  </ul>
                  <div className="text-muted-foreground pt-1 text-[11px]">
                    Resolve all structural violations in the syllabus workspace before activating.
                  </div>
                </div>
              )}

              {!activationViolations && (
                <div className="bg-muted/50 text-muted-foreground space-y-1 rounded-md p-3 text-xs">
                  <div className="text-foreground font-semibold">Backend Readiness Checklist:</div>
                  <div>&bull; Must contain exactly the total semesters defined by the program</div>
                  <div>
                    &bull; Semesters must be sequentially numbered without gaps or duplicates
                  </div>
                  <div>&bull; Every semester must contain at least one subject</div>
                  <div>&bull; Elective groups must satisfy minSelect &le; maxSelect</div>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={activateMutation.isPending}>
              {activationViolations ? 'Close' : 'Cancel'}
            </AlertDialogCancel>
            {!activationViolations && (
              <AlertDialogAction
                onClick={handleActivateConfirm}
                disabled={activateMutation.isPending}
                className="bg-emerald-600 text-white hover:bg-emerald-700"
              >
                {activateMutation.isPending && (
                  <Loader2Icon className="mr-1.5 size-4 animate-spin" />
                )}
                Validate &amp; Activate
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Retire Curriculum Dialog */}
      <AlertDialog
        open={Boolean(retiringCurriculum)}
        onOpenChange={(open) => !open && setRetiringCurriculum(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangleIcon className="size-5" />
              <span>Retire Curriculum Version</span>
            </AlertDialogTitle>
            <AlertDialogDescription render={<div />} className="space-y-2 pt-2">
              <div>
                Are you sure you want to retire <strong>{retiringCurriculum?.label}</strong>?
              </div>
              <div className="text-muted-foreground text-xs">
                Once retired, this curriculum will be permanently closed to new admissions. Existing
                enrolled students and past term records will remain intact. This action cannot be
                reversed.
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={retireMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRetireConfirm}
              disabled={retireMutation.isPending}
              className="bg-amber-600 text-white hover:bg-amber-700"
            >
              {retireMutation.isPending && <Loader2Icon className="mr-1.5 size-4 animate-spin" />}
              Retire Curriculum
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Draft Dialog */}
      <AlertDialog
        open={Boolean(deletingCurriculum)}
        onOpenChange={(open) => !open && setDeletingCurriculum(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive flex items-center gap-2">
              <Trash2Icon className="size-5" />
              <span>Delete Draft Curriculum</span>
            </AlertDialogTitle>
            <AlertDialogDescription render={<div />} className="space-y-2 pt-2">
              <div>
                Are you sure you want to permanently delete draft curriculum{' '}
                <strong>{deletingCurriculum?.label}</strong>?
              </div>
              <div className="text-muted-foreground text-xs">
                This will delete the version and any associated uncommitted draft structure. Active
                or historical versions cannot be deleted.
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleteMutation.isPending}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {deleteMutation.isPending && <Loader2Icon className="mr-1.5 size-4 animate-spin" />}
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
