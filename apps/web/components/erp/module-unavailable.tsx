import { ArrowLeftIcon, LockIcon, ShieldCheckIcon } from 'lucide-react';
import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';

interface ModuleUnavailableProps {
  title: string;
}

/**
 * For modules with no backend authorization resource at all (Faculty
 * today). Deliberately unguarded by role or permission — there is
 * nothing valid to check — and never renders any data, since none can
 * be safely scoped without backend support.
 */
export function ModuleUnavailable({ title }: ModuleUnavailableProps) {
  return (
    <div className="flex flex-col gap-5">
      <div className="border-border/70 flex items-center justify-between border-b pb-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <h1 className="text-foreground font-heading text-lg font-bold tracking-tight sm:text-xl">
              {title}
            </h1>
            <Badge
              variant="outline"
              className="border-amber-500/30 font-mono text-[10px] text-amber-600 uppercase dark:text-amber-400"
            >
              Access Restricted
            </Badge>
          </div>
          <p className="text-muted-foreground text-xs">
            Operational boundary under institutional governance
          </p>
        </div>
      </div>

      <div className="py-8">
        <Empty className="border-border/80 bg-card mx-auto max-w-lg rounded-lg border p-8 shadow-xs">
          <EmptyHeader className="space-y-2">
            <EmptyMedia
              variant="icon"
              className="mx-auto size-12 rounded-full border border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400"
            >
              <LockIcon aria-hidden="true" className="size-6" />
            </EmptyMedia>
            <EmptyTitle className="text-foreground text-base font-semibold">
              Module Governance Boundary
            </EmptyTitle>
            <EmptyDescription className="text-muted-foreground text-xs leading-relaxed">
              The institutional authorization model does not currently define scope rules for the{' '}
              {title} module. Access will activate once authorization policies are provisioned in
              the backend.
            </EmptyDescription>
            <div className="flex items-center justify-center gap-2 pt-4">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs"
                render={<Link href="/app/dashboard" />}
              >
                <ArrowLeftIcon className="size-3.5" aria-hidden="true" />
                <span>Return to Role Center</span>
              </Button>
            </div>
            <div className="text-muted-foreground/80 flex items-center justify-center gap-1.5 pt-2 text-[11px]">
              <ShieldCheckIcon className="text-primary size-3" aria-hidden="true" />
              <span>HVPM Security Framework</span>
            </div>
          </EmptyHeader>
        </Empty>
      </div>
    </div>
  );
}
