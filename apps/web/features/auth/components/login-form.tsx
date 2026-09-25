'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowRightIcon, CheckCircle2Icon, EyeIcon, EyeOffIcon, MailIcon } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

import { getCurrentUser } from '../api/get-current-user';
import {
  ACTIVATED_QUERY_PARAM,
  DEFAULT_POST_LOGIN_PATH,
  PASSWORD_RESET_REQUEST_PATH,
  RESET_QUERY_PARAM,
} from '../constants';
import { CURRENT_USER_QUERY_KEY } from '../hooks/use-current-user';
import { useLogin } from '../hooks/use-login';
import { getStructuredLoginError, isInvalidCredentialsError } from '../lib/login-error';
import { resolveDefaultRoute } from '../lib/route-resolution';
import { type LoginFormValues, loginSchema } from '../schemas/login.schema';

import { AuthErrorAlert } from './auth-error-alert';
import { AuthLayout } from './auth-layout';
import { ItHelpdeskDialog } from './it-helpdesk-dialog';

import { PROTECTED_PATH_PREFIX } from '@/components/auth/protected-route';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
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
  const [helpOpen, setHelpOpen] = useState(false);

  // Strip ?activated=1 / ?reset=1 from visible URL once captured into props
  useEffect(() => {
    if (!initialActivated && !initialReset) {
      return;
    }
    const url = new URL(window.location.href);
    url.searchParams.delete(ACTIVATED_QUERY_PARAM);
    url.searchParams.delete(RESET_QUERY_PARAM);
    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
  }, [initialActivated, initialReset]);

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

  const isBusy = login.isPending || login.isSuccess;

  const onSubmit = (values: LoginFormValues) => {
    login.mutate(values, {
      onSuccess: () => {
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
            router.replace(PROTECTED_PATH_PREFIX);
          });
      },
      onError: (error) => {
        if (isInvalidCredentialsError(error)) {
          resetField('password');
          setFocus('password');
        }
      },
    });
  };

  const structuredError = login.isError ? getStructuredLoginError(login.error) : null;

  return (
    <>
      <AuthLayout
        badge="INSTITUTIONAL ACCESS"
        title="Sign in"
        description={
          <div className="space-y-0.5">
            <p className="text-foreground/90 text-xs font-semibold">
              Access your S.P.A.R.K. account
            </p>
            <p className="text-muted-foreground text-[11px]">
              HVPM College of Engineering and Technology
            </p>
          </div>
        }
        cardFooter={
          <div className="text-muted-foreground flex flex-col gap-1 text-[11px] sm:flex-row sm:items-center sm:justify-between">
            <span>Having trouble signing in?</span>
            <button
              type="button"
              onClick={() => setHelpOpen(true)}
              className="text-primary inline-flex cursor-pointer items-center self-start font-semibold underline-offset-3 hover:underline sm:self-auto"
            >
              Contact IT Helpdesk
            </button>
          </div>
        }
      >
        <form
          noValidate
          aria-busy={isBusy}
          onSubmit={(event) => {
            void handleSubmit(onSubmit)(event);
          }}
          className="space-y-4"
        >
          {/* Post-activation banner notice */}
          {initialActivated && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
              role="status"
              className="flex items-start gap-2.5 rounded-md border border-emerald-500/40 bg-emerald-500/10 p-3 text-xs text-emerald-950 dark:text-emerald-200"
            >
              <CheckCircle2Icon
                className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400"
                aria-hidden="true"
              />
              <div className="space-y-0.5">
                <p className="font-semibold">Account activated successfully</p>
                <p className="text-[11px] text-emerald-800 dark:text-emerald-300">
                  You can now sign in with your college email and configured password.
                </p>
              </div>
            </motion.div>
          )}

          {/* Post-password-reset banner notice */}
          {initialReset && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
              role="status"
              className="flex items-start gap-2.5 rounded-md border border-emerald-500/40 bg-emerald-500/10 p-3 text-xs text-emerald-950 dark:text-emerald-200"
            >
              <CheckCircle2Icon
                className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400"
                aria-hidden="true"
              />
              <div className="space-y-0.5">
                <p className="font-semibold">Password reset successfully</p>
                <p className="text-[11px] text-emerald-800 dark:text-emerald-300">
                  Your password has been updated. You can now sign in with your new credentials.
                </p>
              </div>
            </motion.div>
          )}

          {/* Compact Enterprise Error Alert with AnimatePresence */}
          <AnimatePresence mode="wait">
            {structuredError && (
              <motion.div
                key={structuredError.title}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2 }}
              >
                <AuthErrorAlert
                  title={structuredError.title}
                  description={structuredError.description}
                  action={structuredError.action}
                />
              </motion.div>
            )}
          </AnimatePresence>

          <FieldGroup className="gap-3.5">
            {/* College Email Field */}
            <Field data-invalid={Boolean(errors.email)} className="gap-1.5">
              <FieldLabel htmlFor="email" className="text-foreground text-xs font-medium">
                College email
              </FieldLabel>
              <InputGroup className="border-border/90 focus-within:ring-primary focus-within:border-primary h-11 rounded-md transition-all focus-within:ring-2">
                <InputGroupInput
                  id="email"
                  type="email"
                  inputMode="email"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  placeholder="name@hvpmcoet.in"
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby={errors.email ? 'email-error' : undefined}
                  className="h-full px-3 text-xs"
                  {...register('email')}
                />
                <InputGroupAddon align="inline-end" className="text-muted-foreground/70 pr-2.5">
                  <MailIcon className="size-3.5" aria-hidden="true" />
                </InputGroupAddon>
              </InputGroup>
              <FieldError id="email-error" errors={[errors.email]} />
            </Field>

            {/* Password Field with Inline Forgot Password Link */}
            <Field data-invalid={Boolean(errors.password)} className="gap-1.5">
              <div className="flex items-center justify-between">
                <FieldLabel htmlFor="password" className="text-foreground text-xs font-medium">
                  Password
                </FieldLabel>
                <Link
                  href={PASSWORD_RESET_REQUEST_PATH}
                  tabIndex={0}
                  className="text-primary focus-visible:ring-ring text-xs font-semibold underline-offset-3 hover:underline focus-visible:ring-1 focus-visible:outline-none"
                >
                  Forgot password?
                </Link>
              </div>
              <InputGroup className="border-border/90 focus-within:ring-primary focus-within:border-primary h-11 rounded-md transition-all focus-within:ring-2">
                <InputGroupInput
                  id="password"
                  type={isPasswordVisible ? 'text' : 'password'}
                  autoComplete="current-password"
                  aria-invalid={Boolean(errors.password)}
                  aria-describedby={errors.password ? 'password-error' : undefined}
                  className="h-full px-3 text-xs"
                  {...register('password')}
                />
                <InputGroupAddon align="inline-end">
                  <InputGroupButton
                    size="icon-xs"
                    type="button"
                    aria-label={isPasswordVisible ? 'Hide password' : 'Show password'}
                    aria-pressed={isPasswordVisible}
                    onClick={() => {
                      setIsPasswordVisible((visible) => !visible);
                    }}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    {isPasswordVisible ? (
                      <EyeOffIcon className="size-3.5" aria-hidden="true" />
                    ) : (
                      <EyeIcon className="size-3.5" aria-hidden="true" />
                    )}
                  </InputGroupButton>
                </InputGroupAddon>
              </InputGroup>
              <FieldError id="password-error" errors={[errors.password]} />
            </Field>

            {/* Primary Action Button */}
            <div className="pt-2">
              <Button
                type="submit"
                disabled={isBusy}
                className="bg-primary text-primary-foreground flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-md text-xs font-semibold shadow-xs transition-colors hover:bg-[#115EA3] active:bg-[#0C4A80] disabled:cursor-not-allowed disabled:opacity-65"
              >
                {isBusy ? (
                  <>
                    <Spinner data-icon="inline-start" className="size-3.5" aria-hidden="true" />
                    <span>Signing in…</span>
                  </>
                ) : (
                  <>
                    <span>Sign in</span>
                    <ArrowRightIcon className="size-3.5" aria-hidden="true" />
                  </>
                )}
              </Button>
            </div>
          </FieldGroup>
        </form>
      </AuthLayout>

      <ItHelpdeskDialog open={helpOpen} onOpenChange={setHelpOpen} />
    </>
  );
}
