'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  ArrowLeftIcon,
  BookOpenIcon,
  CalendarIcon,
  GraduationCapIcon,
  Loader2Icon,
  SaveIcon,
  UserIcon,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { useForm } from 'react-hook-form';

import { useCreateAdmission } from '../hooks/use-create-admission';
import {
  ADMISSION_QUOTAS,
  ADMISSION_TYPES,
  type CreateAdmissionFormValues,
  createAdmissionSchema,
} from '../schemas/admission.schema';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/components/ui/toast';
import { useCurricula } from '@/features/academics/hooks/use-curricula';
import { useDepartments } from '@/features/academics/hooks/use-departments';
import { usePrograms } from '@/features/academics/hooks/use-programs';
import { useSemesterCatalogs } from '@/features/academics/hooks/use-semester-catalogs';
import { useUsers } from '@/features/users/hooks/use-users';

interface AdmissionFormProps {
  initialUserId?: string;
}

export function AdmissionForm({ initialUserId }: AdmissionFormProps) {
  const router = useRouter();
  const createMutation = useCreateAdmission();

  const [selectedDeptId, setSelectedDeptId] = React.useState<string>('');

  const { data: usersData, isLoading: usersLoading } = useUsers({ limit: 100 });
  const { data: deptData, isLoading: deptsLoading } = useDepartments({ limit: 100 });

  const form = useForm<CreateAdmissionFormValues>({
    resolver: zodResolver(createAdmissionSchema),
    defaultValues: {
      userId: initialUserId ?? '',
      admissionNumber: '',
      admissionDate: new Date().toISOString().split('T')[0],
      admissionType: 'NORMAL',
      quota: 'GOVERNMENT_QUOTA',
      initialProgramId: '',
      initialCurriculumId: '',
      entrySemesterCatalogId: '',
    },
  });

  const selectedProgramId = form.watch('initialProgramId');
  const selectedCurriculumId = form.watch('initialCurriculumId');

  const { data: programData, isLoading: progsLoading } = usePrograms({
    departmentId: selectedDeptId || undefined,
    limit: 100,
  });

  const { data: curriculaData, isLoading: curriculaLoading } = useCurricula(
    { programId: selectedProgramId || undefined, status: 'ACTIVE', limit: 100 },
    Boolean(selectedProgramId),
  );

  const { data: semestersData, isLoading: semestersLoading } = useSemesterCatalogs(
    { curriculumVersionId: selectedCurriculumId || undefined, limit: 100 },
    Boolean(selectedCurriculumId),
  );

  const isPending = createMutation.isPending;
  const serverError = createMutation.error?.message;

  const onSubmit = (values: CreateAdmissionFormValues) => {
    createMutation.mutate(values, {
      onSuccess: (created) => {
        toast.add({
          title: 'Admission confirmed',
          description: `Recorded admission ${created.admissionNumber} successfully.`,
          type: 'success',
        });
        router.push(`/app/admissions/${created.id}`);
      },
    });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1 text-xs"
          render={<Link href="/app/admissions" />}
        >
          <ArrowLeftIcon className="size-3.5" />
          <span>Back to Admissions</span>
        </Button>
      </div>

      <Card className="border-border/80 shadow-sm">
        <CardHeader className="border-border/40 border-b pb-4">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <GraduationCapIcon className="text-primary size-4" />
            <span>Process Student Admission</span>
          </CardTitle>
          <CardDescription className="text-xs">
            Formally enroll an admitted candidate into an accredited degree program, curriculum
            version, and entry semester.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          {serverError && (
            <Alert variant="destructive" className="mb-6 text-xs">
              <AlertTitle className="text-xs font-semibold">Admission Failed</AlertTitle>
              <AlertDescription className="text-xs">{serverError}</AlertDescription>
            </Alert>
          )}

          <form
            noValidate
            onSubmit={(e) => void form.handleSubmit(onSubmit)(e)}
            className="space-y-6"
          >
            {/* FastTab 1: Candidate Account */}
            <div className="space-y-3">
              <h3 className="text-muted-foreground flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase">
                <UserIcon className="text-primary size-3.5" />
                <span>Candidate Identification</span>
              </h3>
              <Field data-invalid={Boolean(form.formState.errors.userId)}>
                <FieldLabel htmlFor="userId" className="text-xs font-medium">
                  Candidate Account <span className="text-destructive">*</span>
                </FieldLabel>
                <Select
                  value={form.watch('userId')}
                  onValueChange={(val) => {
                    if (val) form.setValue('userId', val, { shouldValidate: true });
                  }}
                  disabled={Boolean(initialUserId) || isPending}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue
                      placeholder={
                        usersLoading ? 'Loading candidate accounts...' : 'Select enrolled user...'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {usersData?.items?.map((user) => (
                      <SelectItem key={user.id} value={user.id} className="text-xs">
                        {user.fullName} &bull; {user.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError errors={[form.formState.errors.userId]} />
              </Field>
            </div>

            {/* FastTab 2: Academic Program & Curriculum Cascade */}
            <div className="border-border/40 space-y-4 border-t pt-4">
              <h3 className="text-muted-foreground flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase">
                <BookOpenIcon className="text-primary size-3.5" />
                <span>Academic Program & Curriculum Cascade</span>
              </h3>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel className="text-xs font-medium">1. Academic Department</FieldLabel>
                  <Select
                    value={selectedDeptId}
                    onValueChange={(val) => {
                      setSelectedDeptId(val ?? '');
                      form.setValue('initialProgramId', '');
                      form.setValue('initialCurriculumId', '');
                      form.setValue('entrySemesterCatalogId', '');
                    }}
                    disabled={isPending || deptsLoading}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue
                        placeholder={
                          deptsLoading ? 'Loading departments...' : 'Select department...'
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {deptData?.items?.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id} className="text-xs">
                          {dept.name} ({dept.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field data-invalid={Boolean(form.formState.errors.initialProgramId)}>
                  <FieldLabel htmlFor="initialProgramId" className="text-xs font-medium">
                    2. Degree Program <span className="text-destructive">*</span>
                  </FieldLabel>
                  <Select
                    value={form.watch('initialProgramId')}
                    onValueChange={(val) => {
                      if (val) {
                        form.setValue('initialProgramId', val, { shouldValidate: true });
                        form.setValue('initialCurriculumId', '');
                        form.setValue('entrySemesterCatalogId', '');
                      }
                    }}
                    disabled={isPending || !selectedDeptId || progsLoading}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue
                        placeholder={
                          !selectedDeptId ? 'Select department first' : 'Select degree program...'
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {programData?.items?.map((prog) => (
                        <SelectItem key={prog.id} value={prog.id} className="text-xs">
                          {prog.name} ({prog.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldError errors={[form.formState.errors.initialProgramId]} />
                </Field>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field data-invalid={Boolean(form.formState.errors.initialCurriculumId)}>
                  <FieldLabel htmlFor="initialCurriculumId" className="text-xs font-medium">
                    3. Curriculum Regulation <span className="text-destructive">*</span>
                  </FieldLabel>
                  <Select
                    value={form.watch('initialCurriculumId')}
                    onValueChange={(val) => {
                      if (val) {
                        form.setValue('initialCurriculumId', val, { shouldValidate: true });
                        form.setValue('entrySemesterCatalogId', '');
                      }
                    }}
                    disabled={isPending || !selectedProgramId || curriculaLoading}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue
                        placeholder={
                          !selectedProgramId
                            ? 'Select program first'
                            : curriculaLoading
                              ? 'Loading regulations...'
                              : 'Select curriculum version...'
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {curriculaData?.items?.map((curr) => (
                        <SelectItem key={curr.id} value={curr.id} className="text-xs">
                          {curr.label} ({curr.status})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldError errors={[form.formState.errors.initialCurriculumId]} />
                </Field>

                <Field data-invalid={Boolean(form.formState.errors.entrySemesterCatalogId)}>
                  <FieldLabel htmlFor="entrySemesterCatalogId" className="text-xs font-medium">
                    4. Entry Semester Term <span className="text-destructive">*</span>
                  </FieldLabel>
                  <Select
                    value={form.watch('entrySemesterCatalogId')}
                    onValueChange={(val) => {
                      if (val)
                        form.setValue('entrySemesterCatalogId', val, { shouldValidate: true });
                    }}
                    disabled={isPending || !selectedCurriculumId || semestersLoading}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue
                        placeholder={
                          !selectedCurriculumId
                            ? 'Select curriculum first'
                            : semestersLoading
                              ? 'Loading semesters...'
                              : 'Select entry semester...'
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {semestersData?.items?.map((sem) => (
                        <SelectItem key={sem.id} value={sem.id} className="text-xs">
                          Semester {sem.number}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldError errors={[form.formState.errors.entrySemesterCatalogId]} />
                </Field>
              </div>
            </div>

            {/* FastTab 3: Registration Metadata & Quota */}
            <div className="border-border/40 space-y-4 border-t pt-4">
              <h3 className="text-muted-foreground flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase">
                <CalendarIcon className="text-primary size-3.5" />
                <span>Institutional Registration & Quota</span>
              </h3>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field data-invalid={Boolean(form.formState.errors.admissionNumber)}>
                  <FieldLabel htmlFor="admissionNumber" className="text-xs font-medium">
                    Admission Reg Number <span className="text-destructive">*</span>
                  </FieldLabel>
                  <Input
                    id="admissionNumber"
                    placeholder="e.g. ADM-2026-CSE-001"
                    className="h-9 font-mono text-xs uppercase"
                    disabled={isPending}
                    {...form.register('admissionNumber')}
                  />
                  <FieldError errors={[form.formState.errors.admissionNumber]} />
                </Field>

                <Field data-invalid={Boolean(form.formState.errors.admissionDate)}>
                  <FieldLabel htmlFor="admissionDate" className="text-xs font-medium">
                    Admission Date (YYYY-MM-DD) <span className="text-destructive">*</span>
                  </FieldLabel>
                  <Input
                    id="admissionDate"
                    type="date"
                    className="h-9 font-mono text-xs"
                    disabled={isPending}
                    {...form.register('admissionDate')}
                  />
                  <FieldError errors={[form.formState.errors.admissionDate]} />
                </Field>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field data-invalid={Boolean(form.formState.errors.admissionType)}>
                  <FieldLabel className="text-xs font-medium">
                    Admission Category <span className="text-destructive">*</span>
                  </FieldLabel>
                  <Select
                    value={form.watch('admissionType')}
                    onValueChange={(val) => {
                      if (val) form.setValue('admissionType', val, { shouldValidate: true });
                    }}
                    disabled={isPending}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Select admission type..." />
                    </SelectTrigger>
                    <SelectContent>
                      {ADMISSION_TYPES.map((type) => (
                        <SelectItem key={type} value={type} className="text-xs">
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldError errors={[form.formState.errors.admissionType]} />
                </Field>

                <Field data-invalid={Boolean(form.formState.errors.quota)}>
                  <FieldLabel className="text-xs font-medium">
                    Allocated Quota <span className="text-destructive">*</span>
                  </FieldLabel>
                  <Select
                    value={form.watch('quota')}
                    onValueChange={(val) => {
                      if (val) form.setValue('quota', val, { shouldValidate: true });
                    }}
                    disabled={isPending}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Select quota..." />
                    </SelectTrigger>
                    <SelectContent>
                      {ADMISSION_QUOTAS.map((quota) => (
                        <SelectItem key={quota} value={quota} className="text-xs">
                          {quota.replace(/_/g, ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldError errors={[form.formState.errors.quota]} />
                </Field>
              </div>
            </div>

            <div className="border-border/40 flex items-center justify-end gap-2 border-t pt-4">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                render={<Link href="/app/admissions" />}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="h-8 gap-1.5 text-xs font-semibold"
                disabled={isPending}
              >
                {isPending ? (
                  <Loader2Icon className="size-3.5 animate-spin" />
                ) : (
                  <SaveIcon className="size-3.5" />
                )}
                <span>Confirm & Enroll Admission</span>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
