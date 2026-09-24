'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRightIcon, MailIcon } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';

import { LOGIN_PATH } from '../constants';
import { useRequestPasswordReset } from '../hooks/use-request-password-reset';
import { getPasswordResetRequestErrorMessage } from '../lib/password-reset-error';
import {
  type PasswordResetRequestValues,
  passwordResetRequestSchema,
} from '../schemas/password-reset.schema';

import { AuthErrorAlert } from './auth-error-alert';
import { AuthLayout, AuthMessageCard } from './auth-layout';

import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
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
      <AuthLayout
        badge="PASSWORD RECOVERY"
        title="Check your email"
        description={
          <div className="space-y-0.5">
            <p className="text-foreground/90 text-xs font-semibold">
              Recovery instructions dispatched
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
              Back to sign in
            </Link>
          </div>
        }
      >
        <AuthMessageCard
          icon={MailIcon}
          variant="success"
          title="Reset instructions sent"
          action={
            <Button
              render={<Link href={LOGIN_PATH} />}
              className="bg-primary text-primary-foreground h-10 w-full cursor-pointer rounded-md text-xs font-semibold hover:bg-[#115EA3]"
            >
              Return to Sign In
            </Button>
          }
        >
          If an account exists for this email address in the institutional directory, you will
          receive password recovery instructions shortly. Please check your inbox and junk/spam
          folders.
        </AuthMessageCard>
      </AuthLayout>
    );
  }

  const isBusy = request.isPending;

  const onSubmit = (values: PasswordResetRequestValues) => {
    request.mutate(values);
  };

  return (
    <AuthLayout
      badge="PASSWORD RECOVERY"
      title="Reset your password"
      description={
        <div className="space-y-0.5">
          <p className="text-foreground/90 text-xs font-semibold">
            Recover institutional ERP access
          </p>
          <p className="text-muted-foreground text-[11px]">
            HVPM College of Engineering and Technology
          </p>
        </div>
      }
      cardFooter={
        <div className="text-muted-foreground text-center text-xs">
          <span>Remember your password? </span>
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
          {request.isError && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
            >
              <AuthErrorAlert
                title="Couldn't send the reset email"
                description={getPasswordResetRequestErrorMessage(request.error)}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <FieldGroup className="gap-3.5">
          {/* Email Address */}
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
                  <span>Sending reset link…</span>
                </>
              ) : (
                <>
                  <span>Send reset link</span>
                  <ArrowRightIcon className="size-3.5" aria-hidden="true" />
                </>
              )}
            </Button>
          </div>
        </FieldGroup>
      </form>
    </AuthLayout>
  );
}
