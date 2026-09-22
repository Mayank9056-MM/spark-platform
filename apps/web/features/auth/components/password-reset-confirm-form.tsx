'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { EyeIcon, EyeOffIcon, TriangleAlertIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type ReactNode, useState } from 'react';
import { useForm } from 'react-hook-form';

import { LOGIN_PATH, RESET_QUERY_PARAM } from '../constants';
import { useConfirmPasswordReset } from '../hooks/use-confirm-password-reset';
import {
  getPasswordResetConfirmErrorMessage,
  isInvalidResetTokenError,
} from '../lib/password-reset-error';
import {
  type PasswordResetConfirmFormValues,
  passwordResetConfirmFormSchema,
} from '../schemas/password-reset.schema';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group';
import { Spinner } from '@/components/ui/spinner';

interface PasswordResetConfirmFormProps {
  /** Raw token from the email link, or undefined when the URL had none. */
  token: string | undefined;
}

export function PasswordResetConfirmForm({ token }: PasswordResetConfirmFormProps) {
  if (token === undefined) {
    return (
      <MessageCard title="Invalid reset link">
        This link is missing its reset token. Open the link from your password reset email again, or
        request a new one.
      </MessageCard>
    );
  }

  return <ConfirmPasswordForm token={token} />;
}

function ConfirmPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const confirm = useConfirmPasswordReset();
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PasswordResetConfirmFormValues>({
    resolver: zodResolver(passwordResetConfirmFormSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  if (confirm.isError && isInvalidResetTokenError(confirm.error)) {
    return (
      <MessageCard title="Reset link not valid">
        This password reset link is invalid, has expired, or has already been used. Request a new
        one and try again.
      </MessageCard>
    );
  }

  const isBusy = confirm.isPending || confirm.isSuccess;
  const passwordInputType = isPasswordVisible ? 'text' : 'password';

  const onSubmit = (values: PasswordResetConfirmFormValues) => {
    confirm.mutate(
      { token, password: values.password },
      {
        onSuccess: () => {
          const url = new URL(LOGIN_PATH, window.location.origin);
          url.searchParams.set(RESET_QUERY_PARAM, '1');
          router.replace(`${url.pathname}${url.search}`);
        },
      },
    );
  };

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Set a new password</CardTitle>
        <CardDescription>Choose a new password for your SPARK account.</CardDescription>
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
            {confirm.isError && (
              <Alert variant="destructive">
                <TriangleAlertIcon aria-hidden="true" />
                <AlertTitle>Couldn&apos;t reset your password</AlertTitle>
                <AlertDescription>
                  {getPasswordResetConfirmErrorMessage(confirm.error)}
                </AlertDescription>
              </Alert>
            )}

            <Field data-invalid={Boolean(errors.password)}>
              <FieldLabel htmlFor="password">New password</FieldLabel>
              <InputGroup>
                <InputGroupInput
                  id="password"
                  type={passwordInputType}
                  autoComplete="new-password"
                  aria-invalid={Boolean(errors.password)}
                  aria-describedby={errors.password ? 'password-error' : 'password-help'}
                  {...register('password')}
                />
                <InputGroupAddon align="inline-end">
                  <InputGroupButton
                    size="icon-xs"
                    aria-label={isPasswordVisible ? 'Hide password' : 'Show password'}
                    aria-pressed={isPasswordVisible}
                    onClick={() => {
                      setIsPasswordVisible((visible) => !visible);
                    }}
                  >
                    {isPasswordVisible ? (
                      <EyeOffIcon aria-hidden="true" />
                    ) : (
                      <EyeIcon aria-hidden="true" />
                    )}
                  </InputGroupButton>
                </InputGroupAddon>
              </InputGroup>
              <FieldDescription id="password-help">
                At least 10 characters, with a lowercase letter, an uppercase letter and a digit.
              </FieldDescription>
              <FieldError id="password-error" errors={[errors.password]} />
            </Field>

            <Field data-invalid={Boolean(errors.confirmPassword)}>
              <FieldLabel htmlFor="confirmPassword">Confirm new password</FieldLabel>
              <InputGroup>
                <InputGroupInput
                  id="confirmPassword"
                  type={passwordInputType}
                  autoComplete="new-password"
                  aria-invalid={Boolean(errors.confirmPassword)}
                  aria-describedby={errors.confirmPassword ? 'confirm-password-error' : undefined}
                  {...register('confirmPassword')}
                />
              </InputGroup>
              <FieldError id="confirm-password-error" errors={[errors.confirmPassword]} />
            </Field>

            <Field>
              <Button type="submit" size="lg" disabled={isBusy}>
                {isBusy && <Spinner data-icon="inline-start" aria-hidden="true" />}
                {isBusy ? 'Resetting…' : 'Reset password'}
              </Button>
            </Field>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}

function MessageCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 text-sm">{children}</CardContent>
    </Card>
  );
}
