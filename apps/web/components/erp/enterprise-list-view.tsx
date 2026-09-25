'use client';

import {
  ChevronLeftIcon,
  ChevronRightIcon,
  DownloadIcon,
  FilterIcon,
  RefreshCwIcon,
  SearchIcon,
  SlidersHorizontalIcon,
} from 'lucide-react';
import * as React from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export interface ColumnDefinition {
  header: string;
  className?: string;
}

export interface EnterpriseListViewProps {
  title: string;
  description: string;
  resourceName: string;
  columns: readonly ColumnDefinition[];
  actions?: React.ReactNode;
  defaultViews?: readonly string[];
}

/**
 * Enterprise List Page pattern inspired by Microsoft Dynamics 365 Business Central.
 * Features:
 * - Page Header with Title, Description, and Actions
 * - Enterprise Command Bar: Search input, Filter toggle, View tabs
 * - Dense Enterprise Data Table with Column Headers
 * - Honest Empty State for pending API connections (never fabricated rows)
 * - Enterprise Pagination Footer (Showing X of Y, Page selector)
 */
export function EnterpriseListView({
  title,
  description,
  resourceName,
  columns,
  actions,
  defaultViews = ['All Records', 'Active', 'Pending Sync'],
}: EnterpriseListViewProps) {
  const [activeView, setActiveView] = React.useState(defaultViews[0] ?? 'All Records');
  const [searchQuery, setSearchQuery] = React.useState('');

  return (
    <div className="flex flex-col gap-4">
      {/* 1. Page Header with Action Bar */}
      <div className="border-border/70 flex flex-col gap-3 border-b pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <h1 className="text-foreground font-heading text-lg font-bold tracking-tight sm:text-xl">
              {title}
            </h1>
            <Badge
              variant="outline"
              className="border-primary/30 text-primary font-mono text-[10px] uppercase"
            >
              List View
            </Badge>
          </div>
          <p className="text-muted-foreground text-xs leading-relaxed">{description}</p>
        </div>
        {actions !== undefined && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>

      {/* 2. Enterprise Command & Filter Bar */}
      <div className="bg-card border-border/80 flex flex-col justify-between gap-2.5 rounded-lg border p-2.5 shadow-xs sm:flex-row sm:items-center">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          {/* Search Control */}
          <div className="relative w-full sm:w-64">
            <SearchIcon
              className="text-muted-foreground/70 absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2"
              aria-hidden="true"
            />
            <Input
              type="search"
              placeholder={`Search ${resourceName.toLowerCase()}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-background/60 h-8 pl-8 text-xs"
            />
          </div>

          {/* View Filter Tabs */}
          <div className="border-border/70 hidden items-center gap-1 border-l pl-2 md:flex">
            {defaultViews.map((view) => (
              <button
                key={view}
                type="button"
                onClick={() => setActiveView(view)}
                className={`rounded-sm px-2 py-1 text-xs font-medium transition-colors ${
                  activeView === view
                    ? 'bg-primary/10 text-primary font-semibold'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                {view}
              </button>
            ))}
          </div>
        </div>

        {/* Filter & Export Controls */}
        <div className="flex shrink-0 items-center gap-1.5 self-end sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            className="text-muted-foreground hover:text-foreground h-8 gap-1.5 text-xs"
          >
            <FilterIcon className="size-3.5" aria-hidden="true" />
            <span>Filter</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-muted-foreground hover:text-foreground h-8 gap-1.5 text-xs"
          >
            <SlidersHorizontalIcon className="size-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">Columns</span>
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground hover:text-foreground size-8"
            aria-label="Refresh list"
          >
            <RefreshCwIcon className="size-3.5" aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground hover:text-foreground size-8"
            aria-label="Export records"
          >
            <DownloadIcon className="size-3.5" aria-hidden="true" />
          </Button>
        </div>
      </div>

      {/* 3. Enterprise Data Grid Table */}
      <Card className="border-border/80 bg-card overflow-hidden rounded-lg border shadow-xs">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40 border-border/80 border-b">
                  {columns.map((col, index) => (
                    <TableHead
                      key={index}
                      className={`text-muted-foreground px-3 py-2.5 text-[11px] font-semibold tracking-wider uppercase ${col.className ?? ''}`}
                    >
                      {col.header}
                    </TableHead>
                  ))}
                  <TableHead className="text-muted-foreground px-3 py-2.5 text-right text-[11px] font-semibold tracking-wider uppercase">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Honest Zero State Row — no fake rows fabricated */}
                <TableRow className="hover:bg-transparent">
                  <TableCell
                    colSpan={columns.length + 1}
                    className="text-muted-foreground h-44 py-8 text-center text-xs"
                  >
                    <div className="mx-auto flex max-w-sm flex-col items-center justify-center gap-2">
                      <div className="bg-muted/60 border-border text-muted-foreground flex size-9 items-center justify-center rounded-full border">
                        <SearchIcon className="size-4" aria-hidden="true" />
                      </div>
                      <p className="text-foreground text-xs font-medium">
                        No active {resourceName.toLowerCase()} synchronized
                      </p>
                      <p className="text-muted-foreground text-[11px] leading-relaxed">
                        Live {resourceName.toLowerCase()} from HVPM College of Engineering &amp;
                        Technology will display in this data grid once connected to the campus
                        endpoint.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          {/* 4. Enterprise Pagination Footer */}
          <div className="border-border/70 bg-muted/15 text-muted-foreground flex flex-col gap-3 border-t px-4 py-2.5 text-xs sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-[11px]">
              <span>Showing 0 of 0 records</span>
              <span className="text-muted-foreground/50">•</span>
              <span className="hidden sm:inline">HVPM ERP Session 2025–26</span>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <span className="text-[11px]">Page 1 of 1</span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon-sm"
                  className="size-7"
                  disabled
                  aria-label="Previous page"
                >
                  <ChevronLeftIcon className="size-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="icon-sm"
                  className="size-7"
                  disabled
                  aria-label="Next page"
                >
                  <ChevronRightIcon className="size-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
