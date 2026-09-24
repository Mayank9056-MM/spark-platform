'use client';

import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckCircle2Icon,
  GraduationCapIcon,
  IdCardIcon,
  Loader2Icon,
  SparklesIcon,
  UserCheckIcon,
  UserPlusIcon,
} from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { useCreateStudentEnrollment } from '../hooks/use-create-student-enrollment';
import type { StudentEnrollment } from '../schemas/student.schema';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { useCurricula } from '@/features/academics/hooks/use-curricula';
import { useDepartments } from '@/features/academics/hooks/use-departments';
import { usePrograms } from '@/features/academics/hooks/use-programs';
import { useSemesterCatalogs } from '@/features/academics/hooks/use-semester-catalogs';
import { useCreateAdmission } from '@/features/admissions/hooks/use-create-admission';
import {
  ADMISSION_QUOTAS,
  ADMISSION_TYPES,
  type Admission,
  type AdmissionQuota,
  type AdmissionType,
} from '@/features/admissions/schemas/admission.schema';
import { useAssignRole } from '@/features/roles/hooks/use-assign-role';
import { useRoles } from '@/features/roles/hooks/use-roles';
import { useCreateUser } from '@/features/users/hooks/use-create-user';
import { useUsers } from '@/features/users/hooks/use-users';
import type { UserProfile } from '@/features/users/schemas/user.schema';

type OnboardingStep = 1 | 2 | 3 | 4;

export function StudentOnboardingWizard() {
  // Wizard Navigation
  const [currentStep, setCurrentStep] = React.useState<OnboardingStep>(1);

  // Step 1: User Identity Mode & Data
  const [identityMode, setIdentityMode] = React.useState<'create' | 'select'>('create');
  const [selectedUser, setSelectedUser] = React.useState<UserProfile | null>(null);
  const [selectedUserId, setSelectedUserId] = React.useState('');

  const [newUserFirstName, setNewUserFirstName] = React.useState('');
  const [newUserMiddleName, setNewUserMiddleName] = React.useState('');
  const [newUserLastName, setNewUserLastName] = React.useState('');
  const [newUserEmail, setNewUserEmail] = React.useState('');

  // Step 2: Admission Data
  const [selectedDeptId, setSelectedDeptId] = React.useState('');
  const [selectedProgramId, setSelectedProgramId] = React.useState('');
  const [selectedCurriculumId, setSelectedCurriculumId] = React.useState('');
  const [selectedSemesterId, setSelectedSemesterId] = React.useState('');
  const [admissionNumber, setAdmissionNumber] = React.useState('');
  const [admissionDate, setAdmissionDate] = React.useState(
    () => new Date().toISOString().split('T')[0],
  );
  const [admissionType, setAdmissionType] = React.useState<AdmissionType>('NORMAL');
  const [admissionQuota, setAdmissionQuota] = React.useState<AdmissionQuota>('GOVERNMENT_QUOTA');

  const [createdAdmission, setCreatedAdmission] = React.useState<Admission | null>(null);

  // Step 3: Roll Number Allocation
  const [rollNumber, setRollNumber] = React.useState('');
  const [createdEnrollment, setCreatedEnrollment] = React.useState<StudentEnrollment | null>(null);

  const [wizardError, setWizardError] = React.useState<string | null>(null);
  const [isProcessing, setIsProcessing] = React.useState(false);

  // External queries
  const { data: usersData, isLoading: usersLoading } = useUsers({ limit: 100, status: 'ACTIVE' });
  const { data: rolesData } = useRoles({ limit: 100 });
  const { data: deptData, isLoading: deptsLoading } = useDepartments({ limit: 100 });
  const { data: progData, isLoading: progsLoading } = usePrograms(
    selectedDeptId ? { departmentId: selectedDeptId, limit: 100 } : undefined,
  );
  const { data: currData, isLoading: currsLoading } = useCurricula(
    selectedProgramId ? { programId: selectedProgramId, status: 'ACTIVE', limit: 100 } : undefined,
  );
  const { data: semData, isLoading: semsLoading } = useSemesterCatalogs(
    selectedCurriculumId ? { curriculumVersionId: selectedCurriculumId, limit: 100 } : undefined,
  );

  // Mutations
  const createUserMutation = useCreateUser();
  const assignRoleMutation = useAssignRole();
  const createAdmissionMutation = useCreateAdmission();
  const createEnrollmentMutation = useCreateStudentEnrollment();

  // Reset cascades when upstream selections change
  const handleDepartmentChange = (deptId: string) => {
    setSelectedDeptId(deptId);
    setSelectedProgramId('');
    setSelectedCurriculumId('');
    setSelectedSemesterId('');
  };

  const handleProgramChange = (progId: string) => {
    setSelectedProgramId(progId);
    setSelectedCurriculumId('');
    setSelectedSemesterId('');
  };

  const handleCurriculumChange = (currId: string) => {
    setSelectedCurriculumId(currId);
    setSelectedSemesterId('');
  };

  // Step 1 Submit: Establish Student Identity
  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setWizardError(null);

    if (identityMode === 'select') {
      if (!selectedUserId) {
        setWizardError('Please select an active user account.');
        return;
      }
      const existingUser = usersData?.items?.find((u) => u.id === selectedUserId);
      if (!existingUser) {
        setWizardError('Selected user account was not found.');
        return;
      }
      setSelectedUser(existingUser);
      setCurrentStep(2);
      return;
    }

    // Create mode
    if (!newUserFirstName.trim() || !newUserLastName.trim() || !newUserEmail.trim()) {
      setWizardError('First name, last name, and institutional email are required.');
      return;
    }

    // Guard against duplicate user creation if administrator navigated back to Step 1
    if (selectedUser?.email.trim().toLowerCase() === newUserEmail.trim().toLowerCase()) {
      setCurrentStep(2);
      return;
    }

    setIsProcessing(true);
    try {
      const newUser = await createUserMutation.mutateAsync({
        firstName: newUserFirstName.trim(),
        middleName: newUserMiddleName.trim() ? newUserMiddleName.trim() : undefined,
        lastName: newUserLastName.trim(),
        email: newUserEmail.trim(),
      });

      // Find student role and assign
      const studentRole = rolesData?.items?.find((r) => r.key === 'student');
      if (studentRole) {
        try {
          await assignRoleMutation.mutateAsync({
            userId: newUser.id,
            roleId: studentRole.id,
            scope: { type: 'COLLEGE' },
          });
        } catch {
          // Non-fatal if role assignment was already present or handled
        }
      }

      setSelectedUser(newUser);
      toast.add({
        title: 'User provisioned',
        description: `Identity established for ${newUser.fullName}.`,
        type: 'success',
      });
      setCurrentStep(2);
    } catch (err) {
      setWizardError(err instanceof Error ? err.message : 'Failed to provision user identity.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Step 2 Submit: Create Admission Record
  const handleStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setWizardError(null);

    if (!selectedUser) {
      setWizardError('User identity is missing. Please return to Step 1.');
      return;
    }
    if (
      !selectedProgramId ||
      !selectedCurriculumId ||
      !selectedSemesterId ||
      !admissionNumber.trim()
    ) {
      setWizardError('Please complete all academic program, curriculum, and admission fields.');
      return;
    }

    // Guard against duplicate admission creation if administrator navigated back to Step 2
    if (createdAdmission) {
      const isSameAdmission =
        createdAdmission.admissionNumber === admissionNumber.trim().toUpperCase() &&
        createdAdmission.initialProgramId === selectedProgramId &&
        createdAdmission.initialCurriculumId === selectedCurriculumId &&
        createdAdmission.entrySemesterCatalogId === selectedSemesterId;

      if (isSameAdmission) {
        setCurrentStep(3);
        return;
      }

      setWizardError(
        `Admission record ${createdAdmission.admissionNumber} has already been recorded for this student in the database. Altering academic assignment requires cancelling the existing admission via Admissions governance.`,
      );
      return;
    }

    setIsProcessing(true);
    try {
      const admission = await createAdmissionMutation.mutateAsync({
        userId: selectedUser.id,
        admissionNumber: admissionNumber.trim().toUpperCase(),
        admissionDate,
        admissionType,
        quota: admissionQuota,
        initialProgramId: selectedProgramId,
        initialCurriculumId: selectedCurriculumId,
        entrySemesterCatalogId: selectedSemesterId,
      });

      setCreatedAdmission(admission);
      toast.add({
        title: 'Admission confirmed',
        description: `Admission ${admission.admissionNumber} created successfully.`,
        type: 'success',
      });
      setCurrentStep(3);
    } catch (err) {
      setWizardError(err instanceof Error ? err.message : 'Failed to create admission record.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Step 3 Submit: Create Student Enrollment & Roll Number
  const handleStep3Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setWizardError(null);

    if (!createdAdmission) {
      setWizardError('Admission record is missing. Please return to Step 2.');
      return;
    }
    if (!rollNumber.trim()) {
      setWizardError('Institutional Roll Number is required.');
      return;
    }

    setIsProcessing(true);
    try {
      const enrollment = await createEnrollmentMutation.mutateAsync({
        admissionId: createdAdmission.id,
        rollNumber: rollNumber.trim().toUpperCase(),
      });

      setCreatedEnrollment(enrollment);
      toast.add({
        title: 'Enrollment complete',
        description: `Allocated Roll Number ${enrollment.rollNumber}. Student onboarding complete.`,
        type: 'success',
      });
      setCurrentStep(4);
    } catch (err) {
      setWizardError(err instanceof Error ? err.message : 'Failed to finalize enrollment.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Action Bar */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1 text-xs"
          render={<Link href="/app/admissions" />}
        >
          <ArrowLeftIcon className="size-3.5" />
          <span>Exit Wizard</span>
        </Button>
      </div>

      {/* Institutional Wizard Progress Steps */}
      <div className="border-border/60 grid grid-cols-3 gap-2 border-b pb-4">
        <div
          className={`flex items-center gap-2 rounded-md p-2 transition-colors ${
            currentStep === 1
              ? 'bg-primary/10 text-primary font-semibold'
              : currentStep > 1
                ? 'text-foreground'
                : 'text-muted-foreground'
          }`}
        >
          <div
            className={`flex size-6 items-center justify-center rounded-full font-mono text-xs font-bold ${
              currentStep > 1
                ? 'bg-emerald-600 text-white'
                : currentStep === 1
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
            }`}
          >
            {currentStep > 1 ? <CheckCircle2Icon className="size-3.5" /> : '1'}
          </div>
          <div className="truncate text-xs">
            <span className="block font-medium">Step 1</span>
            <span className="text-muted-foreground text-[11px]">User Identity</span>
          </div>
        </div>

        <div
          className={`flex items-center gap-2 rounded-md p-2 transition-colors ${
            currentStep === 2
              ? 'bg-primary/10 text-primary font-semibold'
              : currentStep > 2
                ? 'text-foreground'
                : 'text-muted-foreground'
          }`}
        >
          <div
            className={`flex size-6 items-center justify-center rounded-full font-mono text-xs font-bold ${
              currentStep > 2
                ? 'bg-emerald-600 text-white'
                : currentStep === 2
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
            }`}
          >
            {currentStep > 2 ? <CheckCircle2Icon className="size-3.5" /> : '2'}
          </div>
          <div className="truncate text-xs">
            <span className="block font-medium">Step 2</span>
            <span className="text-muted-foreground text-[11px]">Admission Record</span>
          </div>
        </div>

        <div
          className={`flex items-center gap-2 rounded-md p-2 transition-colors ${
            currentStep === 3
              ? 'bg-primary/10 text-primary font-semibold'
              : currentStep === 4
                ? 'text-foreground'
                : 'text-muted-foreground'
          }`}
        >
          <div
            className={`flex size-6 items-center justify-center rounded-full font-mono text-xs font-bold ${
              currentStep === 4
                ? 'bg-emerald-600 text-white'
                : currentStep === 3
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
            }`}
          >
            {currentStep === 4 ? <CheckCircle2Icon className="size-3.5" /> : '3'}
          </div>
          <div className="truncate text-xs">
            <span className="block font-medium">Step 3</span>
            <span className="text-muted-foreground text-[11px]">Roll Number</span>
          </div>
        </div>
      </div>

      {wizardError && (
        <Alert variant="destructive" className="text-xs">
          <AlertTitle className="text-xs font-semibold">Validation / Gateway Error</AlertTitle>
          <AlertDescription className="text-xs">{wizardError}</AlertDescription>
        </Alert>
      )}

      {/* STEP 1: IDENTITY */}
      {currentStep === 1 && (
        <Card className="border-border/80 shadow-sm">
          <CardHeader className="border-border/40 border-b pb-4">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <IdCardIcon className="text-primary size-4" />
              <span>Step 1: Student User Identity</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Every student requires a central institutional user account before academic admission.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form
              onSubmit={(e) => {
                void handleStep1Submit(e);
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-3 pb-2">
                <Button
                  type="button"
                  variant={identityMode === 'create' ? 'default' : 'outline'}
                  size="sm"
                  className="h-9 gap-1.5 text-xs font-semibold"
                  onClick={() => setIdentityMode('create')}
                >
                  <UserPlusIcon className="size-3.5" />
                  <span>Provision New Student Account</span>
                </Button>
                <Button
                  type="button"
                  variant={identityMode === 'select' ? 'default' : 'outline'}
                  size="sm"
                  className="h-9 gap-1.5 text-xs font-semibold"
                  onClick={() => setIdentityMode('select')}
                >
                  <UserCheckIcon className="size-3.5" />
                  <span>Select Existing User Account</span>
                </Button>
              </div>

              {identityMode === 'create' ? (
                <FieldGroup className="gap-3 pt-2">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Field>
                      <FieldLabel className="text-xs font-medium">First Name *</FieldLabel>
                      <Input
                        placeholder="First name"
                        value={newUserFirstName}
                        onChange={(e) => setNewUserFirstName(e.target.value)}
                        className="h-9 text-xs"
                        disabled={isProcessing}
                        required
                      />
                    </Field>
                    <Field>
                      <FieldLabel className="text-xs font-medium">Last Name *</FieldLabel>
                      <Input
                        placeholder="Last name"
                        value={newUserLastName}
                        onChange={(e) => setNewUserLastName(e.target.value)}
                        className="h-9 text-xs"
                        disabled={isProcessing}
                        required
                      />
                    </Field>
                  </div>

                  <Field>
                    <FieldLabel className="text-muted-foreground text-xs font-medium">
                      Middle Name (Optional)
                    </FieldLabel>
                    <Input
                      placeholder="Middle name"
                      value={newUserMiddleName}
                      onChange={(e) => setNewUserMiddleName(e.target.value)}
                      className="h-9 text-xs"
                      disabled={isProcessing}
                    />
                  </Field>

                  <Field>
                    <FieldLabel className="text-xs font-medium">Institutional Email *</FieldLabel>
                    <Input
                      type="email"
                      placeholder="student@hvpm.ac.in"
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      className="h-9 font-mono text-xs"
                      disabled={isProcessing}
                      required
                    />
                  </Field>
                </FieldGroup>
              ) : (
                <FieldGroup className="gap-3 pt-2">
                  <Field>
                    <FieldLabel className="text-xs font-medium">
                      Select Registered Account
                    </FieldLabel>
                    <Select
                      value={selectedUserId}
                      onValueChange={(val) => {
                        if (val) setSelectedUserId(val);
                      }}
                      disabled={usersLoading || isProcessing}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Choose a user account..." />
                      </SelectTrigger>
                      <SelectContent>
                        {usersData?.items?.map((user) => (
                          <SelectItem key={user.id} value={user.id} className="text-xs">
                            {user.fullName} ({user.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </FieldGroup>
              )}

              <div className="border-border/40 flex items-center justify-end gap-2 border-t pt-4">
                <Button
                  type="submit"
                  size="sm"
                  className="h-8 gap-1.5 text-xs font-semibold"
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <Loader2Icon className="size-3.5 animate-spin" />
                  ) : (
                    <ArrowRightIcon className="size-3.5" />
                  )}
                  <span>Proceed to Admission Record</span>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* STEP 2: ADMISSION RECORD */}
      {currentStep === 2 && selectedUser && (
        <Card className="border-border/80 shadow-sm">
          <CardHeader className="border-border/40 border-b pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <GraduationCapIcon className="text-primary size-4" />
                  <span>Step 2: Admission Record</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Configure institutional enrollment parameters for{' '}
                  <strong className="text-foreground">{selectedUser.fullName}</strong>.
                </CardDescription>
              </div>
              <Badge variant="outline" className="font-mono text-[10px]">
                {selectedUser.email}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <form
              onSubmit={(e) => {
                void handleStep2Submit(e);
              }}
              className="space-y-4"
            >
              <FieldGroup className="gap-3">
                {/* Cascade: Department */}
                <Field>
                  <FieldLabel className="text-xs font-medium">Academic Department *</FieldLabel>
                  <Select
                    value={selectedDeptId}
                    onValueChange={(val) => {
                      if (val) handleDepartmentChange(val);
                    }}
                    disabled={deptsLoading || isProcessing}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Select department..." />
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

                {/* Cascade: Program */}
                <Field>
                  <FieldLabel className="text-xs font-medium">
                    Degree / Diploma Program *
                  </FieldLabel>
                  <Select
                    value={selectedProgramId}
                    onValueChange={(val) => {
                      if (val) handleProgramChange(val);
                    }}
                    disabled={!selectedDeptId || progsLoading || isProcessing}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue
                        placeholder={
                          selectedDeptId ? 'Select program...' : 'Select department first'
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {progData?.items?.map((prog) => (
                        <SelectItem key={prog.id} value={prog.id} className="text-xs">
                          {prog.name} ({prog.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                {/* Cascade: Curriculum Version */}
                <Field>
                  <FieldLabel className="text-xs font-medium">Curriculum Regulation *</FieldLabel>
                  <Select
                    value={selectedCurriculumId}
                    onValueChange={(val) => {
                      if (val) handleCurriculumChange(val);
                    }}
                    disabled={!selectedProgramId || currsLoading || isProcessing}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue
                        placeholder={
                          selectedProgramId ? 'Select regulation...' : 'Select program first'
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {currData?.items?.map((curr) => (
                        <SelectItem key={curr.id} value={curr.id} className="text-xs">
                          {curr.label} ({curr.status})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                {/* Cascade: Entry Semester */}
                <Field>
                  <FieldLabel className="text-xs font-medium">Entry Semester Catalog *</FieldLabel>
                  <Select
                    value={selectedSemesterId}
                    onValueChange={(val) => {
                      if (val) setSelectedSemesterId(val);
                    }}
                    disabled={!selectedCurriculumId || semsLoading || isProcessing}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue
                        placeholder={
                          selectedCurriculumId
                            ? 'Select entry semester...'
                            : 'Select regulation first'
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {semData?.items?.map((sem) => (
                        <SelectItem key={sem.id} value={sem.id} className="text-xs">
                          Semester {sem.number}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                {/* Admission Metadata */}
                <div className="grid grid-cols-1 gap-3 pt-2 sm:grid-cols-2">
                  <Field>
                    <FieldLabel className="text-xs font-medium">Admission Number *</FieldLabel>
                    <Input
                      placeholder="e.g. ADM/2025/001"
                      value={admissionNumber}
                      onChange={(e) => setAdmissionNumber(e.target.value.toUpperCase())}
                      className="h-9 font-mono text-xs font-bold"
                      disabled={isProcessing}
                      required
                    />
                  </Field>

                  <Field>
                    <FieldLabel className="text-xs font-medium">Admission Date *</FieldLabel>
                    <Input
                      type="date"
                      value={admissionDate}
                      onChange={(e) => setAdmissionDate(e.target.value)}
                      className="h-9 font-mono text-xs"
                      disabled={isProcessing}
                      required
                    />
                  </Field>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field>
                    <FieldLabel className="text-xs font-medium">Admission Type</FieldLabel>
                    <Select
                      value={admissionType}
                      onValueChange={(val) => {
                        if (val) setAdmissionType(val);
                      }}
                      disabled={isProcessing}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Select type..." />
                      </SelectTrigger>
                      <SelectContent>
                        {ADMISSION_TYPES.map((t) => (
                          <SelectItem key={t} value={t} className="text-xs">
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field>
                    <FieldLabel className="text-xs font-medium">Quota Allocation</FieldLabel>
                    <Select
                      value={admissionQuota}
                      onValueChange={(val) => {
                        if (val) setAdmissionQuota(val);
                      }}
                      disabled={isProcessing}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Select quota..." />
                      </SelectTrigger>
                      <SelectContent>
                        {ADMISSION_QUOTAS.map((q) => (
                          <SelectItem key={q} value={q} className="text-xs">
                            {q.replace(/_/g, ' ')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
              </FieldGroup>

              <div className="border-border/40 flex items-center justify-between gap-2 border-t pt-4">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => setCurrentStep(1)}
                  disabled={isProcessing}
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="h-8 gap-1.5 text-xs font-semibold"
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <Loader2Icon className="size-3.5 animate-spin" />
                  ) : (
                    <ArrowRightIcon className="size-3.5" />
                  )}
                  <span>Confirm Admission & Allocate Roll No.</span>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* STEP 3: ROLL NUMBER & ENROLLMENT */}
      {currentStep === 3 && createdAdmission && selectedUser && (
        <Card className="border-border/80 shadow-sm">
          <CardHeader className="border-border/40 border-b pb-4">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <SparklesIcon className="text-primary size-4" />
              <span>Step 3: Academic Roll Number Allocation</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Link admission{' '}
              <strong className="text-foreground font-mono">
                {createdAdmission.admissionNumber}
              </strong>{' '}
              to an operational student enrollment record.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form
              onSubmit={(e) => {
                void handleStep3Submit(e);
              }}
              className="space-y-4"
            >
              <div className="bg-muted/40 border-border/60 space-y-2 rounded-md border p-4 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Student Name:</span>
                  <span className="text-foreground font-semibold">{selectedUser.fullName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Admission ID:</span>
                  <span className="text-foreground font-mono">
                    {createdAdmission.admissionNumber}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Admission Date:</span>
                  <span className="text-foreground font-mono">
                    {createdAdmission.admissionDate}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Quota:</span>
                  <span className="text-foreground">
                    {createdAdmission.quota.replace(/_/g, ' ')}
                  </span>
                </div>
              </div>

              <FieldGroup className="gap-3 pt-2">
                <Field>
                  <FieldLabel className="text-xs font-medium">
                    Institutional Roll Number *
                  </FieldLabel>
                  <Input
                    placeholder="e.g. 23CS001, BE-CSE-2025-001"
                    value={rollNumber}
                    onChange={(e) => setRollNumber(e.target.value.toUpperCase())}
                    className="h-9 font-mono text-xs font-bold"
                    disabled={isProcessing}
                    required
                  />
                  <p className="text-muted-foreground mt-1 text-[11px]">
                    This roll number is unique institution-wide and will identify the student on
                    mark sheets, timetables, and grade registries.
                  </p>
                </Field>
              </FieldGroup>

              <div className="border-border/40 flex items-center justify-between gap-2 border-t pt-4">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => setCurrentStep(2)}
                  disabled={isProcessing}
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="h-8 gap-1.5 text-xs font-semibold"
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <Loader2Icon className="size-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2Icon className="size-3.5" />
                  )}
                  <span>Finalize Student Onboarding</span>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* STEP 4: SUCCESS SUMMARY */}
      {currentStep === 4 && createdEnrollment && selectedUser && (
        <Card className="border-border/80 border-emerald-500/30 shadow-sm">
          <CardHeader className="border-border/40 border-b pb-4 text-center">
            <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2Icon className="size-6" />
            </div>
            <CardTitle className="text-foreground text-base font-semibold">
              Student Onboarding Successfully Completed
            </CardTitle>
            <CardDescription className="text-xs">
              {selectedUser.fullName} is now an active enrolled student at HVPM COET.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="border-border/60 bg-muted/20 rounded-md border p-3">
                <span className="text-muted-foreground block text-[11px] font-medium tracking-wider uppercase">
                  Roll Number
                </span>
                <span className="text-foreground font-mono text-base font-bold">
                  {createdEnrollment.rollNumber}
                </span>
              </div>

              <div className="border-border/60 bg-muted/20 rounded-md border p-3">
                <span className="text-muted-foreground block text-[11px] font-medium tracking-wider uppercase">
                  Admission Number
                </span>
                <span className="text-foreground font-mono text-base font-bold">
                  {createdAdmission?.admissionNumber}
                </span>
              </div>
            </div>

            <div className="border-border/40 flex items-center justify-center gap-3 border-t pt-4">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                render={<Link href={`/app/admissions/${createdAdmission?.id}`} />}
              >
                View Admission Record
              </Button>
              <Button
                size="sm"
                className="h-8 text-xs font-semibold"
                render={<Link href={`/app/student/${createdEnrollment.id}`} />}
              >
                View Enrolled Student Profile
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
