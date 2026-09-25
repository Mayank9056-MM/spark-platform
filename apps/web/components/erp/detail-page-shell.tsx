'use client';

import {
  ArrowLeftIcon,
  DownloadIcon,
  EditIcon,
  MoreHorizontalIcon,
  PrinterIcon,
} from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export interface DetailField {
  label: string;
  value: React.ReactNode;
  span?: 1 | 2;
}

export interface DetailSection {
  title: string;
  fields: readonly DetailField[];
}

export interface DetailPageShellProps {
  title: string;
  subtitle?: string;
  status?: string;
  backHref: string;
  backLabel?: string;
  tabs: readonly {
    id: string;
    label: string;
    sections: readonly DetailSection[];
  }[];
  actions?: React.ReactNode;
}

/**
 * Enterprise Card / Detail Page pattern inspired by Microsoft Dynamics 365 Business Central.
 * Features:
 * - Back link to list
 * - Record identity header with status badges and action commands
 * - Enterprise tabbed navigation
 * - Dense two-column key-value field inspection groups
 */
export function DetailPageShell({
  title,
  subtitle,
  status = 'Active',
  backHref,
  backLabel = 'Back to list',
  tabs,
  actions,
}: DetailPageShellProps) {
  const defaultTab = tabs[0]?.id ?? 'overview';

  return (
    <div className="flex flex-col gap-5">
      {/* 1. Header Navigation & Record Title */}
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
                {status}
              </Badge>
            </div>
            {subtitle && (
              <p className="text-muted-foreground text-xs leading-relaxed">{subtitle}</p>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-2 self-start sm:self-auto">
            {actions ?? (
              <>
                <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                  <PrinterIcon className="size-3.5" />
                  <span className="hidden sm:inline">Print</span>
                </Button>
                <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                  <DownloadIcon className="size-3.5" />
                  <span className="hidden sm:inline">Export</span>
                </Button>
                <Button size="sm" className="h-8 gap-1.5 text-xs">
                  <EditIcon className="size-3.5" />
                  <span>Edit Record</span>
                </Button>
                <Button variant="ghost" size="icon-sm" className="size-8" aria-label="More actions">
                  <MoreHorizontalIcon className="size-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 2. Structured Tabs & Key-Value Field Groups */}
      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList className="mb-4 h-9">
          {tabs.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id} className="px-3 text-xs">
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {tabs.map((tab) => (
          <TabsContent key={tab.id} value={tab.id} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {tab.sections.map((section, sIdx) => (
                <Card key={sIdx} className="border-border/80 bg-card rounded-lg border shadow-xs">
                  <CardHeader className="border-border/70 border-b pb-3">
                    <CardTitle className="text-muted-foreground font-mono text-xs font-bold tracking-wider uppercase">
                      {section.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <dl className="grid grid-cols-1 gap-x-4 gap-y-3 text-xs sm:grid-cols-2">
                      {section.fields.map((field, fIdx) => (
                        <div
                          key={fIdx}
                          className={field.span === 2 ? 'space-y-1 sm:col-span-2' : 'space-y-1'}
                        >
                          <dt className="text-muted-foreground text-[11px] font-medium">
                            {field.label}
                          </dt>
                          <dd className="text-foreground text-xs font-semibold">
                            {field.value ?? '—'}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
