'use client';

import { ArrowRightIcon } from 'lucide-react';
import Link from 'next/link';

import type { DashboardSection } from '../config/dashboard-sections';

import { PermissionGuard } from '@/components/auth/permission-guard';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';

interface DashboardSectionCardProps {
  section: DashboardSection;
}

/**
 * One dashboard module card. Always renders the confirmed-empty state
 * ("No data available yet") — no metrics API exists yet for any of
 * these resources, so nothing here is fabricated.
 *
 * Deliberately does NOT render an action button yet (see
 * `actionPermission`/`actionLabel` on DashboardSection): there is no
 * corresponding create route/flow in the frontend for admissions,
 * timetable entries, faculty assignments, or promotion batches today.
 * A button with no destination would be dead UI, which is its own kind
 * of fabrication. The fields stay on the config as forward-looking
 * metadata for when those flows exist — wiring them in is a one-line
 * change here, not a redesign.
 */
export function DashboardSectionCard({ section }: DashboardSectionCardProps) {
  const Icon = section.icon;

  return (
    <Card className="border-border/80 bg-card hover:border-primary/40 flex flex-col justify-between rounded-lg border shadow-xs transition-all duration-200 hover:shadow-sm">
      <CardHeader className="space-y-2 pb-3">
        <div className="flex items-start gap-3">
          <div className="border-primary/20 bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-md border">
            <Icon aria-hidden="true" className="size-4" />
          </div>
          <div className="min-w-0 space-y-0.5">
            <CardTitle className="text-foreground truncate text-sm font-semibold">
              {section.title}
            </CardTitle>
            <CardDescription className="text-muted-foreground line-clamp-2 text-xs leading-snug">
              {section.description}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="py-2">
        <Empty className="border-border/60 bg-muted/20 border py-4">
          <EmptyHeader className="space-y-1">
            <EmptyMedia variant="icon" className="bg-muted/60 text-muted-foreground size-7">
              <Icon aria-hidden="true" className="size-3.5" />
            </EmptyMedia>
            <EmptyTitle className="text-foreground text-xs font-medium">
              No live records yet
            </EmptyTitle>
            <EmptyDescription className="text-muted-foreground text-[11px]">
              Module will populate as campus records are submitted.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </CardContent>
      {(section.href !== undefined || section.actionHref !== undefined) && (
        <CardFooter className="border-border/60 flex items-center justify-between border-t pt-3 pb-3">
          {section.href !== undefined ? (
            <Button
              variant="outline"
              size="sm"
              className="text-foreground hover:border-primary/50 hover:text-primary h-8 gap-1.5 text-xs font-medium"
              render={<Link href={section.href} />}
            >
              <span>Open Module</span>
              <ArrowRightIcon className="size-3" aria-hidden="true" />
            </Button>
          ) : (
            <span />
          )}
          {section.actionHref !== undefined && section.actionPermission !== undefined && (
            <PermissionGuard require={section.actionPermission}>
              <Button
                size="sm"
                className="h-8 text-xs font-medium"
                render={<Link href={section.actionHref} />}
              >
                {section.actionLabel}
              </Button>
            </PermissionGuard>
          )}
        </CardFooter>
      )}
    </Card>
  );
}
