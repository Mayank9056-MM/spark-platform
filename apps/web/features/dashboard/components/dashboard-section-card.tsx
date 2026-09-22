'use client';

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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon aria-hidden="true" className="size-4" />
          {section.title}
        </CardTitle>
        <CardDescription>{section.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Icon aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>No data available yet</EmptyTitle>
            <EmptyDescription>This module isn&apos;t connected to live data yet.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </CardContent>
      {(section.href !== undefined || section.actionHref !== undefined) && (
        <CardFooter className="justify-between">
          {section.href !== undefined && (
            <Button variant="link" size="sm" className="px-0" render={<Link href={section.href} />}>
              View
            </Button>
          )}
          {section.actionHref !== undefined && section.actionPermission !== undefined && (
            <PermissionGuard require={section.actionPermission}>
              <Button size="sm" render={<Link href={section.actionHref} />}>
                {section.actionLabel}
              </Button>
            </PermissionGuard>
          )}
        </CardFooter>
      )}
    </Card>
  );
}
