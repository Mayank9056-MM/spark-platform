import { AlertCircle, Building2, ShieldAlert } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface HodUnassociatedStateProps {
  userName?: string;
}

export function HodUnassociatedState({ userName }: HodUnassociatedStateProps) {
  return (
    <div className="mx-auto max-w-3xl space-y-6 py-8">
      <Card className="border-border rounded-none shadow-sm">
        <CardHeader className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="bg-destructive/10 text-destructive flex size-10 items-center justify-center">
              <ShieldAlert className="size-6" />
            </div>
            <div>
              <CardTitle className="font-heading text-xl">
                Unassigned Department Scope
              </CardTitle>
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
              Your HOD account is not currently associated with an academic department. Head of Department operations, academic records, faculty allocations, and student rosters are strictly scoped to department assignments.
            </AlertDescription>
          </Alert>

          <div className="border-border bg-muted/40 space-y-3 border p-4 text-sm">
            <div className="flex items-center gap-2 font-medium">
              <Building2 className="text-muted-foreground size-4" />
              <span>Next Steps to Resolve Access:</span>
            </div>
            <ul className="text-muted-foreground list-inside list-disc space-y-1.5 pl-2 text-xs leading-relaxed">
              <li>
                Contact an institutional Administrator or Super Admin to assign your user account to an active academic department.
              </li>
              <li>
                Once your role assignment is scoped to a department (e.g., Computer Science & Engineering), all departmental metrics, faculty rosters, timetables, and student cohorts will automatically become accessible.
              </li>
              <li>
                If you believe this is an error, please reach out to the SPARK institutional systems administration team.
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
