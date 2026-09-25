'use client';

import { AlertTriangleIcon, ArrowLeftIcon, RefreshCwIcon } from 'lucide-react';
import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { HvpmLogo } from '@/features/auth';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  return (
    <main className="bg-background text-foreground flex min-h-screen flex-1 flex-col items-center justify-center p-4 sm:p-6">
      {/* Background architectural grid */}
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_20%,#000_60%,transparent_100%)] bg-[size:3.5rem_3.5rem] opacity-[0.25] dark:opacity-[0.15]"
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-md space-y-6">
        {/* Institutional S.P.A.R.K. Header */}
        <div className="flex items-center justify-center gap-2.5">
          <HvpmLogo size="mobile" className="h-8 w-auto shrink-0" priority />
          <div className="flex items-center gap-2">
            <span className="font-heading text-foreground text-lg font-bold tracking-wider">
              S.P.A.R.K.
            </span>
            <Badge
              variant="outline"
              className="border-primary/30 text-primary h-4 px-1 py-0 font-mono text-[9px] uppercase"
            >
              College ERP
            </Badge>
          </div>
        </div>

        <Card className="border-border bg-card rounded-lg border shadow-sm">
          <CardHeader className="pb-3 text-center">
            <div className="bg-destructive/10 text-destructive border-destructive/20 mx-auto mb-3 flex size-12 items-center justify-center rounded-full border">
              <AlertTriangleIcon className="size-6" aria-hidden="true" />
            </div>
            <CardTitle className="text-foreground text-lg font-bold">
              Something went wrong
            </CardTitle>
            <CardDescription className="text-muted-foreground text-xs leading-relaxed">
              We couldn&apos;t complete this request. An unexpected issue occurred within the
              platform.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 text-center">
            {/* error.message is never shown to end-users to prevent information disclosure */}
            {error.digest !== undefined && (
              <div className="border-border/80 bg-muted/30 rounded-md border px-3 py-1.5 text-center">
                <span className="text-muted-foreground font-mono text-[11px]">
                  Reference ID: {error.digest}
                </span>
              </div>
            )}

            <div className="flex flex-col gap-2 pt-1 sm:flex-row">
              <Button
                type="button"
                className="h-9 flex-1 gap-2 text-xs font-medium"
                onClick={reset}
              >
                <RefreshCwIcon className="size-3.5" aria-hidden="true" />
                <span>Try again</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-9 flex-1 gap-2 text-xs font-medium"
                render={<Link href="/app" />}
              >
                <ArrowLeftIcon className="size-3.5" aria-hidden="true" />
                <span>Dashboard</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        <p className="text-muted-foreground text-center text-[11px]">
          HVPM College of Engineering &amp; Technology • IT Systems Support
        </p>
      </div>
    </main>
  );
}
