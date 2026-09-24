'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  ArrowLeftIcon,
  Building2Icon,
  CheckIcon,
  GraduationCapIcon,
  InfoIcon,
  Loader2Icon,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { useForm } from 'react-hook-form';

import { useCreateCurriculum } from '../hooks/use-curriculum-mutations';
import { useDepartments } from '../hooks/use-departments';
import { usePrograms } from '../hooks/use-programs';
import {
  type CreateCurriculumVersionFormValues,
  createCurriculumVersionSchema,
} from '../schemas/academic.schema';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/components/ui/toast';

export function CurriculumForm() {
  const router = useRouter();
  const [selectedDeptId, setSelectedDeptId] = React.useState<string>('');

  const { data: deptData, isLoading: deptsLoading } = useDepartments({ limit: 100 });
  const { data: progData, isLoading: progsLoading } = usePrograms(
    selectedDeptId ? { departmentId: selectedDeptId, limit: 100 } : { limit: 100 },
  );

  const form = useForm<CreateCurriculumVersionFormValues>({
    resolver: zodResolver(createCurriculumVersionSchema),
    defaultValues: {
      programId: '',
      label: '',
    },
  });

  const createMutation = useCreateCurriculum();

  const selectedProgramId = form.watch('programId');
  const selectedProgram = React.useMemo(() => {
    return progData?.items.find((p) => p.id === selectedProgramId);
  }, [progData, selectedProgramId]);

  const onSubmit = (values: CreateCurriculumVersionFormValues) => {
    createMutation.mutate(values, {
      onSuccess: (created) => {
        toast.add({
          title: 'Curriculum version created',
          description: `Draft curriculum "${created.label}" initialized successfully. Navigating to structure workspace...`,
          type: 'success',
        });
        router.push(`/app/academics/curricula/${created.id}`);
      },
      onError: (err) => {
        toast.add({
          title: 'Creation failed',
          description: err.message,
          type: 'error',
        });
      },
    });
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1 text-xs"
          render={<Link href="/app/academics/curricula" />}
        >
          <ArrowLeftIcon className="size-3.5" />
          <span>Back to Curricula</span>
        </Button>
      </div>

      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <GraduationCapIcon className="text-primary size-4" />
            <span>Create Draft Curriculum Version</span>
          </CardTitle>
          <CardDescription className="text-xs">
            Register a new curriculum edition for a degree program. Curricula start in Draft mode
            and can be activated once all semesters and subjects are defined.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              void form.handleSubmit(onSubmit)(e);
            }}
            className="space-y-5"
          >
            <FieldGroup className="space-y-4">
              {/* Department selection */}
              <Field>
                <FieldLabel>Academic Department</FieldLabel>
                <Select
                  value={selectedDeptId}
                  onValueChange={(val) => {
                    setSelectedDeptId(val ?? '');
                    form.setValue('programId', '');
                  }}
                  disabled={deptsLoading}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <Building2Icon className="text-muted-foreground mr-1.5 size-3.5" />
                    <SelectValue
                      placeholder={deptsLoading ? 'Loading departments...' : 'Filter by Department'}
                    />
                  </SelectTrigger>
                  <SelectContent className="max-h-60 text-xs">
                    {deptData?.items.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name} ({dept.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldDescription className="text-[11px]">
                  Select the department to filter available degree programs.
                </FieldDescription>
              </Field>

              {/* Program selection */}
              <Field>
                <FieldLabel>Target Degree Program *</FieldLabel>
                <Select
                  value={selectedProgramId}
                  onValueChange={(val) => {
                    if (val) form.setValue('programId', val, { shouldValidate: true });
                  }}
                  disabled={progsLoading}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <GraduationCapIcon className="text-muted-foreground mr-1.5 size-3.5" />
                    <SelectValue
                      placeholder={
                        progsLoading ? 'Loading degree programs...' : 'Select Degree Program'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent className="max-h-60 text-xs">
                    {progData?.items.map((prog) => (
                      <SelectItem key={prog.id} value={prog.id}>
                        {prog.name} ({prog.code}) &bull; {prog.durationYears}y (
                        {prog.totalSemesters} Sem)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.programId && (
                  <FieldError className="text-xs">
                    {form.formState.errors.programId.message}
                  </FieldError>
                )}
                {selectedProgram && (
                  <div className="bg-muted/40 text-muted-foreground border-border/50 mt-1.5 space-y-1 rounded-md border p-2.5 text-xs">
                    <p className="text-foreground font-medium">
                      Program Requirements: {selectedProgram.totalSemesters} Semesters (
                      {selectedProgram.durationYears} Years)
                    </p>
                    <p className="text-[11px]">
                      The draft version will require {selectedProgram.totalSemesters} configured
                      semesters before it can be activated.
                    </p>
                  </div>
                )}
              </Field>

              {/* Label */}
              <Field>
                <FieldLabel>Curriculum Version Label *</FieldLabel>
                <Input
                  {...form.register('label')}
                  placeholder="e.g. R22-CSE, NEP-2024-ME, CBCS-2025"
                  className="h-9 font-mono text-xs"
                />
                <FieldDescription className="text-[11px]">
                  Unique human-readable nomenclature (e.g., Regulation year + Degree acronym).
                </FieldDescription>
                {form.formState.errors.label && (
                  <FieldError className="text-xs">{form.formState.errors.label.message}</FieldError>
                )}
              </Field>
            </FieldGroup>

            <div className="bg-primary/5 border-primary/20 flex items-start gap-2.5 rounded-md border p-3">
              <InfoIcon className="text-primary mt-0.5 size-4 shrink-0" />
              <div className="text-foreground/80 space-y-1 text-xs">
                <p className="text-foreground font-medium">Lifecycle Integrity Notice</p>
                <p className="text-[11px] leading-relaxed">
                  Upon creation, this curriculum is in <strong>DRAFT</strong> mode. You will be able
                  to construct semesters, core subjects, and elective groups in the structure
                  editor. Once activated, the structure is permanently frozen to preserve historical
                  student transcripts.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                render={<Link href="/app/academics/curricula" />}
                disabled={createMutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={createMutation.isPending}>
                {createMutation.isPending ? (
                  <>
                    <Loader2Icon className="mr-1.5 size-3.5 animate-spin" />
                    Initializing Draft...
                  </>
                ) : (
                  <>
                    <CheckIcon className="mr-1.5 size-3.5" />
                    Create Draft Curriculum
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
