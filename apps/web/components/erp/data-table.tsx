'use client';

import {
  AlertCircleIcon,
  ArrowDownIcon,
  ArrowUpDownIcon,
  ArrowUpIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  RefreshCwIcon,
  SearchIcon,
  XIcon,
} from 'lucide-react';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export interface ColumnDef<T> {
  key: string;
  header: React.ReactNode;
  cell: (item: T) => React.ReactNode;
  className?: string;
  headerClassName?: string;
  sortable?: boolean;
}

export interface DataTableProps<T> {
  columns: readonly ColumnDef<T>[];
  data?: readonly T[];
  total?: number;
  page?: number;
  limit?: number;
  onPageChange?: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  isLoading?: boolean;
  isError?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  search?: string;
  onSearchChange?: (search: string) => void;
  searchPlaceholder?: string;
  filterSlot?: React.ReactNode;
  viewTabs?: {
    views: readonly string[];
    activeView: string;
    onViewChange: (view: string) => void;
  };
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
  actions?: React.ReactNode;
  keyExtractor: (item: T) => string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSortChange?: (field: string) => void;
}

export function DataTable<T>({
  columns,
  data = [],
  total = 0,
  page = 1,
  limit = 20,
  onPageChange,
  onLimitChange,
  isLoading = false,
  isError = false,
  error = null,
  onRetry,
  search,
  onSearchChange,
  searchPlaceholder = 'Search records...',
  filterSlot,
  viewTabs,
  emptyTitle = 'No records found',
  emptyDescription = 'There are no records matching your current filter criteria.',
  emptyAction,
  actions,
  keyExtractor,
  sortBy,
  sortOrder = 'desc',
  onSortChange,
}: DataTableProps<T>) {
  const [localSearch, setLocalSearch] = React.useState(search ?? '');
  const [prevSearch, setPrevSearch] = React.useState(search);

  // Keep local search synced with prop without calling setState synchronously in an effect
  if (search !== prevSearch) {
    setPrevSearch(search);
    setLocalSearch(search ?? '');
  }

  // Debounced search trigger
  React.useEffect(() => {
    if (onSearchChange === undefined) return;
    const timer = setTimeout(() => {
      if (localSearch !== search) {
        onSearchChange(localSearch);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [localSearch, onSearchChange, search]);

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const startRecord = total > 0 ? (page - 1) * limit + 1 : 0;
  const endRecord = Math.min(page * limit, total);

  return (
    <div className="flex flex-col gap-3">
      {/* Command & Filter Bar */}
      <div className="bg-card border-border/80 flex flex-col justify-between gap-2.5 rounded-lg border p-2.5 shadow-xs sm:flex-row sm:items-center">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          {/* Search Control */}
          {onSearchChange !== undefined && (
            <div className="relative w-full sm:w-64">
              <SearchIcon
                className="text-muted-foreground/70 absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2"
                aria-hidden="true"
              />
              <Input
                type="search"
                placeholder={searchPlaceholder}
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                className="bg-background/60 h-8 pr-7 pl-8 text-xs"
              />
              {localSearch && (
                <button
                  type="button"
                  onClick={() => {
                    setLocalSearch('');
                    onSearchChange('');
                  }}
                  className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 inline-flex size-4 -translate-y-1/2 items-center justify-center rounded-sm"
                  aria-label="Clear search"
                >
                  <XIcon className="size-3" />
                </button>
              )}
            </div>
          )}

          {/* View Filter Tabs */}
          {viewTabs && viewTabs.views.length > 0 && (
            <div className="border-border/70 hidden items-center gap-1 border-l pl-2 md:flex">
              {viewTabs.views.map((view) => (
                <button
                  key={view}
                  type="button"
                  onClick={() => viewTabs.onViewChange(view)}
                  className={`cursor-pointer rounded-sm px-2 py-1 text-xs font-medium transition-colors ${
                    viewTabs.activeView === view
                      ? 'bg-primary/10 text-primary font-semibold'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
                >
                  {view}
                </button>
              ))}
            </div>
          )}

          {/* Custom Filter Controls */}
          {filterSlot}
        </div>

        {/* Global Toolbar Actions */}
        <div className="flex shrink-0 items-center gap-1.5 self-end sm:self-auto">
          {actions}
          {onRetry && (
            <Button
              variant="outline"
              size="icon-sm"
              className="text-muted-foreground hover:text-foreground size-8"
              onClick={onRetry}
              title="Refresh dataset"
              aria-label="Refresh dataset"
            >
              <RefreshCwIcon className="size-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Error Banner */}
      {isError && (
        <div
          role="alert"
          className="border-destructive/30 bg-destructive/10 text-destructive flex items-center justify-between gap-3 rounded-lg border p-3 text-xs"
        >
          <div className="flex items-center gap-2">
            <AlertCircleIcon className="size-4 shrink-0" aria-hidden="true" />
            <span>
              {error?.message ??
                'Failed to load records from the server. Check network connection.'}
            </span>
          </div>
          {onRetry && (
            <Button
              size="sm"
              variant="outline"
              onClick={onRetry}
              className="border-destructive/30 hover:bg-destructive/15 text-destructive h-6 text-[11px] font-medium"
            >
              Retry
            </Button>
          )}
        </div>
      )}

      {/* Data Grid Table */}
      <Card className="border-border/80 bg-card overflow-hidden rounded-lg border shadow-xs">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40 border-border/80 border-b">
                  {columns.map((col) => {
                    const isSorted = sortBy === col.key;
                    const canSort = col.sortable && onSortChange !== undefined;

                    return (
                      <TableHead
                        key={col.key}
                        scope="col"
                        className={`text-muted-foreground px-3 py-2.5 text-[11px] font-semibold tracking-wider uppercase select-none ${
                          col.headerClassName ?? ''
                        }`}
                      >
                        {canSort ? (
                          <button
                            type="button"
                            onClick={() => onSortChange(col.key)}
                            className="hover:text-foreground inline-flex items-center gap-1.5 font-semibold transition-colors"
                          >
                            <span>{col.header}</span>
                            {isSorted ? (
                              sortOrder === 'asc' ? (
                                <ArrowUpIcon
                                  className="text-primary size-3"
                                  aria-label="Sorted ascending"
                                />
                              ) : (
                                <ArrowDownIcon
                                  className="text-primary size-3"
                                  aria-label="Sorted descending"
                                />
                              )
                            ) : (
                              <ArrowUpDownIcon className="size-3 opacity-40" aria-hidden="true" />
                            )}
                          </button>
                        ) : (
                          col.header
                        )}
                      </TableHead>
                    );
                  })}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  // Skeleton Loading Rows
                  Array.from({ length: 5 }).map((_, rowIndex) => (
                    <TableRow key={`skeleton-${rowIndex}`} className="hover:bg-transparent">
                      {columns.map((col, colIndex) => (
                        <TableCell key={`skeleton-cell-${colIndex}`} className="px-3 py-3">
                          <Skeleton className="h-4 w-full max-w-[120px]" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : data.length === 0 ? (
                  // Empty State Row
                  <TableRow className="hover:bg-transparent">
                    <TableCell
                      colSpan={columns.length}
                      className="text-muted-foreground h-44 py-8 text-center text-xs"
                    >
                      <div className="mx-auto flex max-w-sm flex-col items-center justify-center gap-2">
                        <div className="bg-muted/60 border-border text-muted-foreground flex size-9 items-center justify-center rounded-full border">
                          <SearchIcon className="size-4" aria-hidden="true" />
                        </div>
                        <p className="text-foreground text-xs font-medium">{emptyTitle}</p>
                        <p className="text-muted-foreground text-[11px] leading-relaxed">
                          {emptyDescription}
                        </p>
                        {emptyAction && <div className="mt-2">{emptyAction}</div>}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  // Populated Data Rows
                  data.map((item) => (
                    <TableRow
                      key={keyExtractor(item)}
                      className="hover:bg-muted/20 border-border/60 border-b transition-colors"
                    >
                      {columns.map((col) => (
                        <TableCell
                          key={col.key}
                          className={`px-3 py-2.5 text-xs ${col.className ?? ''}`}
                        >
                          {col.cell(item)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Footer */}
          <div className="border-border/70 bg-muted/15 text-muted-foreground flex flex-col gap-3 border-t px-4 py-2.5 text-xs sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-[11px]">
              <span>
                Showing {startRecord}–{endRecord} of {total} records
              </span>
              <span className="text-muted-foreground/40">•</span>
              <span className="hidden sm:inline">HVPM ERP Node AMV-01</span>
            </div>

            <div className="flex items-center gap-3 self-end sm:self-auto">
              {/* Rows Per Page Selector */}
              {onLimitChange !== undefined && (
                <div className="flex items-center gap-1.5 text-[11px]">
                  <span>Rows:</span>
                  <select
                    value={limit}
                    onChange={(e) => onLimitChange(Number(e.target.value))}
                    className="border-border bg-background text-foreground focus-visible:ring-ring h-7 rounded border px-1.5 py-0.5 text-xs focus-visible:ring-1"
                    aria-label="Rows per page"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              )}

              {/* Page Navigator */}
              <div className="flex items-center gap-1.5 text-[11px]">
                <span>
                  Page {page} of {totalPages}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon-sm"
                    className="size-7"
                    disabled={page <= 1 || isLoading}
                    onClick={() => onPageChange?.(page - 1)}
                    aria-label="Previous page"
                  >
                    <ChevronLeftIcon className="size-3.5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon-sm"
                    className="size-7"
                    disabled={page >= totalPages || isLoading}
                    onClick={() => onPageChange?.(page + 1)}
                    aria-label="Next page"
                  >
                    <ChevronRightIcon className="size-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
