'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeftIcon, Loader2Icon, MailIcon, SaveIcon } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { useForm } from 'react-hook-form';

import { useCreateUser } from '../hooks/use-create-user';
import { useUpdateUser } from '../hooks/use-update-user';
import {
  type CreateUserFormValues,
  createUserFormSchema,
  type UpdateUserFormValues,
  updateUserFormSchema,
  type UserProfile,
} from '../schemas/user.schema';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/components/ui/toast';
import { useDepartments } from '@/features/academics/hooks/use-departments';
import type { CreateRoleAssignmentPayload } from '@/features/roles/api/role-assignments';
import { useAssignRole } from '@/features/roles/hooks/use-assign-role';
import { useRoles } from '@/features/roles/hooks/use-roles';
import type { RoleItem } from '@/features/roles/schemas/role.schema';

interface UserFormProps {
  mode: 'create' | 'edit';
  user?: UserProfile;
}

export function UserForm({ mode, user }: UserFormProps) {
  const router = useRouter();
  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser(user?.id ?? '');
  const assignRoleMutation = useAssignRole();

  const [initialRoleId, setInitialRoleId] = React.useState<string>('NONE');
  const [initialScopeType, setInitialScopeType] = React.useState<'COLLEGE' | 'DEPARTMENT'>(
    'COLLEGE',
  );
  const [initialDepartmentId, setInitialDepartmentId] = React.useState<string>('');

  const { data: rolesData } = useRoles({ limit: 100 });
  const { data: departmentsData } = useDepartments({ limit: 100 });

  const isPending =
    createMutation.isPending || updateMutation.isPending || assignRoleMutation.isPending;
  const serverError = createMutation.error?.message ?? updateMutation.error?.message;

  // Create Mode Form
  const createForm = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserFormSchema),
    defaultValues: {
      email: '',
      firstName: '',
      middleName: '',
      lastName: '',
    },
  });

  // Edit Mode Form
  const editForm = useForm<UpdateUserFormValues>({
    resolver: zodResolver(updateUserFormSchema),
    defaultValues: {
      firstName: user?.firstName ?? '',
      middleName: user?.middleName ?? '',
      lastName: user?.lastName ?? '',
      avatarUrl: user?.avatarUrl ?? '',
    },
  });

  const onCreateSubmit = (values: CreateUserFormValues) => {
    if (initialRoleId !== 'NONE' && initialScopeType === 'DEPARTMENT' && !initialDepartmentId) {
      toast.add({
        title: 'Department required',
        description: 'Please select an academic department for department-scoped role assignment.',
        type: 'error',
      });
      return;
    }

    createMutation.mutate(
      {
        email: values.email,
        firstName: values.firstName,
        middleName: values.middleName?.trim() ? values.middleName.trim() : undefined,
        lastName: values.lastName,
      },
      {
        onSuccess: (createdUser) => {
          void (async () => {
            if (initialRoleId && initialRoleId !== 'NONE') {
              try {
                const payload: CreateRoleAssignmentPayload =
                  initialScopeType === 'DEPARTMENT'
                    ? {
                        userId: createdUser.id,
                        roleId: initialRoleId,
                        scope: { type: 'DEPARTMENT', departmentId: initialDepartmentId },
                      }
                    : {
                        userId: createdUser.id,
                        roleId: initialRoleId,
                        scope: { type: 'COLLEGE' },
                      };
                await assignRoleMutation.mutateAsync(payload);
              } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : 'Role allocation failed';
                toast.add({
                  title: 'User created, but role assignment failed',
                  description: msg,
                  type: 'warning',
                });
                router.push(`/app/users/${createdUser.id}`);
                return;
              }
            }

            toast.add({
              title: 'User created successfully',
              description: `Provisioned account for ${createdUser.fullName}. Activation email dispatched.`,
              type: 'success',
            });
            router.push(`/app/users/${createdUser.id}`);
          })();
        },
      },
    );
  };

  const onEditSubmit = (values: UpdateUserFormValues) => {
    if (!user) return;
    updateMutation.mutate(
      {
        firstName: values.firstName,
        middleName: values.middleName?.trim() ? values.middleName.trim() : null,
        lastName: values.lastName,
        avatarUrl: values.avatarUrl?.trim() ? values.avatarUrl.trim() : null,
      },
      {
        onSuccess: (updatedUser) => {
          toast.add({
            title: 'User profile updated',
            description: `Saved changes for ${updatedUser.fullName}.`,
            type: 'success',
          });
          router.push(`/app/users/${updatedUser.id}`);
        },
      },
    );
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1 text-xs"
          render={<Link href={mode === 'edit' && user ? `/app/users/${user.id}` : '/app/users'} />}
        >
          <ArrowLeftIcon className="size-3.5" />
          <span>Back to {mode === 'edit' ? 'Profile' : 'Users'}</span>
        </Button>
      </div>

      <Card className="border-border/80 shadow-sm">
        <CardHeader className="border-border/40 border-b pb-4">
          <CardTitle className="text-base font-semibold">
            {mode === 'create' ? 'Provision New User' : `Edit User: ${user?.fullName}`}
          </CardTitle>
          <CardDescription className="text-xs">
            {mode === 'create'
              ? 'Enter identity credentials. An institutional activation link will be automatically generated.'
              : 'Modify institutional account metadata and display preferences.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          {serverError && (
            <Alert variant="destructive" className="mb-6 text-xs">
              <AlertTitle className="text-xs font-semibold">Action Failed</AlertTitle>
              <AlertDescription className="text-xs">{serverError}</AlertDescription>
            </Alert>
          )}

          {mode === 'create' ? (
            <form
              noValidate
              onSubmit={(e) => void createForm.handleSubmit(onCreateSubmit)(e)}
              className="space-y-4"
            >
              <FieldGroup className="gap-4">
                <Field data-invalid={Boolean(createForm.formState.errors.email)}>
                  <FieldLabel htmlFor="email" className="text-xs font-medium">
                    Institutional Email Address <span className="text-destructive">*</span>
                  </FieldLabel>
                  <InputGroup className="h-9">
                    <InputGroupInput
                      id="email"
                      type="email"
                      placeholder="user@hvpmcoet.in"
                      className="text-xs"
                      disabled={isPending}
                      {...createForm.register('email')}
                    />
                    <InputGroupAddon align="inline-end" className="text-muted-foreground pr-2.5">
                      <MailIcon className="size-3.5" />
                    </InputGroupAddon>
                  </InputGroup>
                  <FieldError errors={[createForm.formState.errors.email]} />
                </Field>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field data-invalid={Boolean(createForm.formState.errors.firstName)}>
                    <FieldLabel htmlFor="firstName" className="text-xs font-medium">
                      First Name <span className="text-destructive">*</span>
                    </FieldLabel>
                    <Input
                      id="firstName"
                      placeholder="First name"
                      className="h-9 text-xs"
                      disabled={isPending}
                      {...createForm.register('firstName')}
                    />
                    <FieldError errors={[createForm.formState.errors.firstName]} />
                  </Field>

                  <Field data-invalid={Boolean(createForm.formState.errors.lastName)}>
                    <FieldLabel htmlFor="lastName" className="text-xs font-medium">
                      Last Name <span className="text-destructive">*</span>
                    </FieldLabel>
                    <Input
                      id="lastName"
                      placeholder="Last name"
                      className="h-9 text-xs"
                      disabled={isPending}
                      {...createForm.register('lastName')}
                    />
                    <FieldError errors={[createForm.formState.errors.lastName]} />
                  </Field>
                </div>

                <Field data-invalid={Boolean(createForm.formState.errors.middleName)}>
                  <FieldLabel
                    htmlFor="middleName"
                    className="text-muted-foreground text-xs font-medium"
                  >
                    Middle Name (Optional)
                  </FieldLabel>
                  <Input
                    id="middleName"
                    placeholder="Middle name"
                    className="h-9 text-xs"
                    disabled={isPending}
                    {...createForm.register('middleName')}
                  />
                  <FieldError errors={[createForm.formState.errors.middleName]} />
                </Field>
              </FieldGroup>

              <div className="border-border/40 border-t pt-2">
                <span className="text-foreground mb-1 block text-xs font-semibold">
                  Initial Role Assignment (Optional)
                </span>
                <p className="text-muted-foreground mb-3 text-[11px]">
                  Optionally allocate an initial operational role during account provisioning.
                  Additional roles and scopes can be configured later from the user profile.
                </p>

                <div className="space-y-3">
                  <Field>
                    <FieldLabel className="text-xs font-medium">Select Operational Role</FieldLabel>
                    <Select
                      value={initialRoleId}
                      onValueChange={(val) => {
                        if (val) setInitialRoleId(val);
                      }}
                      disabled={isPending}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="No initial role (Unassigned)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NONE" className="text-xs">
                          No initial role (Assign later)
                        </SelectItem>
                        {rolesData?.items?.map((role: RoleItem) => (
                          <SelectItem key={role.id} value={role.id} className="text-xs">
                            {role.displayName} ({role.key})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>

                  {initialRoleId !== 'NONE' && (
                    <div className="grid grid-cols-1 gap-3 pt-1 sm:grid-cols-2">
                      <Field>
                        <FieldLabel className="text-xs font-medium">Scope Context</FieldLabel>
                        <Select
                          value={initialScopeType}
                          onValueChange={(val) => {
                            if (val === 'COLLEGE' || val === 'DEPARTMENT') {
                              setInitialScopeType(val);
                            }
                          }}
                          disabled={isPending}
                        >
                          <SelectTrigger className="h-9 text-xs">
                            <SelectValue placeholder="Scope..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="COLLEGE" className="text-xs">
                              College-wide (Institution-level)
                            </SelectItem>
                            <SelectItem value="DEPARTMENT" className="text-xs">
                              Department-specific
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </Field>

                      {initialScopeType === 'DEPARTMENT' && (
                        <Field>
                          <FieldLabel className="text-xs font-medium">
                            Academic Department
                          </FieldLabel>
                          <Select
                            value={initialDepartmentId}
                            onValueChange={(val) => {
                              if (val) setInitialDepartmentId(val);
                            }}
                            disabled={isPending}
                          >
                            <SelectTrigger className="h-9 text-xs">
                              <SelectValue placeholder="Select department..." />
                            </SelectTrigger>
                            <SelectContent>
                              {departmentsData?.items?.map((dept) => (
                                <SelectItem key={dept.id} value={dept.id} className="text-xs">
                                  {dept.name} ({dept.code})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </Field>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="border-border/40 flex items-center justify-end gap-2 border-t pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  render={<Link href="/app/users" />}
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
                  <span>Create User Account</span>
                </Button>
              </div>
            </form>
          ) : (
            <form
              noValidate
              onSubmit={(e) => void editForm.handleSubmit(onEditSubmit)(e)}
              className="space-y-4"
            >
              <FieldGroup className="gap-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field data-invalid={Boolean(editForm.formState.errors.firstName)}>
                    <FieldLabel htmlFor="firstName" className="text-xs font-medium">
                      First Name <span className="text-destructive">*</span>
                    </FieldLabel>
                    <Input
                      id="firstName"
                      placeholder="First name"
                      className="h-9 text-xs"
                      disabled={isPending}
                      {...editForm.register('firstName')}
                    />
                    <FieldError errors={[editForm.formState.errors.firstName]} />
                  </Field>

                  <Field data-invalid={Boolean(editForm.formState.errors.lastName)}>
                    <FieldLabel htmlFor="lastName" className="text-xs font-medium">
                      Last Name <span className="text-destructive">*</span>
                    </FieldLabel>
                    <Input
                      id="lastName"
                      placeholder="Last name"
                      className="h-9 text-xs"
                      disabled={isPending}
                      {...editForm.register('lastName')}
                    />
                    <FieldError errors={[editForm.formState.errors.lastName]} />
                  </Field>
                </div>

                <Field data-invalid={Boolean(editForm.formState.errors.middleName)}>
                  <FieldLabel
                    htmlFor="middleName"
                    className="text-muted-foreground text-xs font-medium"
                  >
                    Middle Name (Optional)
                  </FieldLabel>
                  <Input
                    id="middleName"
                    placeholder="Middle name"
                    className="h-9 text-xs"
                    disabled={isPending}
                    {...editForm.register('middleName')}
                  />
                  <FieldError errors={[editForm.formState.errors.middleName]} />
                </Field>

                <Field data-invalid={Boolean(editForm.formState.errors.avatarUrl)}>
                  <FieldLabel
                    htmlFor="avatarUrl"
                    className="text-muted-foreground text-xs font-medium"
                  >
                    Avatar Image URL (Optional)
                  </FieldLabel>
                  <Input
                    id="avatarUrl"
                    type="url"
                    placeholder="https://..."
                    className="h-9 font-mono text-xs"
                    disabled={isPending}
                    {...editForm.register('avatarUrl')}
                  />
                  <FieldError errors={[editForm.formState.errors.avatarUrl]} />
                </Field>
              </FieldGroup>

              <div className="border-border/40 flex items-center justify-end gap-2 border-t pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  render={<Link href={`/app/users/${user?.id}`} />}
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
                  <span>Save Profile</span>
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
