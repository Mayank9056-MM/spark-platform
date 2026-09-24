'use client';

import { AlertCircleIcon, ClockIcon, TriangleAlertIcon } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export type AuthErrorVariant = 'error' | 'warning' | 'info';

export interface AuthErrorAlertProps {
  /** Main notification heading */
  title: string;
  /** Explanatory or instructional body text */
  description?: ReactNode;
  /** Visual severity level */
  variant?: AuthErrorVariant;
  /** Optional icon override */
  icon?: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  /** Optional action button or link */
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  className?: string;
}

/**
 * Compact Enterprise Notification Pattern for S.P.A.R.K. Authentication.
 *
 * Implements Microsoft Fluent-style message bars:
 * - Controlled compact elevation.
 * - Semantic border and background with accessible contrast (WCAG AA).
 * - Icon + Title + Supporting guidance layout.
 * - Preserves form hierarchy without dominating the viewport.
 */
export function AuthErrorAlert({
  title,
  description,
  variant = 'error',
  icon: CustomIcon,
  action,
  className,
}: AuthErrorAlertProps) {
  const IconComponent =
    CustomIcon ??
    (variant === 'warning' ? ClockIcon : variant === 'info' ? AlertCircleIcon : TriangleAlertIcon);

  return (
    <div
      role="alert"
      aria-live="polite"
      className={cn(
        'rounded-md border p-3 text-xs leading-relaxed transition-colors',
        variant === 'error' &&
          'dark:border-destructive/40 dark:bg-destructive/15 dark:text-destructive-foreground border-[#F4A7A9] bg-[#FDF3F3] text-[#7A1D20]',
        variant === 'warning' &&
          'border-[#F9D0A8] bg-[#FDF7F2] text-[#8A3A05] dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-200',
        variant === 'info' &&
          'border-[#B0D3F5] bg-[#F0F6FC] text-[#0B487A] dark:border-blue-500/40 dark:bg-blue-500/15 dark:text-blue-200',
        className,
      )}
    >
      <div className="flex items-start gap-2.5">
        <div className="mt-0.5 shrink-0">
          <IconComponent
            className={cn(
              'size-4',
              variant === 'error' && 'text-[#D13438] dark:text-red-400',
              variant === 'warning' && 'text-[#F7630C] dark:text-amber-400',
              variant === 'info' && 'text-[#0F6CBD] dark:text-blue-400',
            )}
            aria-hidden={true}
          />
        </div>

        <div className="flex-1 space-y-1">
          <p className="text-foreground/95 font-semibold tracking-tight">{title}</p>
          {description && (
            <div className="text-muted-foreground/90 text-[11px] leading-normal">{description}</div>
          )}
          {action && (
            <div className="pt-1">
              {action.href ? (
                <Link
                  href={action.href}
                  className="text-primary inline-flex items-center text-xs font-semibold underline-offset-3 hover:underline"
                >
                  {action.label} →
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={action.onClick}
                  className="text-primary inline-flex cursor-pointer items-center text-xs font-semibold underline-offset-3 hover:underline"
                >
                  {action.label} →
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
