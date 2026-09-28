import {
  AlertCircle,
  ArrowRight,
  Building2,
  Landmark,
  ShieldAlert,
  ShieldCheck,
  UserCog,
} from 'lucide-react';
import Link from 'next/link';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/features/auth';
import { hasAnyRole } from '@/features/rbac';

interface HodUnassociatedStateProps {
  userName?: string;
}

export function HodUnassociatedState({ userName }: HodUnassociatedStateProps) {
  const { roles } = useAuth();
  const isAdministrator = hasAnyRole(roles, ['super_admin', 'admin']);

  if (isAdministrator) {
    return (
      <div className="mx-auto max-w-3xl space-y-6 py-8">
        <Card className="border-border rounded-none shadow-sm">
          <CardHeader className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 text-primary flex size-10 items-center justify-center">
                <ShieldCheck className="size-6" />
              </div>
              <div>
                <CardTitle className="font-heading text-xl">
                  Department-Scoped Role Profile Required
                </CardTitle>
                <CardDescription>
                  {userName
                    ? `User: ${userName} (Administrator View)`
                    : 'Administrative Scope Notice'}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="border-primary/20 bg-primary/5 text-foreground rounded-none">
              <Building2 className="text-primary size-4" />
              <AlertTitle className="font-semibold">
                Department Context Required for HOD View
              </AlertTitle>
              <AlertDescription className="mt-1 text-sm leading-relaxed">
                You are currently accessing the Head of Department (HOD) operational console. This
                specific workspace is strictly scoped to single-department operational records and
                requires an active HOD role assignment linked to an academic department.
              </AlertDescription>
            </Alert>

            <div className="border-border bg-muted/40 space-y-3 border p-4 text-sm">
              <p className="text-muted-foreground text-xs leading-relaxed">
                As an Administrator, you can view institution-wide academic operations or assign an
                HOD profile to a department:
              </p>
              <div className="grid gap-2 pt-1 sm:grid-cols-2">
                <Button
                  render={<Link href="/app/academics" />}
                  variant="outline"
                  size="sm"
                  className="justify-between rounded-none font-mono text-xs"
                >
                  <span className="flex items-center gap-2">
                    <Landmark className="size-3.5" />
                    <span>Academic Structure</span>
                  </span>
                  <ArrowRight className="size-3.5" />
                </Button>
                <Button
                  render={<Link href="/app/admin" />}
                  variant="outline"
                  size="sm"
                  className="justify-between rounded-none font-mono text-xs"
                >
                  <span className="flex items-center gap-2">
                    <UserCog className="size-3.5" />
                    <span>Admin Console</span>
                  </span>
                  <ArrowRight className="size-3.5" />
                </Button>
                <Button
                  render={<Link href="/app/timetable" />}
                  variant="outline"
                  size="sm"
                  className="justify-between rounded-none font-mono text-xs"
                >
                  <span className="flex items-center gap-2">
                    <Building2 className="size-3.5" />
                    <span>Institutional Timetable</span>
                  </span>
                  <ArrowRight className="size-3.5" />
                </Button>
                <Button
                  render={<Link href="/app/users" />}
                  variant="outline"
                  size="sm"
                  className="justify-between rounded-none font-mono text-xs"
                >
                  <span className="flex items-center gap-2">
                    <ShieldCheck className="size-3.5" />
                    <span>Role Assignments</span>
                  </span>
                  <ArrowRight className="size-3.5" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 py-8">
      <Card className="border-border rounded-none shadow-sm">
        <CardHeader className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="bg-destructive/10 text-destructive flex size-10 items-center justify-center">
              <ShieldAlert className="size-6" />
            </div>
            <div>
              <CardTitle className="font-heading text-xl">Unassigned Department Scope</CardTitle>
              <CardDescription>
                {userName ? `User: ${userName}` : 'Head of Department Profile'}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive" className="rounded-none">
            <AlertCircle className="size-4" />
            <AlertTitle className="font-semibold">Department Scope Required</AlertTitle>
            <AlertDescription className="mt-1 text-sm leading-relaxed">
              Your HOD account is not currently associated with an academic department. Head of
              Department operations, academic records, faculty allocations, and student rosters are
              strictly scoped to department assignments.
            </AlertDescription>
          </Alert>

          <div className="border-border bg-muted/40 space-y-3 border p-4 text-sm">
            <div className="flex items-center gap-2 font-medium">
              <Building2 className="text-muted-foreground size-4" />
              <span>Next Steps to Resolve Access:</span>
            </div>
            <ul className="text-muted-foreground list-inside list-disc space-y-1.5 pl-2 text-xs leading-relaxed">
              <li>
                Contact an institutional Administrator or Super Admin to assign your user account to
                an active academic department.
              </li>
              <li>
                Once your role assignment is scoped to a department (e.g., Computer Science &
                Engineering), all departmental metrics, faculty rosters, timetables, and student
                cohorts will automatically become accessible.
              </li>
              <li>
                If you believe this is an error, please reach out to the SPARK institutional systems
                administration team.
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
