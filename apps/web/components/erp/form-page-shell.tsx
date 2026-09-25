'use client';

import { ArrowLeftIcon, CheckIcon, XIcon } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export interface FormPageShellProps {
  title: string;
  subtitle?: string;
  badge?: string;
  backHref: string;
  backLabel?: string;
  isSubmitting?: boolean;
  onSubmit?: (e: React.FormEvent) => void;
  children: React.ReactNode;
}

/**
 * Enterprise Document / Form Page pattern inspired by Microsoft Dynamics 365 Business Central.
 * Features:
 * - Back link to list
 * - Header with Save and Cancel actions
 * - Grouped field sections with clean enterprise spacing and validation styling
 */
export function FormPageShell({
  title,
  subtitle,
  badge = 'Draft',
  backHref,
  backLabel = 'Cancel and return',
  isSubmitting = false,
  onSubmit,
  children,
}: FormPageShellProps) {
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      {/* 1. Header Navigation & Form Title */}
      <div className="flex flex-col gap-3">
        <Link
          href={backHref}
          className="text-muted-foreground hover:text-foreground inline-flex w-fit items-center gap-1.5 text-xs transition-colors"
        >
          <ArrowLeftIcon className="size-3.5" aria-hidden="true" />
          <span>{backLabel}</span>
        </Link>

        <div className="border-border/70 flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <h1 className="text-foreground font-heading text-xl font-bold tracking-tight sm:text-2xl">
                {title}
              </h1>
              <Badge
                variant="outline"
                className="border-primary/30 text-primary font-mono text-[11px] uppercase"
              >
                {badge}
              </Badge>
            </div>
            {subtitle && (
              <p className="text-muted-foreground text-xs leading-relaxed">{subtitle}</p>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-2 self-start sm:self-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              render={<Link href={backHref} />}
            >
              <XIcon className="size-3.5" />
              <span>Cancel</span>
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="h-8 gap-1.5 text-xs font-semibold"
            >
              <CheckIcon className="size-3.5" />
              <span>{isSubmitting ? 'Saving...' : 'Save & Submit'}</span>
            </Button>
          </div>
        </div>
      </div>

      {/* 2. Form Body */}
      <div className="flex max-w-4xl flex-col gap-5">{children}</div>
    </form>
  );
}
