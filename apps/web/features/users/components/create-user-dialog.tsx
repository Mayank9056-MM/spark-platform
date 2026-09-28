'use client';

import { useQueryClient } from '@tanstack/react-query';
import { AlertCircle, PlusIcon, ShieldCheckIcon, UserPlusIcon } from 'lucide-react';
import * as React from 'react';

import { useCreateUser } from '../hooks/use-create-user';
import { userKeys } from '../hooks/user-keys';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { toast } from '@/components/ui/toast';
import { useDepartments } from '@/features/academics/hooks/use-departments';
import type { CreateRoleAssignmentPayload } from '@/features/roles/api/role-assignments';
import { useAssignRole } from '@/features/roles/hooks/use-assign-role';
import { useRoles } from '@/features/roles/hooks/use-roles';

interface CreateUserDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactElement;
  onSuccess?: (userId: string) => void;
}

export function CreateUserDialog({
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  trigger,
  onSuccess,
}: CreateUserDialogProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : internalOpen;

  const setOpen = React.useCallback(
    (value: boolean) => {
      if (isControlled) {
        setControlledOpen?.(value);
      } else {
        setInternalOpen(value);
      }
    },
    [isControlled, setControlledOpen],
  );

  // Form states
  const [email, setEmail] = React.useState('');
  const [firstName, setFirstName] = React.useState('');
  const [middleName, setMiddleName] = React.useState('');
  const [lastName, setLastName] = React.useState('');
  const [initialRoleId, setInitialRoleId] = React.useState('NONE');
  const [initialScopeType, setInitialScopeType] = React.useState<'COLLEGE' | 'DEPARTMENT'>(
    'COLLEGE',
  );
  const [initialDepartmentId, setInitialDepartmentId] = React.useState('');

  // Validation / Error state
  const [formErrors, setFormErrors] = React.useState<Record<string, string>>({});
  const [serverError, setServerError] = React.useState<string | null>(null);

  const queryClient = useQueryClient();
  const createMutation = useCreateUser();
  const assignRoleMutation = useAssignRole();

  const { data: rolesData, isLoading: rolesLoading } = useRoles({ limit: 100 });
  const { data: departmentsData, isLoading: deptsLoading } = useDepartments({ limit: 100 });

  const isSubmitting = createMutation.isPending || assignRoleMutation.isPending;

  const resetForm = React.useCallback(() => {
    setEmail('');
    setFirstName('');
    setMiddleName('');
    setLastName('');
    setInitialRoleId('NONE');
    setInitialScopeType('COLLEGE');
    setInitialDepartmentId('');
    setFormErrors({});
    setServerError(null);
  }, []);

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && isSubmitting) return; // Prevent closing while in flight
    if (!newOpen) {
      resetForm();
    }
    setOpen(newOpen);
  };

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!email.trim()) {
      errors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = 'Please provide a valid institutional email';
    }
    if (!firstName.trim()) {
      errors.firstName = 'First name is required';
    }
    if (!lastName.trim()) {
      errors.lastName = 'Last name is required';
    }
    if (initialRoleId !== 'NONE' && initialScopeType === 'DEPARTMENT' && !initialDepartmentId) {
      errors.departmentId = 'Department selection is required for department-scoped role';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    if (!validate()) {
      return;
    }

    try {
      // 1. Create User
      const createdUser = await createMutation.mutateAsync({
        email: email.trim().toLowerCase(),
        firstName: firstName.trim(),
        middleName: middleName.trim() ? middleName.trim() : undefined,
        lastName: lastName.trim(),
      });

      // 2. Optionally assign role if specified
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
        } catch (roleErr: unknown) {
          const roleMsg =
            roleErr instanceof Error ? roleErr.message : 'Role allocation was not completed.';
          toast.add({
            title: 'User created with warning',
            description: `User ${createdUser.fullName} provisioned, but role assignment failed: ${roleMsg}`,
            type: 'warning',
          });
          void queryClient.invalidateQueries({ queryKey: userKeys.all });
          resetForm();
          setOpen(false);
          onSuccess?.(createdUser.id);
          return;
        }
      }

      // Success flow: toast, invalidate, reset, close dialog
      toast.add({
        title: 'User Provisioned Successfully',
        description: `Account created for ${createdUser.fullName} (${createdUser.email}). Activation instructions sent.`,
        type: 'success',
      });
      void queryClient.invalidateQueries({ queryKey: userKeys.all });
      resetForm();
      setOpen(false);
      onSuccess?.(createdUser.id);
    } catch (err: unknown) {
      // Error flow: keep dialog open, keep fields intact, display clear error message
      const msg = err instanceof Error ? err.message : 'Failed to provision user account.';
      setServerError(msg);
      toast.add({
        title: 'Provisioning Failed',
        description: msg,
        type: 'error',
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      {trigger && <DialogTrigger render={trigger} />}
      <DialogContent className="border-border/80 sm:max-w-lg">
        <DialogHeader>
          <div className="text-primary flex items-center gap-2 font-mono text-[11px] font-semibold tracking-wider uppercase">
            <UserPlusIcon className="size-3.5" />
            <span>Identity Provisioning</span>
          </div>
          <DialogTitle className="font-heading text-lg font-bold">
            Provision Institutional User
          </DialogTitle>
          <DialogDescription className="text-xs">
            Create an enterprise user account and configure optional initial governance roles.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            void handleSubmit(e);
          }}
          className="space-y-4 pt-2"
        >
          {serverError && (
            <Alert variant="destructive" className="rounded-none">
              <AlertCircle className="size-4" />
              <AlertTitle>Creation Error</AlertTitle>
              <AlertDescription className="text-xs">{serverError}</AlertDescription>
            </Alert>
          )}

          {/* Name Fields Grid */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field>
              <FieldLabel className="text-xs font-medium">First Name *</FieldLabel>
              <Input
                type="text"
                placeholder="Jane"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                disabled={isSubmitting}
                className="h-8 text-xs"
                required
              />
              {formErrors.firstName && (
                <FieldError className="text-destructive text-[11px]">
                  {formErrors.firstName}
                </FieldError>
              )}
            </Field>

            <Field>
              <FieldLabel className="text-xs font-medium">Middle Name</FieldLabel>
              <Input
                type="text"
                placeholder="M."
                value={middleName}
                onChange={(e) => setMiddleName(e.target.value)}
                disabled={isSubmitting}
                className="h-8 text-xs"
              />
            </Field>

            <Field>
              <FieldLabel className="text-xs font-medium">Last Name *</FieldLabel>
              <Input
                type="text"
                placeholder="Doe"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                disabled={isSubmitting}
                className="h-8 text-xs"
                required
              />
              {formErrors.lastName && (
                <FieldError className="text-destructive text-[11px]">
                  {formErrors.lastName}
                </FieldError>
              )}
            </Field>
          </div>

          {/* Email Address */}
          <Field>
            <FieldLabel className="text-xs font-medium">Email Address *</FieldLabel>
            <Input
              type="email"
              placeholder="jane.doe@hvpmcoet.edu.in"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSubmitting}
              className="h-8 text-xs"
              required
            />
            {formErrors.email ? (
              <FieldError className="text-destructive text-[11px]">{formErrors.email}</FieldError>
            ) : (
              <p className="text-muted-foreground mt-0.5 text-[10px]">
                An activation link will be automatically generated and dispatched.
              </p>
            )}
          </Field>

          {/* Role and Scope Configuration */}
          <div className="border-border bg-muted/20 space-y-3 border p-3">
            <div className="text-foreground flex items-center gap-1.5 text-xs font-semibold">
              <ShieldCheckIcon className="text-primary size-3.5" />
              <span>Initial Role Allocation (Optional)</span>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field>
                <FieldLabel className="text-[11px] font-medium">Platform Role</FieldLabel>
                <Select
                  value={initialRoleId}
                  onValueChange={(val) => {
                    setInitialRoleId(val ?? 'NONE');
                    if (val === 'NONE') {
                      setInitialDepartmentId('');
                    }
                  }}
                  disabled={isSubmitting || rolesLoading}
                >
                  <SelectTrigger className="bg-background h-8 text-xs">
                    <SelectValue placeholder="No initial role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">No initial role</SelectItem>
                    {rolesData?.items.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.displayName} ({r.key})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              {initialRoleId !== 'NONE' && (
                <Field>
                  <FieldLabel className="text-[11px] font-medium">Scope Boundary</FieldLabel>
                  <Select
                    value={initialScopeType}
                    onValueChange={(val) => setInitialScopeType(val!)}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger className="bg-background h-8 text-xs">
                      <SelectValue placeholder="Scope type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="COLLEGE">Campus / College-Wide</SelectItem>
                      <SelectItem value="DEPARTMENT">Academic Department</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              )}
            </div>

            {initialRoleId !== 'NONE' && initialScopeType === 'DEPARTMENT' && (
              <Field>
                <FieldLabel className="text-[11px] font-medium">
                  Target Academic Department *
                </FieldLabel>
                <Select
                  value={initialDepartmentId}
                  onValueChange={(val) => setInitialDepartmentId(val ?? '')}
                  disabled={isSubmitting || deptsLoading}
                >
                  <SelectTrigger className="bg-background h-8 text-xs">
                    <SelectValue placeholder="Select department..." />
                  </SelectTrigger>
                  <SelectContent>
                    {departmentsData?.items.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name} ({d.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formErrors.departmentId && (
                  <FieldError className="text-destructive text-[11px]">
                    {formErrors.departmentId}
                  </FieldError>
                )}
              </Field>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
              className="h-8 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="h-8 gap-1.5 text-xs font-semibold"
            >
              {isSubmitting ? (
                <>
                  <Spinner aria-hidden="true" className="size-3.5" />
                  <span>Provisioning User…</span>
                </>
              ) : (
                <>
                  <PlusIcon className="size-3.5" />
                  <span>Provision User</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
