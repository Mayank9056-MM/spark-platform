'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircleIcon, EyeIcon, EyeOffIcon, KeyRoundIcon, ShieldAlertIcon } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { LOGIN_PATH, PASSWORD_RESET_REQUEST_PATH, RESET_QUERY_PARAM } from '../constants';
import { useConfirmPasswordReset } from '../hooks/use-confirm-password-reset';
import {
  getPasswordResetConfirmErrorMessage,
  isInvalidResetTokenError,
} from '../lib/password-reset-error';
import {
  type PasswordResetConfirmFormValues,
  passwordResetConfirmFormSchema,
} from '../schemas/password-reset.schema';

import { AuthErrorAlert } from './auth-error-alert';
import { AuthLayout, AuthMessageCard } from './auth-layout';

import { Button } from '@/components/ui/button';
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
      <AuthLayout
        badge="CREDENTIAL RESET"
        title="Invalid reset link"
        description={
          <div className="space-y-0.5">
            <p className="text-foreground/90 text-xs font-semibold">Missing security token</p>
            <p className="text-muted-foreground text-[11px]">
              HVPM College of Engineering and Technology
            </p>
          </div>
        }
        cardFooter={
          <div className="text-muted-foreground text-center text-xs">
            <Link
              href={LOGIN_PATH}
              className="text-primary font-semibold underline-offset-3 hover:underline"
            >
              Back to sign in
            </Link>
          </div>
        }
      >
        <AuthMessageCard
          icon={AlertCircleIcon}
          variant="destructive"
          title="Missing reset token"
          action={
            <Button
              render={<Link href={PASSWORD_RESET_REQUEST_PATH} />}
              className="bg-primary text-primary-foreground h-10 w-full cursor-pointer rounded-md text-xs font-semibold hover:bg-[#115EA3]"
            >
              Request New Reset Link
            </Button>
          }
        >
          This link is missing its reset token. Please open the link from your password reset email
          again, or request a new one below.
        </AuthMessageCard>
      </AuthLayout>
    );
  }

  return <ConfirmPasswordForm token={token} />;
}

function ConfirmPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const confirm = useConfirmPasswordReset();
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);

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
      <AuthLayout
        badge="CREDENTIAL RESET"
        title="Reset link expired"
        description={
          <div className="space-y-0.5">
            <p className="text-foreground/90 text-xs font-semibold">Token expired or invalid</p>
            <p className="text-muted-foreground text-[11px]">
              HVPM College of Engineering and Technology
            </p>
          </div>
        }
        cardFooter={
          <div className="text-muted-foreground text-center text-xs">
            <Link
              href={LOGIN_PATH}
              className="text-primary font-semibold underline-offset-3 hover:underline"
            >
              Back to sign in
            </Link>
          </div>
        }
      >
        <AuthMessageCard
          icon={ShieldAlertIcon}
          variant="destructive"
          title="Password reset link expired or used"
          action={
            <Button
              render={<Link href={PASSWORD_RESET_REQUEST_PATH} />}
              className="bg-primary text-primary-foreground h-10 w-full cursor-pointer rounded-md text-xs font-semibold hover:bg-[#115EA3]"
            >
              Request New Reset Link
            </Button>
          }
        >
          This password reset link is invalid, has expired, or has already been used. Please request
          a new one and try again.
        </AuthMessageCard>
      </AuthLayout>
    );
  }

  const isBusy = confirm.isPending || confirm.isSuccess;

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
    <AuthLayout
      badge="CREDENTIAL RESET"
      title="Set new password"
      description={
        <div className="space-y-0.5">
          <p className="text-foreground/90 text-xs font-semibold">
            Configure your institutional password
          </p>
          <p className="text-muted-foreground text-[11px]">
            HVPM College of Engineering and Technology
          </p>
        </div>
      }
      cardFooter={
        <div className="text-muted-foreground text-center text-xs">
          <Link
            href={LOGIN_PATH}
            className="text-primary font-semibold underline-offset-3 hover:underline"
          >
            Cancel and back to sign in
          </Link>
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
        <AnimatePresence mode="wait">
          {confirm.isError && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
            >
              <AuthErrorAlert
                title="Couldn't reset your password"
                description={getPasswordResetConfirmErrorMessage(confirm.error)}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <FieldGroup className="gap-3.5">
          {/* New Password */}
          <Field data-invalid={Boolean(errors.password)} className="gap-1.5">
            <FieldLabel htmlFor="password" className="text-foreground text-xs font-medium">
              New Password
            </FieldLabel>
            <InputGroup className="border-border/90 focus-within:ring-primary focus-within:border-primary h-11 rounded-md transition-all focus-within:ring-2">
              <InputGroupInput
                id="password"
                type={isPasswordVisible ? 'text' : 'password'}
                autoComplete="new-password"
                aria-invalid={Boolean(errors.password)}
                aria-describedby={errors.password ? 'password-error' : 'password-help'}
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

            <FieldDescription
              id="password-help"
              className="text-muted-foreground flex items-start gap-1.5 pt-0.5 text-[11px] leading-normal"
            >
              <KeyRoundIcon
                className="text-muted-foreground/80 mt-0.5 size-3.5 shrink-0"
                aria-hidden="true"
              />
              <span>
                At least 10 characters, with an uppercase letter, lowercase letter, and digit.
              </span>
            </FieldDescription>

            <FieldError id="password-error" errors={[errors.password]} />
          </Field>

          {/* Confirm Password */}
          <Field data-invalid={Boolean(errors.confirmPassword)} className="gap-1.5">
            <FieldLabel htmlFor="confirmPassword" className="text-foreground text-xs font-medium">
              Confirm New Password
            </FieldLabel>
            <InputGroup className="border-border/90 focus-within:ring-primary focus-within:border-primary h-11 rounded-md transition-all focus-within:ring-2">
              <InputGroupInput
                id="confirmPassword"
                type={isConfirmPasswordVisible ? 'text' : 'password'}
                autoComplete="new-password"
                aria-invalid={Boolean(errors.confirmPassword)}
                aria-describedby={errors.confirmPassword ? 'confirm-password-error' : undefined}
                className="h-full px-3 text-xs"
                {...register('confirmPassword')}
              />
              <InputGroupAddon align="inline-end">
                <InputGroupButton
                  size="icon-xs"
                  type="button"
                  aria-label={
                    isConfirmPasswordVisible ? 'Hide confirm password' : 'Show confirm password'
                  }
                  aria-pressed={isConfirmPasswordVisible}
                  onClick={() => {
                    setIsConfirmPasswordVisible((visible) => !visible);
                  }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {isConfirmPasswordVisible ? (
                    <EyeOffIcon className="size-3.5" aria-hidden="true" />
                  ) : (
                    <EyeIcon className="size-3.5" aria-hidden="true" />
                  )}
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
            <FieldError id="confirm-password-error" errors={[errors.confirmPassword]} />
          </Field>

          {/* Submit Button */}
          <div className="pt-2">
            <Button
              type="submit"
              disabled={isBusy}
              className="bg-primary text-primary-foreground flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-md text-xs font-semibold shadow-xs transition-colors hover:bg-[#115EA3] active:bg-[#0C4A80] disabled:cursor-not-allowed disabled:opacity-65"
            >
              {isBusy ? (
                <>
                  <Spinner data-icon="inline-start" className="size-3.5" aria-hidden="true" />
                  <span>Resetting password…</span>
                </>
              ) : (
                <span>Reset password</span>
              )}
            </Button>
          </div>
        </FieldGroup>
      </form>
    </AuthLayout>
  );
}
