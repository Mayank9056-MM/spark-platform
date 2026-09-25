'use client';

import { AlertCircleIcon } from 'lucide-react';

import { HvpmLogo } from './hvpm-logo';

import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

interface AuthResolutionShellProps {
  status: 'pending' | 'error';
  onRetry?: () => void;
}

/**
 * Neutral, content-free stand-in for the login page while GET /auth/me
 * is unresolved, or has genuinely failed (5xx/network). Deliberately
 * carries no authentication marketing copy, no email/password fields,
 * no "Sign in" heading, no "Forgot password?" link — nothing a visitor
 * could mistake for the real login form, and nothing an authenticated
 * visitor sees before their redirect fires.
 *
 * Two states only. A confirmed-401 never reaches this component — that
 * branch renders LoginForm directly (see AuthResolutionBoundary).
 */
export function AuthResolutionShell({ status, onRetry }: AuthResolutionShellProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex w-full max-w-sm flex-col items-center gap-4 p-6 text-center"
    >
      <HvpmLogo size="mobile" className="h-8 w-auto shrink-0" priority />

      {status === 'pending' ? (
        <>
          <Spinner aria-hidden="true" className="text-primary size-5" />
          <p className="text-muted-foreground text-xs font-medium">Checking your session…</p>
        </>
      ) : (
        <>
          <AlertCircleIcon className="text-destructive size-5" aria-hidden="true" />
          <div className="space-y-1">
            <p className="text-foreground text-xs font-semibold">
              Couldn&apos;t confirm your session
            </p>
            <p className="text-muted-foreground text-[11px]">
              Check your connection and try again.
            </p>
          </div>
          {onRetry !== undefined && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={onRetry}
            >
              Retry
            </Button>
          )}
        </>
      )}
    </div>
  );
}
