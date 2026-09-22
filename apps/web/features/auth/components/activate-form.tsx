'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { EyeIcon, EyeOffIcon, TriangleAlertIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type ReactNode, useState } from 'react';
import { useForm } from 'react-hook-form';

import { LOGIN_PATH } from '../constants';
import { useActivateAccount } from '../hooks/use-activate-account';
import { getActivateErrorMessage, isInvalidActivationTokenError } from '../lib/activate-error';
import { type ActivateFormValues, activateFormSchema } from '../schemas/activate.schema';

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

interface ActivateFormProps {
  /** Raw token from the email link, or undefined when the URL had none. */
  token: string | undefined;
}

export function ActivateForm({ token }: ActivateFormProps) {
  if (token === undefined) {
    return (
      <MessageCard title="Invalid activation link">
        This link is missing its activation token. Open the link from your activation email again,
        or contact your college administrator.
      </MessageCard>
    );
  }

  return <ActivatePasswordForm token={token} />;
}

function ActivatePasswordForm({ token }: { token: string }) {
  const activate = useActivateAccount();
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ActivateFormValues>({
    resolver: zodResolver(activateFormSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  if (activate.isSuccess) {
    return (
      <MessageCard title="Account activated">
        Your account was activated successfully. You can now sign in with your email and password.
        <GoToLoginButton />
      </MessageCard>
    );
  }

  if (activate.isError && isInvalidActivationTokenError(activate.error)) {
    return (
      <MessageCard title="Activation link not valid">
        This activation link is invalid, has expired, or has already been used. If you have already
        activated your account, sign in. Otherwise contact your college administrator.
        <GoToLoginButton variant="outline" />
      </MessageCard>
    );
  }

  const isBusy = activate.isPending;
  const passwordInputType = isPasswordVisible ? 'text' : 'password';

  const onSubmit = (values: ActivateFormValues) => {
    // confirmPassword is a client-side check only and is not sent.
    activate.mutate(
      { token, password: values.password },
      {
        onSuccess: () => {
          // Drop the password from form state once it is no longer needed.
          reset();
        },
      },
    );
  };

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Activate account</CardTitle>
        <CardDescription>Set your password to activate your SPARK account.</CardDescription>
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
            {activate.isError && (
              <Alert variant="destructive">
                <TriangleAlertIcon aria-hidden="true" />
                <AlertTitle>Couldn&apos;t activate your account</AlertTitle>
                <AlertDescription>{getActivateErrorMessage(activate.error)}</AlertDescription>
              </Alert>
            )}

            <Field data-invalid={Boolean(errors.password)}>
              <FieldLabel htmlFor="password">Password</FieldLabel>
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
              <FieldLabel htmlFor="confirmPassword">Confirm password</FieldLabel>
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
                {isBusy ? 'Activating…' : 'Activate account'}
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

function GoToLoginButton({ variant }: { variant?: 'outline' }) {
  const router = useRouter();

  return (
    <Button
      type="button"
      size="lg"
      {...(variant !== undefined && { variant })}
      onClick={() => {
        router.push(LOGIN_PATH);
      }}
    >
      Go to login
    </Button>
  );
}
