'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { TriangleAlertIcon } from 'lucide-react';
import { useForm } from 'react-hook-form';

import { useRequestPasswordReset } from '../hooks/use-request-password-reset';
import { getPasswordResetRequestErrorMessage } from '../lib/password-reset-error';
import {
  type PasswordResetRequestValues,
  passwordResetRequestSchema,
} from '../schemas/password-reset.schema';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';

export function PasswordResetRequestForm() {
  const request = useRequestPasswordReset();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PasswordResetRequestValues>({
    resolver: zodResolver(passwordResetRequestSchema),
    defaultValues: { email: '' },
  });

  if (request.isSuccess) {
    return (
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Check your email</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          {/* Deliberately identical whether or not the email exists — see auth.controller.ts. */}
          If an account exists for this email, you will receive password reset instructions.
        </CardContent>
      </Card>
    );
  }

  const isBusy = request.isPending;

  const onSubmit = (values: PasswordResetRequestValues) => {
    request.mutate(values);
  };

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Reset your password</CardTitle>
        <CardDescription>Enter your email and we&apos;ll send you a reset link.</CardDescription>
      </CardHeader>

      <CardContent>
        <form
          noValidate
          aria-busy={isBusy}
          onSubmit={(event) => {
            void handleSubmit(onSubmit)(event);
          }}
        >
          <FieldGroup>
            {request.isError && (
              <Alert variant="destructive">
                <TriangleAlertIcon aria-hidden="true" />
                <AlertTitle>Couldn&apos;t send the reset email</AlertTitle>
                <AlertDescription>
                  {getPasswordResetRequestErrorMessage(request.error)}
                </AlertDescription>
              </Alert>
            )}

            <Field data-invalid={Boolean(errors.email)}>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input
                id="email"
                type="email"
                inputMode="email"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="name@example.com"
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? 'email-error' : undefined}
                {...register('email')}
              />
              <FieldError id="email-error" errors={[errors.email]} />
            </Field>

            <Field>
              <Button type="submit" size="lg" disabled={isBusy}>
                {isBusy && <Spinner data-icon="inline-start" aria-hidden="true" />}
                {isBusy ? 'Sending…' : 'Send reset link'}
              </Button>
            </Field>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
