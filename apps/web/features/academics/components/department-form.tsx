'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeftIcon, Loader2Icon, SaveIcon } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { useForm } from 'react-hook-form';

import { useCreateDepartment } from '../hooks/use-create-department';
import {
  type CreateDepartmentFormValues,
  createDepartmentSchema,
} from '../schemas/academic.schema';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/toast';

export function DepartmentForm() {
  const router = useRouter();
  const createMutation = useCreateDepartment();

  const isPending = createMutation.isPending;
  const serverError = createMutation.error?.message;

  const form = useForm<CreateDepartmentFormValues>({
    resolver: zodResolver(createDepartmentSchema),
    defaultValues: {
      name: '',
      code: '',
    },
  });

  const onSubmit = (values: CreateDepartmentFormValues) => {
    createMutation.mutate(
      {
        name: values.name.trim(),
        code: values.code.trim().toUpperCase(),
      },
      {
        onSuccess: (createdDept) => {
          toast.add({
            title: 'Department created',
            description: `Academic department "${createdDept.name}" registered.`,
            type: 'success',
          });
          router.push('/app/academics/departments');
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
          render={<Link href="/app/academics/departments" />}
        >
          <ArrowLeftIcon className="size-3.5" />
          <span>Back to Departments</span>
        </Button>
      </div>

      <Card className="border-border/80 shadow-sm">
        <CardHeader className="border-border/40 border-b pb-4">
          <CardTitle className="text-base font-semibold">Register Academic Department</CardTitle>
          <CardDescription className="text-xs">
            Establish a top-level academic unit for degree programs and faculty allocation.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          {serverError && (
            <Alert variant="destructive" className="mb-6 text-xs">
              <AlertTitle className="text-xs font-semibold">Registration Failed</AlertTitle>
              <AlertDescription className="text-xs">{serverError}</AlertDescription>
            </Alert>
          )}

          <form
            noValidate
            onSubmit={(e) => void form.handleSubmit(onSubmit)(e)}
            className="space-y-4"
          >
            <FieldGroup className="gap-4">
              <Field data-invalid={Boolean(form.formState.errors.code)}>
                <FieldLabel htmlFor="code" className="text-xs font-medium">
                  Department Code <span className="text-destructive">*</span>
                </FieldLabel>
                <Input
                  id="code"
                  placeholder="e.g. CSE or MECH"
                  className="h-9 font-mono text-xs uppercase"
                  disabled={isPending}
                  {...form.register('code')}
                />
                <p className="text-muted-foreground mt-1 text-[11px]">
                  Uppercase abbreviation or acronym (e.g. CSE, IT, MECH, CIVIL, EXTC).
                </p>
                <FieldError errors={[form.formState.errors.code]} />
              </Field>

              <Field data-invalid={Boolean(form.formState.errors.name)}>
                <FieldLabel htmlFor="name" className="text-xs font-medium">
                  Department Title <span className="text-destructive">*</span>
                </FieldLabel>
                <Input
                  id="name"
                  placeholder="e.g. Department of Computer Science & Engineering"
                  className="h-9 text-xs"
                  disabled={isPending}
                  {...form.register('name')}
                />
                <FieldError errors={[form.formState.errors.name]} />
              </Field>
            </FieldGroup>

            <div className="border-border/40 flex items-center justify-end gap-2 border-t pt-4">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                render={<Link href="/app/academics/departments" />}
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
                <span>Register Department</span>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
