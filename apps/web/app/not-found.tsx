import { ArrowLeftIcon, FileQuestionIcon, HomeIcon } from 'lucide-react';
import { type Metadata } from 'next';
import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { HvpmLogo } from '@/features/auth';

export const metadata: Metadata = {
  title: 'Page Not Found | S.P.A.R.K. College ERP',
  robots: { index: false, follow: false },
};

export default function NotFound() {
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
            <div className="bg-primary/10 text-primary border-primary/20 mx-auto mb-3 flex size-12 items-center justify-center rounded-full border">
              <FileQuestionIcon className="size-6" aria-hidden="true" />
            </div>
            <div className="space-y-1">
              <span className="text-primary font-mono text-[11px] font-bold tracking-widest uppercase">
                Error 404
              </span>
              <CardTitle className="text-foreground text-lg font-bold">Page not found</CardTitle>
            </div>
            <CardDescription className="text-muted-foreground mt-1 text-xs leading-relaxed">
              The page you are looking for doesn&apos;t exist, is no longer accessible, or has been
              moved to another section.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 pt-2 text-center">
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                className="h-9 flex-1 gap-2 text-xs font-medium"
                render={<Link href="/app" />}
              >
                <HomeIcon className="size-3.5" aria-hidden="true" />
                <span>Return to dashboard</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-9 flex-1 gap-2 text-xs font-medium"
                render={<Link href="/login" />}
              >
                <ArrowLeftIcon className="size-3.5" aria-hidden="true" />
                <span>Sign in</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        <p className="text-muted-foreground text-center text-[11px]">
          HVPM College of Engineering &amp; Technology, Amravati
        </p>
      </div>
    </main>
  );
}
