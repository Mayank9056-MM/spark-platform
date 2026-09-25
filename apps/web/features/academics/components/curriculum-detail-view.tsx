'use client';

import {
  AlertCircleIcon,
  AlertTriangleIcon,
  ArchiveIcon,
  ArrowLeftIcon,
  BookOpenIcon,
  Building2Icon,
  CheckCircle2Icon,
  ClockIcon,
  Edit2Icon,
  FolderPlusIcon,
  GraduationCapIcon,
  LayersIcon,
  Loader2Icon,
  PlusIcon,
  ShieldCheckIcon,
  SparklesIcon,
  Trash2Icon,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as React from 'react';

import { useCurriculumStructure } from '../hooks/use-curriculum';
import {
  useActivateCurriculum,
  useDeleteCurriculum,
  useRetireCurriculum,
  useUpdateCurriculum,
} from '../hooks/use-curriculum-mutations';
import {
  useCreateElectiveGroup,
  useCreateSemesterCatalog,
  useCreateSubject,
  useDeleteElectiveGroup,
  useDeleteSemesterCatalog,
  useDeleteSubject,
  useUpdateElectiveGroup,
  useUpdateSubject,
} from '../hooks/use-curriculum-structure-mutations';
import type {
  CurriculumStructureElectiveGroup,
  CurriculumStructureSubject,
} from '../schemas/academic.schema';

import { PermissionGuard } from '@/components/auth/permission-guard';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/toast';

interface CurriculumDetailViewProps {
  id: string;
}

export function CurriculumDetailView({ id }: CurriculumDetailViewProps) {
  const router = useRouter();

  const { data: curriculum, isLoading, isError, error, refetch } = useCurriculumStructure(id);

  // Lifecycle Mutations
  const updateCurriculumMutation = useUpdateCurriculum(id);
  const activateCurriculumMutation = useActivateCurriculum(id);
  const retireCurriculumMutation = useRetireCurriculum(id);
  const deleteCurriculumMutation = useDeleteCurriculum();

  // Structure Mutations
  const createSemesterMutation = useCreateSemesterCatalog(id);
  const deleteSemesterMutation = useDeleteSemesterCatalog(id);
  const createSubjectMutation = useCreateSubject(id);
  const updateSubjectMutation = useUpdateSubject(id);
  const deleteSubjectMutation = useDeleteSubject(id);
  const createElectiveGroupMutation = useCreateElectiveGroup(id);
  const updateElectiveGroupMutation = useUpdateElectiveGroup(id);
  const deleteElectiveGroupMutation = useDeleteElectiveGroup(id);

  // Modals state
  const [isEditLabelOpen, setIsEditLabelOpen] = React.useState(false);
  const [editLabel, setEditLabel] = React.useState('');

  const [isActivateOpen, setIsActivateOpen] = React.useState(false);
  const [activationViolations, setActivationViolations] = React.useState<string[] | null>(null);

  const [isRetireOpen, setIsRetireOpen] = React.useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);

  // Subject Modal state
  const [subjectModal, setSubjectModal] = React.useState<{
    mode: 'create' | 'edit';
    semesterCatalogId: string;
    semesterNumber: number;
    subject?: CurriculumStructureSubject;
  } | null>(null);
  const [subjectCode, setSubjectCode] = React.useState('');
  const [subjectName, setSubjectName] = React.useState('');
  const [subjectElectiveGroupId, setSubjectElectiveGroupId] = React.useState<string>('NONE');

  // Elective Group Modal state
  const [electiveGroupModal, setElectiveGroupModal] = React.useState<{
    mode: 'create' | 'edit';
    semesterCatalogId: string;
    semesterNumber: number;
    group?: CurriculumStructureElectiveGroup;
  } | null>(null);
  const [groupName, setGroupName] = React.useState('');
  const [groupMinSelect, setGroupMinSelect] = React.useState(1);
  const [groupMaxSelect, setGroupMaxSelect] = React.useState(1);

  // Deletion targets
  const [semesterToDelete, setSemesterToDelete] = React.useState<{
    id: string;
    number: number;
  } | null>(null);
  const [subjectToDelete, setSubjectToDelete] = React.useState<CurriculumStructureSubject | null>(
    null,
  );
  const [groupToDelete, setGroupToDelete] = React.useState<CurriculumStructureElectiveGroup | null>(
    null,
  );

  // Derived statistics
  const isDraft = curriculum?.status === 'DRAFT';
  const isActive = curriculum?.status === 'ACTIVE';
  const isRetired = curriculum?.status === 'RETIRED';

  const totalSemestersConfigured = curriculum?.semesters.length ?? 0;
  const programTotalSemesters = curriculum?.program.totalSemesters ?? 0;

  const totalSubjectsCount = React.useMemo(() => {
    return curriculum?.semesters.reduce((acc, s) => acc + s.subjects.length, 0) ?? 0;
  }, [curriculum]);

  const totalElectiveGroupsCount = React.useMemo(() => {
    return curriculum?.semesters.reduce((acc, s) => acc + s.electiveGroups.length, 0) ?? 0;
  }, [curriculum]);

  // Next suggested semester number (first missing 1..programTotalSemesters)
  const nextMissingSemesterNumber = React.useMemo(() => {
    if (!curriculum) return null;
    const existing = new Set(curriculum.semesters.map((s) => s.number));
    for (let n = 1; n <= curriculum.program.totalSemesters; n++) {
      if (!existing.has(n)) return n;
    }
    return null;
  }, [curriculum]);

  // Handlers for Curriculum Lifecycle
  const handleEditLabelSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editLabel.trim()) return;

    updateCurriculumMutation.mutate(
      { id, values: { label: editLabel.trim() } },
      {
        onSuccess: () => {
          toast.add({
            title: 'Curriculum label updated',
            description: `Label changed to "${editLabel.trim()}".`,
            type: 'success',
          });
          setIsEditLabelOpen(false);
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
    setActivationViolations(null);

    activateCurriculumMutation.mutate(id, {
      onSuccess: () => {
        toast.add({
          title: 'Curriculum activated',
          description: `Curriculum version "${curriculum?.label}" is now ACTIVE and open for student admissions.`,
          type: 'success',
        });
        setIsActivateOpen(false);
      },
      onError: (err) => {
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
    retireCurriculumMutation.mutate(id, {
      onSuccess: () => {
        toast.add({
          title: 'Curriculum retired',
          description: `Curriculum "${curriculum?.label}" is now RETIRED. New student admissions are closed.`,
          type: 'success',
        });
        setIsRetireOpen(false);
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

  const handleDeleteCurriculumConfirm = () => {
    deleteCurriculumMutation.mutate(id, {
      onSuccess: () => {
        toast.add({
          title: 'Curriculum deleted',
          description: `Draft curriculum "${curriculum?.label}" was deleted permanently.`,
          type: 'success',
        });
        router.push('/app/academics/curricula');
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

  // Handlers for Semesters
  const handleAddSemester = () => {
    if (!nextMissingSemesterNumber) {
      toast.add({
        title: 'All semesters created',
        description: `This program specifies ${programTotalSemesters} semesters, and all are currently added.`,
        type: 'info',
      });
      return;
    }

    createSemesterMutation.mutate(
      { curriculumVersionId: id, number: nextMissingSemesterNumber },
      {
        onSuccess: () => {
          toast.add({
            title: 'Semester added',
            description: `Semester ${nextMissingSemesterNumber} added to curriculum.`,
            type: 'success',
          });
        },
        onError: (err) => {
          toast.add({
            title: 'Failed to add semester',
            description: err.message,
            type: 'error',
          });
        },
      },
    );
  };

  const handleDeleteSemesterConfirm = () => {
    if (!semesterToDelete) return;

    deleteSemesterMutation.mutate(semesterToDelete.id, {
      onSuccess: () => {
        toast.add({
          title: 'Semester deleted',
          description: `Semester ${semesterToDelete.number} was removed from the curriculum.`,
          type: 'success',
        });
        setSemesterToDelete(null);
      },
      onError: (err) => {
        toast.add({
          title: 'Failed to delete semester',
          description: err.message,
          type: 'error',
        });
      },
    });
  };

  // Handlers for Subjects
  const openCreateSubject = (semesterCatalogId: string, semesterNumber: number) => {
    setSubjectCode('');
    setSubjectName('');
    setSubjectElectiveGroupId('NONE');
    setSubjectModal({ mode: 'create', semesterCatalogId, semesterNumber });
  };

  const openEditSubject = (
    semesterCatalogId: string,
    semesterNumber: number,
    subj: CurriculumStructureSubject,
  ) => {
    setSubjectCode(subj.code);
    setSubjectName(subj.name);
    setSubjectElectiveGroupId(subj.electiveGroupId ?? 'NONE');
    setSubjectModal({ mode: 'edit', semesterCatalogId, semesterNumber, subject: subj });
  };

  const handleSubjectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectModal || !subjectCode.trim() || !subjectName.trim()) return;

    const isElective = subjectElectiveGroupId !== 'NONE';
    const electiveGroupId = isElective ? subjectElectiveGroupId : undefined;

    if (subjectModal.mode === 'create') {
      createSubjectMutation.mutate(
        {
          semesterCatalogId: subjectModal.semesterCatalogId,
          code: subjectCode.trim().toUpperCase(),
          name: subjectName.trim(),
          isElective,
          electiveGroupId,
        },
        {
          onSuccess: (created) => {
            toast.add({
              title: 'Subject added',
              description: `Subject "${created.name}" (${created.code}) created successfully.`,
              type: 'success',
            });
            setSubjectModal(null);
          },
          onError: (err) => {
            toast.add({
              title: 'Failed to add subject',
              description: err.message,
              type: 'error',
            });
          },
        },
      );
    } else if (subjectModal.subject) {
      updateSubjectMutation.mutate(
        {
          id: subjectModal.subject.id,
          values: {
            code: subjectCode.trim().toUpperCase(),
            name: subjectName.trim(),
            isElective,
            electiveGroupId: isElective ? subjectElectiveGroupId : null,
          },
        },
        {
          onSuccess: (updated) => {
            toast.add({
              title: 'Subject updated',
              description: `Subject "${updated.name}" (${updated.code}) updated successfully.`,
              type: 'success',
            });
            setSubjectModal(null);
          },
          onError: (err) => {
            toast.add({
              title: 'Failed to update subject',
              description: err.message,
              type: 'error',
            });
          },
        },
      );
    }
  };

  const handleDeleteSubjectConfirm = () => {
    if (!subjectToDelete) return;

    deleteSubjectMutation.mutate(subjectToDelete.id, {
      onSuccess: () => {
        toast.add({
          title: 'Subject deleted',
          description: `Subject "${subjectToDelete.name}" (${subjectToDelete.code}) was removed.`,
          type: 'success',
        });
        setSubjectToDelete(null);
      },
      onError: (err) => {
        toast.add({
          title: 'Failed to delete subject',
          description: err.message,
          type: 'error',
        });
      },
    });
  };

  // Handlers for Elective Groups
  const openCreateElectiveGroup = (semesterCatalogId: string, semesterNumber: number) => {
    setGroupName('');
    setGroupMinSelect(1);
    setGroupMaxSelect(1);
    setElectiveGroupModal({ mode: 'create', semesterCatalogId, semesterNumber });
  };

  const openEditElectiveGroup = (
    semesterCatalogId: string,
    semesterNumber: number,
    group: CurriculumStructureElectiveGroup,
  ) => {
    setGroupName(group.name);
    setGroupMinSelect(group.minSelect);
    setGroupMaxSelect(group.maxSelect);
    setElectiveGroupModal({ mode: 'edit', semesterCatalogId, semesterNumber, group });
  };

  const handleElectiveGroupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!electiveGroupModal || !groupName.trim()) return;

    if (groupMinSelect > groupMaxSelect) {
      toast.add({
        title: 'Validation error',
        description: 'Minimum selections cannot exceed maximum selections.',
        type: 'error',
      });
      return;
    }

    if (electiveGroupModal.mode === 'create') {
      createElectiveGroupMutation.mutate(
        {
          semesterCatalogId: electiveGroupModal.semesterCatalogId,
          name: groupName.trim(),
          minSelect: Number(groupMinSelect),
          maxSelect: Number(groupMaxSelect),
        },
        {
          onSuccess: (created) => {
            toast.add({
              title: 'Elective group created',
              description: `Elective group "${created.name}" created successfully.`,
              type: 'success',
            });
            setElectiveGroupModal(null);
          },
          onError: (err) => {
            toast.add({
              title: 'Failed to create elective group',
              description: err.message,
              type: 'error',
            });
          },
        },
      );
    } else if (electiveGroupModal.group) {
      updateElectiveGroupMutation.mutate(
        {
          id: electiveGroupModal.group.id,
          values: {
            name: groupName.trim(),
            minSelect: Number(groupMinSelect),
            maxSelect: Number(groupMaxSelect),
          },
        },
        {
          onSuccess: (updated) => {
            toast.add({
              title: 'Elective group updated',
              description: `Elective group "${updated.name}" updated successfully.`,
              type: 'success',
            });
            setElectiveGroupModal(null);
          },
          onError: (err) => {
            toast.add({
              title: 'Failed to update elective group',
              description: err.message,
              type: 'error',
            });
          },
        },
      );
    }
  };

  const handleDeleteElectiveGroupConfirm = () => {
    if (!groupToDelete) return;

    deleteElectiveGroupMutation.mutate(groupToDelete.id, {
      onSuccess: () => {
        toast.add({
          title: 'Elective group deleted',
          description: `Elective group "${groupToDelete.name}" was removed.`,
          type: 'success',
        });
        setGroupToDelete(null);
      },
      onError: (err) => {
        toast.add({
          title: 'Failed to delete elective group',
          description: err.message,
          type: 'error',
        });
      },
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError || !curriculum) {
    return (
      <div className="border-destructive/40 bg-destructive/5 space-y-3 rounded-lg border p-6 text-center">
        <AlertCircleIcon className="text-destructive mx-auto size-8" />
        <h3 className="text-foreground font-semibold">Failed to load curriculum structure</h3>
        <p className="text-muted-foreground text-xs">{error?.message ?? 'Record not found'}</p>
        <div className="flex justify-center gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={() => void refetch()}>
            Retry
          </Button>
          <Button variant="outline" size="sm" render={<Link href="/app/academics/curricula" />}>
            Back to Curricula
          </Button>
        </div>
      </div>
    );
  }

  // Sorted semesters
  const sortedSemesters = [...curriculum.semesters].sort((a, b) => a.number - b.number);

  return (
    <div className="space-y-6">
      {/* Top Header & Breadcrumbs */}
      <div className="flex flex-col gap-2">
        <div className="text-muted-foreground flex items-center gap-2 text-xs">
          <Link href="/app/academics" className="hover:text-foreground transition-colors">
            Academic Structure
          </Link>
          <span>/</span>
          <Link href="/app/academics/curricula" className="hover:text-foreground transition-colors">
            Curricula
          </Link>
          <span>/</span>
          <span className="text-foreground font-mono font-medium">{curriculum.label}</span>
        </div>

        <div className="flex flex-col gap-4 pt-1 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-foreground font-heading font-mono text-xl font-bold tracking-tight sm:text-2xl">
              {curriculum.label}
            </h1>
            {isDraft && (
              <Badge
                variant="outline"
                className="gap-1 border-amber-500/30 bg-amber-500/10 font-mono text-[11px] text-amber-700 uppercase dark:text-amber-400"
              >
                <ClockIcon className="size-3" />
                Draft
              </Badge>
            )}
            {isActive && (
              <Badge
                variant="outline"
                className="gap-1 border-emerald-500/30 bg-emerald-500/10 font-mono text-[11px] text-emerald-700 uppercase dark:text-emerald-400"
              >
                <CheckCircle2Icon className="size-3" />
                Active
              </Badge>
            )}
            {isRetired && (
              <Badge
                variant="outline"
                className="gap-1 border-zinc-500/30 bg-zinc-500/10 font-mono text-[11px] text-zinc-600 uppercase dark:text-zinc-400"
              >
                <ArchiveIcon className="size-3" />
                Retired
              </Badge>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              render={<Link href="/app/academics/curricula" />}
            >
              <ArrowLeftIcon className="size-3.5" />
              <span>All Curricula</span>
            </Button>

            {isDraft && (
              <PermissionGuard require="curriculumVersion:update">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 text-xs"
                  onClick={() => {
                    setEditLabel(curriculum.label);
                    setIsEditLabelOpen(true);
                  }}
                >
                  <Edit2Icon className="size-3.5" />
                  <span>Edit Label</span>
                </Button>

                <Button
                  size="sm"
                  className="h-8 gap-1.5 bg-emerald-600 text-xs text-white hover:bg-emerald-700"
                  onClick={() => {
                    setActivationViolations(null);
                    setIsActivateOpen(true);
                  }}
                >
                  <SparklesIcon className="size-3.5" />
                  <span>Activate Curriculum</span>
                </Button>
              </PermissionGuard>
            )}

            {isDraft && (
              <PermissionGuard require="curriculumVersion:delete">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive border-destructive/30 hover:bg-destructive/10 h-8 gap-1.5 text-xs"
                  onClick={() => setIsDeleteOpen(true)}
                >
                  <Trash2Icon className="size-3.5" />
                  <span>Delete Draft</span>
                </Button>
              </PermissionGuard>
            )}

            {isActive && (
              <PermissionGuard require="curriculumVersion:update">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 border-amber-500/30 text-xs text-amber-600 hover:bg-amber-500/10 dark:text-amber-400"
                  onClick={() => setIsRetireOpen(true)}
                >
                  <ArchiveIcon className="size-3.5" />
                  <span>Retire Version</span>
                </Button>
              </PermissionGuard>
            )}
          </div>
        </div>
      </div>

      {/* Metadata KPI Strip */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
        <Card className="border-border/80 shadow-2xs">
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-muted-foreground flex items-center justify-between text-[11px] font-semibold tracking-wider uppercase">
              <span>Program</span>
              <GraduationCapIcon className="text-primary size-3.5" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-foreground truncate text-sm font-semibold">
              {curriculum.program.name}
            </div>
            <span className="text-muted-foreground font-mono text-[11px]">
              {curriculum.program.code}
            </span>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-2xs">
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-muted-foreground flex items-center justify-between text-[11px] font-semibold tracking-wider uppercase">
              <span>Department</span>
              <Building2Icon className="text-primary size-3.5" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-foreground truncate text-sm font-semibold">
              {curriculum.department.name}
            </div>
            <span className="text-muted-foreground font-mono text-[11px]">
              {curriculum.department.code}
            </span>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-2xs">
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-muted-foreground flex items-center justify-between text-[11px] font-semibold tracking-wider uppercase">
              <span>Terms &amp; Semesters</span>
              <LayersIcon className="text-primary size-3.5" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-foreground flex items-center gap-1.5 text-sm font-bold">
              <span>{totalSemestersConfigured}</span>
              <span className="text-muted-foreground text-xs font-normal">
                / {programTotalSemesters} required
              </span>
            </div>
            <span className="text-muted-foreground text-[11px]">
              {curriculum.program.durationYears} Years Duration
            </span>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-2xs">
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-muted-foreground flex items-center justify-between text-[11px] font-semibold tracking-wider uppercase">
              <span>Curriculum Scope</span>
              <BookOpenIcon className="text-primary size-3.5" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-foreground text-sm font-bold">{totalSubjectsCount} Subjects</div>
            <span className="text-muted-foreground font-mono text-[11px]">
              {totalElectiveGroupsCount} Elective Groups
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Lifecycle Status Banner */}
      {isDraft && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
          <ClockIcon className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="flex-1 space-y-1 text-xs">
            <p className="text-foreground font-semibold">
              Draft Mode &mdash; Syllabus Workspace Open
            </p>
            <p className="text-muted-foreground leading-relaxed">
              This curriculum version is currently under construction. You can configure semesters,
              core subjects, and elective groups. When all {programTotalSemesters} semesters are
              defined with subjects, click <strong>Activate Curriculum</strong> to run institutional
              readiness validation and make this curriculum available for admissions.
            </p>
          </div>
        </div>
      )}

      {isActive && (
        <div className="flex items-start gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
          <ShieldCheckIcon className="mt-0.5 size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <div className="flex-1 space-y-1 text-xs">
            <p className="text-foreground font-semibold">
              Active Curriculum &mdash; Structure Frozen
            </p>
            <p className="text-muted-foreground leading-relaxed">
              This curriculum is active and eligible for student admissions intake. Its academic
              structure (semesters, subjects, and elective groups) is frozen to preserve course
              enrollment and assessment integrity. To adopt a revised syllabus for future academic
              sessions, create a new draft curriculum version.
            </p>
          </div>
        </div>
      )}

      {isRetired && (
        <div className="flex items-start gap-3 rounded-lg border border-zinc-500/30 bg-zinc-500/5 p-4">
          <ArchiveIcon className="mt-0.5 size-5 shrink-0 text-zinc-500" />
          <div className="flex-1 space-y-1 text-xs">
            <p className="text-foreground font-semibold">
              Retired Curriculum &mdash; Historical Record
            </p>
            <p className="text-muted-foreground leading-relaxed">
              This curriculum is retired and closed to new admissions. Historical student
              enrollments, exam records, and course completion transcripts referencing this version
              remain fully preserved.
            </p>
          </div>
        </div>
      )}

      {/* Structure Workspace */}
      <div className="space-y-4">
        <div className="border-border/60 flex flex-col gap-3 border-b pb-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-foreground flex items-center gap-2 text-base font-semibold">
              <LayersIcon className="text-primary size-4" />
              <span>Semester Structure &amp; Syllabus</span>
            </h2>
            <p className="text-muted-foreground text-xs">
              Core subjects and elective choices defined for each institutional term.
            </p>
          </div>

          {isDraft && (
            <PermissionGuard require="semesterCatalog:create">
              <Button
                size="sm"
                className="h-8 gap-1.5 text-xs"
                onClick={handleAddSemester}
                disabled={
                  createSemesterMutation.isPending ||
                  totalSemestersConfigured >= programTotalSemesters
                }
              >
                {createSemesterMutation.isPending ? (
                  <Loader2Icon className="mr-1 size-3.5 animate-spin" />
                ) : (
                  <PlusIcon className="mr-1 size-3.5" />
                )}
                <span>
                  {nextMissingSemesterNumber
                    ? `Add Semester ${nextMissingSemesterNumber}`
                    : 'All Semesters Added'}
                </span>
              </Button>
            </PermissionGuard>
          )}
        </div>

        {sortedSemesters.length === 0 ? (
          <Card className="border-border/70 space-y-3 border-2 border-dashed p-8 text-center">
            <LayersIcon className="text-muted-foreground/60 mx-auto size-10" />
            <h3 className="text-foreground text-sm font-semibold">No semesters added yet</h3>
            <p className="text-muted-foreground mx-auto max-w-md text-xs">
              This curriculum version needs {programTotalSemesters} semesters defined. Start by
              adding Semester 1 to begin configuring subjects.
            </p>
            {isDraft && (
              <PermissionGuard require="semesterCatalog:create">
                <Button
                  size="sm"
                  onClick={handleAddSemester}
                  disabled={createSemesterMutation.isPending}
                >
                  <PlusIcon className="mr-1.5 size-3.5" />
                  <span>Add Semester 1</span>
                </Button>
              </PermissionGuard>
            )}
          </Card>
        ) : (
          <div className="space-y-6">
            {sortedSemesters.map((sem) => {
              const coreSubjects = sem.subjects.filter(
                (s) => !s.isElective || s.electiveGroupId === null,
              );
              const electiveGroups = sem.electiveGroups;

              return (
                <Card key={sem.id} className="border-border/80 overflow-hidden shadow-xs">
                  {/* Semester Card Header */}
                  <CardHeader className="bg-muted/30 border-border/50 flex flex-row items-center justify-between border-b px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-foreground font-heading text-sm font-bold">
                          Semester {sem.number}
                        </span>
                        <Badge variant="secondary" className="font-mono text-[10px]">
                          {sem.subjects.length} Subjects
                        </Badge>
                        {electiveGroups.length > 0 && (
                          <Badge variant="outline" className="font-mono text-[10px]">
                            {electiveGroups.length} Elective{' '}
                            {electiveGroups.length === 1 ? 'Group' : 'Groups'}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {isDraft && (
                      <div className="flex items-center gap-1.5">
                        <PermissionGuard require="subject:create">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 gap-1 text-xs"
                            onClick={() => openCreateSubject(sem.id, sem.number)}
                          >
                            <PlusIcon className="size-3" />
                            <span>Add Subject</span>
                          </Button>
                        </PermissionGuard>

                        <PermissionGuard require="electiveGroup:create">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 gap-1 text-xs"
                            onClick={() => openCreateElectiveGroup(sem.id, sem.number)}
                          >
                            <FolderPlusIcon className="size-3" />
                            <span>Add Elective Group</span>
                          </Button>
                        </PermissionGuard>

                        <PermissionGuard require="semesterCatalog:delete">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="text-destructive hover:bg-destructive/10 size-7"
                            onClick={() => setSemesterToDelete({ id: sem.id, number: sem.number })}
                          >
                            <Trash2Icon className="size-3.5" />
                            <span className="sr-only">Delete Semester</span>
                          </Button>
                        </PermissionGuard>
                      </div>
                    )}
                  </CardHeader>

                  <CardContent className="space-y-4 p-4">
                    {/* Core Subjects Section */}
                    <div className="space-y-2">
                      <div className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                        Core Subjects ({coreSubjects.length})
                      </div>

                      {coreSubjects.length === 0 ? (
                        <p className="text-muted-foreground py-2 text-xs italic">
                          No core subjects defined for this semester.
                        </p>
                      ) : (
                        <div className="divide-border/40 border-border/50 divide-y overflow-hidden rounded-md border text-xs">
                          {coreSubjects.map((sub) => (
                            <div
                              key={sub.id}
                              className="hover:bg-muted/20 flex items-center justify-between p-2.5 px-3 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <span className="text-primary w-20 font-mono font-semibold">
                                  {sub.code}
                                </span>
                                <span className="text-foreground font-medium">{sub.name}</span>
                              </div>

                              {isDraft && (
                                <div className="flex items-center gap-1">
                                  <PermissionGuard require="subject:update">
                                    <Button
                                      variant="ghost"
                                      size="icon-sm"
                                      className="size-7"
                                      onClick={() => openEditSubject(sem.id, sem.number, sub)}
                                    >
                                      <Edit2Icon className="size-3.5" />
                                      <span className="sr-only">Edit Subject</span>
                                    </Button>
                                  </PermissionGuard>

                                  <PermissionGuard require="subject:delete">
                                    <Button
                                      variant="ghost"
                                      size="icon-sm"
                                      className="text-destructive hover:bg-destructive/10 size-7"
                                      onClick={() => setSubjectToDelete(sub)}
                                    >
                                      <Trash2Icon className="size-3.5" />
                                      <span className="sr-only">Delete Subject</span>
                                    </Button>
                                  </PermissionGuard>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Elective Groups Section */}
                    {electiveGroups.length > 0 && (
                      <div className="space-y-3 pt-2">
                        <div className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                          Elective Groups ({electiveGroups.length})
                        </div>

                        <div className="space-y-3">
                          {electiveGroups.map((group) => {
                            const groupSubjects = sem.subjects.filter(
                              (s) => s.electiveGroupId === group.id,
                            );

                            return (
                              <div
                                key={group.id}
                                className="border-border/60 bg-muted/15 space-y-2.5 rounded-md border p-3"
                              >
                                <div className="border-border/40 flex flex-row items-center justify-between gap-2 border-b pb-2">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-foreground text-xs font-semibold">
                                      {group.name}
                                    </span>
                                    <Badge
                                      variant="outline"
                                      className="border-primary/30 text-primary bg-primary/5 font-mono text-[10px]"
                                    >
                                      Select{' '}
                                      {group.minSelect === group.maxSelect
                                        ? group.minSelect
                                        : `${group.minSelect}-${group.maxSelect}`}{' '}
                                      of {groupSubjects.length}
                                    </Badge>
                                  </div>

                                  {isDraft && (
                                    <div className="flex items-center gap-1">
                                      <PermissionGuard require="subject:create">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 gap-1 px-2 text-[11px]"
                                          onClick={() => {
                                            setSubjectCode('');
                                            setSubjectName('');
                                            setSubjectElectiveGroupId(group.id);
                                            setSubjectModal({
                                              mode: 'create',
                                              semesterCatalogId: sem.id,
                                              semesterNumber: sem.number,
                                            });
                                          }}
                                        >
                                          <PlusIcon className="size-3" />
                                          <span>Add Elective</span>
                                        </Button>
                                      </PermissionGuard>

                                      <PermissionGuard require="electiveGroup:update">
                                        <Button
                                          variant="ghost"
                                          size="icon-sm"
                                          className="size-6"
                                          onClick={() =>
                                            openEditElectiveGroup(sem.id, sem.number, group)
                                          }
                                        >
                                          <Edit2Icon className="size-3" />
                                          <span className="sr-only">Edit Group</span>
                                        </Button>
                                      </PermissionGuard>

                                      <PermissionGuard require="electiveGroup:delete">
                                        <Button
                                          variant="ghost"
                                          size="icon-sm"
                                          className="text-destructive hover:bg-destructive/10 size-6"
                                          onClick={() => setGroupToDelete(group)}
                                        >
                                          <Trash2Icon className="size-3" />
                                          <span className="sr-only">Delete Group</span>
                                        </Button>
                                      </PermissionGuard>
                                    </div>
                                  )}
                                </div>

                                {groupSubjects.length === 0 ? (
                                  <p className="text-muted-foreground py-1 text-[11px] italic">
                                    No elective courses mapped to this group yet.
                                  </p>
                                ) : (
                                  <div className="divide-border/30 border-border/40 bg-background divide-y overflow-hidden rounded border text-xs">
                                    {groupSubjects.map((sub) => (
                                      <div
                                        key={sub.id}
                                        className="hover:bg-muted/15 flex items-center justify-between p-2 px-3"
                                      >
                                        <div className="flex items-center gap-2.5">
                                          <span className="text-foreground w-20 font-mono font-medium">
                                            {sub.code}
                                          </span>
                                          <span className="text-foreground">{sub.name}</span>
                                        </div>

                                        {isDraft && (
                                          <div className="flex items-center gap-1">
                                            <PermissionGuard require="subject:update">
                                              <Button
                                                variant="ghost"
                                                size="icon-sm"
                                                className="size-6"
                                                onClick={() =>
                                                  openEditSubject(sem.id, sem.number, sub)
                                                }
                                              >
                                                <Edit2Icon className="size-3" />
                                                <span className="sr-only">Edit Subject</span>
                                              </Button>
                                            </PermissionGuard>

                                            <PermissionGuard require="subject:delete">
                                              <Button
                                                variant="ghost"
                                                size="icon-sm"
                                                className="text-destructive hover:bg-destructive/10 size-6"
                                                onClick={() => setSubjectToDelete(sub)}
                                              >
                                                <Trash2Icon className="size-3" />
                                                <span className="sr-only">Delete Subject</span>
                                              </Button>
                                            </PermissionGuard>
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit Curriculum Label Dialog */}
      <Dialog open={isEditLabelOpen} onOpenChange={setIsEditLabelOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Curriculum Label</DialogTitle>
            <DialogDescription>
              Update the administrative label for this curriculum version.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditLabelSubmit} className="space-y-4 pt-2">
            <FieldGroup>
              <Field>
                <FieldLabel>Curriculum Label</FieldLabel>
                <Input
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                  placeholder="e.g. R22-CSE"
                  className="font-mono text-xs"
                  required
                />
              </Field>
            </FieldGroup>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditLabelOpen(false)}
                disabled={updateCurriculumMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateCurriculumMutation.isPending || !editLabel.trim()}
              >
                {updateCurriculumMutation.isPending && (
                  <Loader2Icon className="mr-1.5 size-4 animate-spin" />
                )}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Activate Curriculum Dialog */}
      <AlertDialog
        open={isActivateOpen}
        onOpenChange={(open) => {
          setIsActivateOpen(open);
          if (!open) setActivationViolations(null);
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
                Activating <strong>{curriculum.label}</strong> will lock its semester structure
                permanently and enable it for student intake.
              </div>

              {activationViolations && activationViolations.length > 0 && (
                <div className="border-destructive/40 bg-destructive/10 space-y-2 rounded-md border p-3">
                  <div className="text-destructive flex items-center gap-2 text-xs font-semibold">
                    <AlertTriangleIcon className="size-4" />
                    <span>
                      Readiness Validation Failed ({activationViolations.length}{' '}
                      {activationViolations.length === 1 ? 'Violation' : 'Violations'})
                    </span>
                  </div>
                  <ul className="text-destructive list-disc space-y-1 pl-4 text-xs">
                    {activationViolations.map((v, i) => (
                      <li key={i}>{v}</li>
                    ))}
                  </ul>
                  <div className="text-muted-foreground pt-1 text-[11px]">
                    Please correct these structural violations in the syllabus workspace before
                    attempting activation again.
                  </div>
                </div>
              )}

              {!activationViolations && (
                <div className="bg-muted/50 text-muted-foreground space-y-1.5 rounded-md p-3 text-xs">
                  <div className="text-foreground font-semibold">Backend Readiness Checklist:</div>
                  <div>
                    &bull; Must contain exactly {curriculum.program.totalSemesters} semesters
                    (Currently: {totalSemestersConfigured})
                  </div>
                  <div>
                    &bull; Semesters must be numbered sequentially from 1 to{' '}
                    {curriculum.program.totalSemesters}
                  </div>
                  <div>&bull; Every semester must contain at least one subject</div>
                  <div>
                    &bull; Elective groups must satisfy minSelect &le; maxSelect and contain
                    matching semester subjects
                  </div>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={activateCurriculumMutation.isPending}>
              {activationViolations ? 'Close' : 'Cancel'}
            </AlertDialogCancel>
            {!activationViolations && (
              <AlertDialogAction
                onClick={handleActivateConfirm}
                disabled={activateCurriculumMutation.isPending}
                className="bg-emerald-600 text-white hover:bg-emerald-700"
              >
                {activateCurriculumMutation.isPending && (
                  <Loader2Icon className="mr-1.5 size-4 animate-spin" />
                )}
                Validate &amp; Activate
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Retire Curriculum Dialog */}
      <AlertDialog open={isRetireOpen} onOpenChange={setIsRetireOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangleIcon className="size-5" />
              <span>Retire Curriculum Version</span>
            </AlertDialogTitle>
            <AlertDialogDescription render={<div />} className="space-y-2 pt-2">
              <div>
                Are you sure you want to retire <strong>{curriculum.label}</strong>?
              </div>
              <div className="text-muted-foreground text-xs">
                Once retired, this curriculum will be permanently closed to new admissions. Existing
                enrolled students and past term records will remain intact. This action cannot be
                reversed.
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={retireCurriculumMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRetireConfirm}
              disabled={retireCurriculumMutation.isPending}
              className="bg-amber-600 text-white hover:bg-amber-700"
            >
              {retireCurriculumMutation.isPending && (
                <Loader2Icon className="mr-1.5 size-4 animate-spin" />
              )}
              Retire Curriculum
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Curriculum Dialog */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive flex items-center gap-2">
              <Trash2Icon className="size-5" />
              <span>Delete Draft Curriculum</span>
            </AlertDialogTitle>
            <AlertDialogDescription render={<div />} className="space-y-2 pt-2">
              <div>
                Are you sure you want to permanently delete draft curriculum{' '}
                <strong>{curriculum.label}</strong>?
              </div>
              <div className="text-muted-foreground text-xs">
                This will delete the version and any uncommitted draft semesters and subjects.
                Active or historical versions cannot be deleted.
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteCurriculumMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCurriculumConfirm}
              disabled={deleteCurriculumMutation.isPending}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {deleteCurriculumMutation.isPending && (
                <Loader2Icon className="mr-1.5 size-4 animate-spin" />
              )}
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Semester Dialog */}
      <AlertDialog
        open={Boolean(semesterToDelete)}
        onOpenChange={(open) => !open && setSemesterToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive flex items-center gap-2">
              <Trash2Icon className="size-5" />
              <span>Delete Semester {semesterToDelete?.number}</span>
            </AlertDialogTitle>
            <AlertDialogDescription render={<div />} className="space-y-2 pt-2">
              <div>
                Are you sure you want to remove Semester {semesterToDelete?.number} from this draft
                curriculum?
              </div>
              <div className="text-muted-foreground text-xs">
                All subjects and elective groups inside this semester must be removed or will be
                deleted.
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteSemesterMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSemesterConfirm}
              disabled={deleteSemesterMutation.isPending}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {deleteSemesterMutation.isPending && (
                <Loader2Icon className="mr-1.5 size-4 animate-spin" />
              )}
              Delete Semester
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create / Edit Subject Dialog */}
      <Dialog open={Boolean(subjectModal)} onOpenChange={(open) => !open && setSubjectModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {subjectModal?.mode === 'create'
                ? `Add Subject to Semester ${subjectModal?.semesterNumber}`
                : `Edit Subject (${subjectModal?.subject?.code})`}
            </DialogTitle>
            <DialogDescription>
              Define the institutional subject code, title, and syllabus assignment.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubjectSubmit} className="space-y-4 pt-2">
            <FieldGroup className="space-y-3">
              <Field>
                <FieldLabel>Subject Code *</FieldLabel>
                <Input
                  value={subjectCode}
                  onChange={(e) => setSubjectCode(e.target.value.toUpperCase())}
                  placeholder="e.g. CS301, HU201, ME402"
                  className="h-9 font-mono text-xs uppercase"
                  maxLength={20}
                  required
                />
                <FieldDescription className="text-[11px]">
                  Unique course code within this semester (up to 20 uppercase characters).
                </FieldDescription>
              </Field>

              <Field>
                <FieldLabel>Subject Name / Title *</FieldLabel>
                <Input
                  value={subjectName}
                  onChange={(e) => setSubjectName(e.target.value)}
                  placeholder="e.g. Data Structures & Algorithms"
                  className="h-9 text-xs"
                  maxLength={150}
                  required
                />
              </Field>

              <Field>
                <FieldLabel>Subject Classification</FieldLabel>
                <Select
                  value={subjectElectiveGroupId}
                  onValueChange={(val) => {
                    if (val) setSubjectElectiveGroupId(val);
                  }}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Select classification" />
                  </SelectTrigger>
                  <SelectContent className="text-xs">
                    <SelectItem value="NONE">Core Compulsory Subject</SelectItem>
                    {curriculum.semesters
                      .find((s) => s.id === subjectModal?.semesterCatalogId)
                      ?.electiveGroups.map((grp) => (
                        <SelectItem key={grp.id} value={grp.id}>
                          Elective: {grp.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <FieldDescription className="text-[11px]">
                  Attach to an elective group or leave as Core Compulsory.
                </FieldDescription>
              </Field>
            </FieldGroup>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setSubjectModal(null)}
                disabled={createSubjectMutation.isPending || updateSubjectMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  createSubjectMutation.isPending ||
                  updateSubjectMutation.isPending ||
                  !subjectCode.trim() ||
                  !subjectName.trim()
                }
              >
                {(createSubjectMutation.isPending || updateSubjectMutation.isPending) && (
                  <Loader2Icon className="mr-1.5 size-4 animate-spin" />
                )}
                {subjectModal?.mode === 'create' ? 'Add Subject' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Subject Dialog */}
      <AlertDialog
        open={Boolean(subjectToDelete)}
        onOpenChange={(open) => !open && setSubjectToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive flex items-center gap-2">
              <Trash2Icon className="size-5" />
              <span>Delete Subject</span>
            </AlertDialogTitle>
            <AlertDialogDescription render={<div />} className="space-y-2 pt-2">
              <div>
                Are you sure you want to remove subject <strong>{subjectToDelete?.name}</strong> (
                {subjectToDelete?.code})?
              </div>
              <div className="text-muted-foreground text-xs">
                This subject will be permanently removed from this draft semester.
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteSubjectMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSubjectConfirm}
              disabled={deleteSubjectMutation.isPending}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {deleteSubjectMutation.isPending && (
                <Loader2Icon className="mr-1.5 size-4 animate-spin" />
              )}
              Delete Subject
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create / Edit Elective Group Dialog */}
      <Dialog
        open={Boolean(electiveGroupModal)}
        onOpenChange={(open) => !open && setElectiveGroupModal(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {electiveGroupModal?.mode === 'create'
                ? `Add Elective Group to Semester ${electiveGroupModal?.semesterNumber}`
                : `Edit Elective Group`}
            </DialogTitle>
            <DialogDescription>
              Define a basket of elective choices and student selection constraints.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleElectiveGroupSubmit} className="space-y-4 pt-2">
            <FieldGroup className="space-y-3">
              <Field>
                <FieldLabel>Group Name *</FieldLabel>
                <Input
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="e.g. Professional Elective I, Open Elective A"
                  className="h-9 text-xs"
                  maxLength={150}
                  required
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field>
                  <FieldLabel>Min Selection *</FieldLabel>
                  <Input
                    type="number"
                    min={1}
                    value={groupMinSelect}
                    onChange={(e) => setGroupMinSelect(Math.max(1, parseInt(e.target.value) || 1))}
                    className="h-9 text-xs"
                    required
                  />
                  <FieldDescription className="text-[10px]">
                    Minimum courses student must select.
                  </FieldDescription>
                </Field>

                <Field>
                  <FieldLabel>Max Selection *</FieldLabel>
                  <Input
                    type="number"
                    min={1}
                    value={groupMaxSelect}
                    onChange={(e) => setGroupMaxSelect(Math.max(1, parseInt(e.target.value) || 1))}
                    className="h-9 text-xs"
                    required
                  />
                  <FieldDescription className="text-[10px]">
                    Maximum courses student may choose.
                  </FieldDescription>
                </Field>
              </div>
            </FieldGroup>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setElectiveGroupModal(null)}
                disabled={
                  createElectiveGroupMutation.isPending || updateElectiveGroupMutation.isPending
                }
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  createElectiveGroupMutation.isPending ||
                  updateElectiveGroupMutation.isPending ||
                  !groupName.trim()
                }
              >
                {(createElectiveGroupMutation.isPending ||
                  updateElectiveGroupMutation.isPending) && (
                  <Loader2Icon className="mr-1.5 size-4 animate-spin" />
                )}
                {electiveGroupModal?.mode === 'create' ? 'Create Elective Group' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Elective Group Dialog */}
      <AlertDialog
        open={Boolean(groupToDelete)}
        onOpenChange={(open) => !open && setGroupToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive flex items-center gap-2">
              <Trash2Icon className="size-5" />
              <span>Delete Elective Group</span>
            </AlertDialogTitle>
            <AlertDialogDescription render={<div />} className="space-y-2 pt-2">
              <div>
                Are you sure you want to remove elective group{' '}
                <strong>{groupToDelete?.name}</strong>?
              </div>
              <div className="text-muted-foreground text-xs">
                Any elective subjects assigned to this group will either need to be deleted or
                reassigned.
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteElectiveGroupMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteElectiveGroupConfirm}
              disabled={deleteElectiveGroupMutation.isPending}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {deleteElectiveGroupMutation.isPending && (
                <Loader2Icon className="mr-1.5 size-4 animate-spin" />
              )}
              Delete Group
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
