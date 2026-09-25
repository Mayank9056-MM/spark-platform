'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeftIcon, Loader2Icon, SaveIcon } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { useForm } from 'react-hook-form';

import { useCreateRole } from '../hooks/use-create-role';
import { useUpdateRole } from '../hooks/use-update-role';
import {
  type CreateRoleFormValues,
  createRoleSchema,
  type RoleItem,
  type UpdateRoleFormValues,
  updateRoleSchema,
} from '../schemas/role.schema';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/toast';

interface RoleFormProps {
  mode: 'create' | 'edit';
  role?: RoleItem;
}

export function RoleForm({ mode, role }: RoleFormProps) {
  const router = useRouter();
  const createMutation = useCreateRole();
  const updateMutation = useUpdateRole(role?.id ?? '');

  const isPending = createMutation.isPending || updateMutation.isPending;
  const serverError = createMutation.error?.message ?? updateMutation.error?.message;

  const createForm = useForm<CreateRoleFormValues>({
    resolver: zodResolver(createRoleSchema),
    defaultValues: {
      key: '',
      displayName: '',
    },
  });

  const editForm = useForm<UpdateRoleFormValues>({
    resolver: zodResolver(updateRoleSchema),
    defaultValues: {
      displayName: role?.displayName ?? '',
    },
  });

  const onCreateSubmit = (values: CreateRoleFormValues) => {
    createMutation.mutate(values, {
      onSuccess: (createdRole) => {
        toast.add({
          title: 'Role created',
          description: `Custom role "${createdRole.displayName}" created successfully.`,
          type: 'success',
        });
        router.push(`/app/roles/${createdRole.id}`);
      },
    });
  };

  const onEditSubmit = (values: UpdateRoleFormValues) => {
    if (!role) return;
    updateMutation.mutate(values, {
      onSuccess: (updatedRole) => {
        toast.add({
          title: 'Role updated',
          description: `Role "${updatedRole.displayName}" updated successfully.`,
          type: 'success',
        });
        router.push(`/app/roles/${updatedRole.id}`);
      },
    });
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1 text-xs"
          render={<Link href={mode === 'edit' && role ? `/app/roles/${role.id}` : '/app/roles'} />}
        >
          <ArrowLeftIcon className="size-3.5" />
          <span>Back to {mode === 'edit' ? 'Role' : 'Roles'}</span>
        </Button>
      </div>

      <Card className="border-border/80 shadow-sm">
        <CardHeader className="border-border/40 border-b pb-4">
          <CardTitle className="text-base font-semibold">
            {mode === 'create' ? 'Create Custom Role' : `Edit Role: ${role?.displayName}`}
          </CardTitle>
          <CardDescription className="text-xs">
            {mode === 'create'
              ? 'Define a new institutional role. Permissions can be assigned after creation.'
              : 'Modify the display name of this institutional role.'}
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
                <Field data-invalid={Boolean(createForm.formState.errors.key)}>
                  <FieldLabel htmlFor="key" className="text-xs font-medium">
                    Role Identifier Key <span className="text-destructive">*</span>
                  </FieldLabel>
                  <Input
                    id="key"
                    placeholder="e.g. lab_assistant or academic_coordinator"
                    className="h-9 font-mono text-xs"
                    disabled={isPending}
                    {...createForm.register('key')}
                  />
                  <p className="text-muted-foreground mt-1 text-[11px]">
                    Unique lowercase alphanumeric key used for system authorization. Cannot be
                    changed once created.
                  </p>
                  <FieldError errors={[createForm.formState.errors.key]} />
                </Field>

                <Field data-invalid={Boolean(createForm.formState.errors.displayName)}>
                  <FieldLabel htmlFor="displayName" className="text-xs font-medium">
                    Display Name <span className="text-destructive">*</span>
                  </FieldLabel>
                  <Input
                    id="displayName"
                    placeholder="e.g. Laboratory Assistant"
                    className="h-9 text-xs"
                    disabled={isPending}
                    {...createForm.register('displayName')}
                  />
                  <FieldError errors={[createForm.formState.errors.displayName]} />
                </Field>
              </FieldGroup>

              <div className="border-border/40 flex items-center justify-end gap-2 border-t pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  render={<Link href="/app/roles" />}
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
                  <span>Create Role</span>
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
                <Field data-invalid={Boolean(editForm.formState.errors.displayName)}>
                  <FieldLabel htmlFor="displayName" className="text-xs font-medium">
                    Display Name <span className="text-destructive">*</span>
                  </FieldLabel>
                  <Input
                    id="displayName"
                    placeholder="Role display name"
                    className="h-9 text-xs"
                    disabled={isPending}
                    {...editForm.register('displayName')}
                  />
                  <FieldError errors={[editForm.formState.errors.displayName]} />
                </Field>
              </FieldGroup>

              <div className="border-border/40 flex items-center justify-end gap-2 border-t pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  render={<Link href={`/app/roles/${role?.id}`} />}
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
                  <span>Save Role</span>
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
