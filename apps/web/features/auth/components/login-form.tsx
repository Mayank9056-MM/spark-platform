'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { CheckCircle2Icon, EyeIcon, EyeOffIcon, TriangleAlertIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

import { getCurrentUser } from '../api/get-current-user';
import { ACTIVATED_QUERY_PARAM, DEFAULT_POST_LOGIN_PATH, RESET_QUERY_PARAM } from '../constants';
import { CURRENT_USER_QUERY_KEY, useCurrentUser } from '../hooks/use-current-user';
import { useLogin } from '../hooks/use-login';
import { getLoginErrorMessage, isInvalidCredentialsError } from '../lib/login-error';
import { resolveDefaultRoute } from '../lib/route-resolution';
import { type LoginFormValues, loginSchema } from '../schemas/login.schema';

import { PROTECTED_PATH_PREFIX } from '@/components/auth/protected-route';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group';
import { Spinner } from '@/components/ui/spinner';

interface LoginFormProps {
  /** Already-sanitised, same-site destination (see resolveSafeRedirect). */
  redirectTo: string;
  initialActivated: boolean;
  initialReset: boolean;
}

export function LoginForm({ redirectTo, initialActivated, initialReset }: LoginFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const login = useLogin();
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  // Phase 13: an already-signed-in visitor to /login doesn't belong
  // here. Checked in the background so the form still renders
  // immediately for the overwhelmingly common case — nobody signed in.
  const currentUser = useCurrentUser();
  useEffect(() => {
    if (currentUser.isSuccess) {
      router.replace(resolveDefaultRoute(currentUser.data.roles.map((role) => role.key)));
    }
  }, [currentUser.isSuccess, currentUser.data, router]);

  // Strip ?activated=1 / ?reset=1 from the visible URL once their
  // message has been captured into props, without touching any other
  // param (e.g. ?next=...) or triggering a navigation.
  useEffect(() => {
    if (!initialActivated && !initialReset) {
      return;
    }
    const url = new URL(window.location.href);
    url.searchParams.delete(ACTIVATED_QUERY_PARAM);
    url.searchParams.delete(RESET_QUERY_PARAM);
    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
    // Runs once, against the URL present on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const {
    register,
    handleSubmit,
    resetField,
    setFocus,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  // Stay disabled after success too: navigation is in flight and a second
  // submit would create a second session.
  const isBusy = login.isPending || login.isSuccess;

  const onSubmit = (values: LoginFormValues) => {
    login.mutate(values, {
      onSuccess: () => {
        // An explicit, validated `next` target is honoured as-is.
        // Absent one, resolveSafeRedirect falls back to
        // DEFAULT_POST_LOGIN_PATH ('/'), which is never a real
        // destination — that's the signal to resolve the role-based
        // default instead (POST /login → GET /auth/me →
        // resolveDefaultRoute, per the auth spec).
        if (redirectTo !== DEFAULT_POST_LOGIN_PATH) {
          router.replace(redirectTo);
          return;
        }

        queryClient
          .fetchQuery({ queryKey: CURRENT_USER_QUERY_KEY, queryFn: getCurrentUser })
          .then((current) => {
            router.replace(resolveDefaultRoute(current.roles.map((role) => role.key)));
          })
          .catch(() => {
            // Unexpected: login just succeeded but /auth/me failed.
            // Land on the protected root and let its own bootstrap
            // sort it out (including bouncing back to /login if
            // something is genuinely wrong) rather than getting stuck
            // on a dead end here.
            router.replace(PROTECTED_PATH_PREFIX);
          });
      },
      onError: (error) => {
        // A rejected password is never worth keeping in the field.
        if (isInvalidCredentialsError(error)) {
          resetField('password');
          setFocus('password');
        }
      },
    });
  };

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>Use your SPARK account to continue.</CardDescription>
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
            {initialActivated && (
              <Alert>
                <CheckCircle2Icon aria-hidden="true" />
                <AlertTitle>Account activated successfully. You can now sign in.</AlertTitle>
              </Alert>
            )}

            {initialReset && (
              <Alert>
                <CheckCircle2Icon aria-hidden="true" />
                <AlertTitle>Your password has been reset. You can now sign in.</AlertTitle>
              </Alert>
            )}

            {login.isError && (
              <Alert variant="destructive">
                <TriangleAlertIcon aria-hidden="true" />
                <AlertTitle>Couldn&apos;t sign you in</AlertTitle>
                <AlertDescription>{getLoginErrorMessage(login.error)}</AlertDescription>
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

            <Field data-invalid={Boolean(errors.password)}>
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <InputGroup>
                <InputGroupInput
                  id="password"
                  type={isPasswordVisible ? 'text' : 'password'}
                  autoComplete="current-password"
                  aria-invalid={Boolean(errors.password)}
                  aria-describedby={errors.password ? 'password-error' : undefined}
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
              <FieldError id="password-error" errors={[errors.password]} />
            </Field>

            <Field>
              <Button type="submit" size="lg" disabled={isBusy}>
                {isBusy && <Spinner data-icon="inline-start" aria-hidden="true" />}
                {isBusy ? 'Signing in…' : 'Sign in'}
              </Button>
              <FieldDescription className="text-center">
                Can&apos;t sign in? Contact your college administrator.
              </FieldDescription>
            </Field>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
