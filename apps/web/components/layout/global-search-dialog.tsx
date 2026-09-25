'use client';

import {
  BookOpenIcon,
  CalendarClockIcon,
  ClipboardListIcon,
  FileTextIcon,
  GraduationCapIcon,
  HelpCircleIcon,
  IdCardIcon,
  LandmarkIcon,
  LayoutDashboardIcon,
  PlusCircleIcon,
  SearchIcon,
  ShieldIcon,
  TrendingUpIcon,
  UserCheckIcon,
  UserCogIcon,
  UsersIcon,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { useAuth } from '@/features/auth';
import { hasAnyPermission, hasAnyRole, hasPermission, hasRole } from '@/features/rbac';

export function GlobalSearchDialog() {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();
  const { permissions, roles } = useAuth();

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || e.key === '/') {
        // Prevent default browser search or quickfind if target isn't an input
        if (
          (e.target instanceof HTMLElement && e.target.isContentEditable) ||
          e.target instanceof HTMLInputElement ||
          e.target instanceof HTMLTextAreaElement ||
          e.target instanceof HTMLSelectElement
        ) {
          return;
        }
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const runCommand = React.useCallback((command: () => unknown) => {
    setOpen(false);
    command();
  }, []);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="text-muted-foreground bg-muted/40 hover:bg-muted/70 hover:text-foreground border-border/80 hidden h-8 w-56 items-center justify-between gap-2.5 rounded-md border px-2.5 text-xs transition-all md:flex lg:w-64"
        aria-label="Search pages and actions"
      >
        <div className="flex items-center gap-2 truncate">
          <SearchIcon className="text-muted-foreground/80 size-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate">Search pages, actions...</span>
        </div>
        <kbd className="border-border bg-background text-muted-foreground pointer-events-none hidden h-4.5 items-center gap-0.5 rounded border px-1.5 font-mono text-[10px] font-medium select-none sm:inline-flex">
          Ctrl K
        </kbd>
      </Button>

      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => setOpen(true)}
        className="text-muted-foreground hover:text-foreground md:hidden"
        aria-label="Search"
      >
        <SearchIcon className="size-4" aria-hidden="true" />
      </Button>

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Enterprise Search & Discovery"
        description="Search across pages, actions, and institutional records in S.P.A.R.K."
      >
        <CommandInput placeholder="Tell me what you want to do (e.g., Admissions, Timetable, Users)..." />
        <CommandList className="max-h-80">
          <CommandEmpty>No results found for that search query.</CommandEmpty>

          <CommandGroup heading="Core Modules">
            <CommandItem onSelect={() => runCommand(() => router.push('/app/dashboard'))}>
              <LayoutDashboardIcon className="text-primary size-4 shrink-0" />
              <span>Dashboard / Role Center</span>
            </CommandItem>

            {hasPermission(permissions, 'admission:read') && (
              <CommandItem onSelect={() => runCommand(() => router.push('/app/admissions'))}>
                <ClipboardListIcon className="text-primary size-4 shrink-0" />
                <span>Admissions Overview</span>
              </CommandItem>
            )}

            {hasAnyPermission(permissions, [
              'department:read',
              'program:read',
              'curriculumVersion:read',
              'subject:read',
              'academicYear:read',
              'electiveGroup:read',
            ]) && (
              <>
                <CommandItem onSelect={() => runCommand(() => router.push('/app/academics'))}>
                  <LandmarkIcon className="text-primary size-4 shrink-0" />
                  <span>Academic Structure &amp; Catalogs</span>
                </CommandItem>
                <CommandItem
                  onSelect={() => runCommand(() => router.push('/app/academics/curricula'))}
                >
                  <BookOpenIcon className="text-primary size-4 shrink-0" />
                  <span>Curriculum Versions &amp; Syllabi</span>
                </CommandItem>
              </>
            )}

            {hasPermission(permissions, 'attendance:read') && (
              <CommandItem onSelect={() => runCommand(() => router.push('/app/attendance'))}>
                <UserCheckIcon className="text-primary size-4 shrink-0" />
                <span>Attendance Sessions &amp; Records</span>
              </CommandItem>
            )}

            {hasPermission(permissions, 'timetable:read') && (
              <CommandItem onSelect={() => runCommand(() => router.push('/app/timetable'))}>
                <CalendarClockIcon className="text-primary size-4 shrink-0" />
                <span>Timetable &amp; Schedule</span>
              </CommandItem>
            )}

            {hasPermission(permissions, 'promotion:read') && (
              <CommandItem onSelect={() => runCommand(() => router.push('/app/promotions'))}>
                <TrendingUpIcon className="text-primary size-4 shrink-0" />
                <span>Student Progression &amp; Promotions</span>
              </CommandItem>
            )}

            {hasPermission(permissions, 'facultyAssignment:read') && (
              <CommandItem
                onSelect={() => runCommand(() => router.push('/app/faculty-assignments'))}
              >
                <IdCardIcon className="text-primary size-4 shrink-0" />
                <span>Faculty Subject Assignments</span>
              </CommandItem>
            )}
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Administration &amp; Governance">
            {hasPermission(permissions, 'user:read') && (
              <CommandItem onSelect={() => runCommand(() => router.push('/app/users'))}>
                <UsersIcon className="text-primary size-4 shrink-0" />
                <span>User Accounts Management</span>
              </CommandItem>
            )}
            {hasAnyRole(roles, ['admin', 'super_admin']) && (
              <CommandItem onSelect={() => runCommand(() => router.push('/app/admin'))}>
                <UserCogIcon className="text-primary size-4 shrink-0" />
                <span>Administration Workspace</span>
              </CommandItem>
            )}
            {hasRole(roles, 'super_admin') && (
              <CommandItem onSelect={() => runCommand(() => router.push('/app/super-admin'))}>
                <ShieldIcon className="text-primary size-4 shrink-0" />
                <span>Super Administrator Console</span>
              </CommandItem>
            )}
            {hasPermission(permissions, 'auditLog:read') &&
              hasAnyRole(roles, ['admin', 'super_admin']) && (
                <CommandItem onSelect={() => runCommand(() => router.push('/app/audit-logs'))}>
                  <FileTextIcon className="text-primary size-4 shrink-0" />
                  <span>Audit &amp; Security Telemetry</span>
                </CommandItem>
              )}
            {hasRole(roles, 'student') && (
              <CommandItem onSelect={() => runCommand(() => router.push('/app/student'))}>
                <GraduationCapIcon className="text-primary size-4 shrink-0" />
                <span>Student Academic Portal</span>
              </CommandItem>
            )}
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Quick Actions">
            {hasPermission(permissions, 'admission:create') && (
              <CommandItem onSelect={() => runCommand(() => router.push('/app/admissions/new'))}>
                <PlusCircleIcon className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span>Record New Admission</span>
              </CommandItem>
            )}
            {hasPermission(permissions, 'user:create') && (
              <CommandItem onSelect={() => runCommand(() => router.push('/app/users/new'))}>
                <PlusCircleIcon className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span>Create User Account</span>
              </CommandItem>
            )}
            <CommandItem
              onSelect={() => runCommand(() => window.open('https://www.hvpmcoet.in/', '_blank'))}
            >
              <HelpCircleIcon className="text-muted-foreground size-4 shrink-0" />
              <span>HVPM COET Institutional Portal</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
