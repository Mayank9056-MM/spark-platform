'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  AlertCircleIcon,
  CheckCircle2Icon,
  EyeIcon,
  EyeOffIcon,
  KeyRoundIcon,
  ShieldAlertIcon,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { LOGIN_PATH } from '../constants';
import { useActivateAccount } from '../hooks/use-activate-account';
import { getActivateErrorMessage, isInvalidActivationTokenError } from '../lib/activate-error';
import { type ActivateFormValues, activateFormSchema } from '../schemas/activate.schema';

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

interface ActivateFormProps {
  /** Raw token from the email link, or undefined when the URL had none. */
  token: string | undefined;
}

export function ActivateForm({ token }: ActivateFormProps) {
  if (token === undefined) {
    return (
      <AuthLayout
        badge="ACCOUNT ACTIVATION"
        title="Invalid activation link"
        description={
          <div className="space-y-0.5">
            <p className="text-foreground/90 text-xs font-semibold">Missing security credentials</p>
            <p className="text-muted-foreground text-[11px]">
              HVPM College of Engineering and Technology
            </p>
          </div>
        }
      >
        <AuthMessageCard
          icon={AlertCircleIcon}
          variant="destructive"
          title="Missing activation token"
          action={<GoToLoginButton variant="outline" />}
        >
          This link is missing its activation token. Please open the complete link from your
          activation email again, or contact your college administrator for assistance.
        </AuthMessageCard>
      </AuthLayout>
    );
  }

  return <ActivatePasswordForm token={token} />;
}

function ActivatePasswordForm({ token }: { token: string }) {
  const activate = useActivateAccount();
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);

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
      <AuthLayout
        badge="ACCOUNT ACTIVATION"
        title="Account activated"
        description={
          <div className="space-y-0.5">
            <p className="text-foreground/90 text-xs font-semibold">
              Institutional access established
            </p>
            <p className="text-muted-foreground text-[11px]">
              HVPM College of Engineering and Technology
            </p>
          </div>
        }
      >
        <AuthMessageCard
          icon={CheckCircle2Icon}
          variant="success"
          title="Account activated successfully"
          action={<GoToLoginButton />}
        >
          Your account was activated successfully. You can now sign in with your email address and
          the new password you just configured.
        </AuthMessageCard>
      </AuthLayout>
    );
  }

  if (activate.isError && isInvalidActivationTokenError(activate.error)) {
    return (
      <AuthLayout
        badge="ACCOUNT ACTIVATION"
        title="Activation link expired"
        description={
          <div className="space-y-0.5">
            <p className="text-foreground/90 text-xs font-semibold">Token expired or invalid</p>
            <p className="text-muted-foreground text-[11px]">
              HVPM College of Engineering and Technology
            </p>
          </div>
        }
      >
        <AuthMessageCard
          icon={ShieldAlertIcon}
          variant="destructive"
          title="Activation link expired or already used"
          action={<GoToLoginButton variant="outline" />}
        >
          This activation link is invalid, has expired, or has already been used. If you have
          already activated your account, you can proceed directly to sign in. Otherwise, contact
          your college administrator to issue a new activation link.
        </AuthMessageCard>
      </AuthLayout>
    );
  }

  const isBusy = activate.isPending;

  const onSubmit = (values: ActivateFormValues) => {
    activate.mutate(
      { token, password: values.password },
      {
        onSuccess: () => {
          reset();
        },
      },
    );
  };

  return (
    <AuthLayout
      badge="ACCOUNT ACTIVATION"
      title="Activate your account"
      description={
        <div className="space-y-0.5">
          <p className="text-foreground/90 text-xs font-semibold">
            Set your institutional password
          </p>
          <p className="text-muted-foreground text-[11px]">
            HVPM College of Engineering and Technology
          </p>
        </div>
      }
      cardFooter={
        <div className="text-muted-foreground flex items-center justify-between text-xs">
          <span>Already activated your account?</span>
          <Link
            href={LOGIN_PATH}
            className="text-primary font-semibold underline-offset-3 hover:underline"
          >
            Sign in
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
          {activate.isError && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
            >
              <AuthErrorAlert
                title="Couldn't activate your account"
                description={getActivateErrorMessage(activate.error)}
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
              Confirm Password
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
                  <span>Activating account…</span>
                </>
              ) : (
                <span>Activate account</span>
              )}
            </Button>
          </div>
        </FieldGroup>
      </form>
    </AuthLayout>
  );
}

function GoToLoginButton({ variant }: { variant?: 'outline' }) {
  const router = useRouter();

  return (
    <Button
      type="button"
      className="h-10 w-full cursor-pointer rounded-md text-xs font-semibold"
      {...(variant !== undefined
        ? { variant }
        : {
            className:
              'w-full h-10 font-semibold text-xs rounded-md bg-primary text-primary-foreground hover:bg-[#115EA3]',
          })}
      onClick={() => {
        router.push(LOGIN_PATH);
      }}
    >
      Proceed to Sign In
    </Button>
  );
}
