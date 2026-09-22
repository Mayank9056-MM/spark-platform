'use client';

import {
  BookOpenIcon,
  BuildingIcon,
  CalendarIcon,
  LayersIcon,
  ListTreeIcon,
  Trees,
} from 'lucide-react';

import { PermissionGuard } from '@/components/auth/permission-guard';
import { ModuleNotConnected } from '@/components/erp/module-not-connected';
import { ModuleShell } from '@/components/erp/module-shell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * Academics groups six read-gated sub-resources on one route, matching
 * the original nav-grouping intent, rather than six separate top-level
 * routes. Each card is independently gated — a user missing one
 * permission simply doesn't see that card, never the whole page.
 */
const ACADEMIC_RESOURCES = [
  { permission: 'department:read', title: 'Departments', icon: BuildingIcon },
  { permission: 'program:read', title: 'Programs', icon: LayersIcon },
  { permission: 'curriculumVersion:read', title: 'Curriculum Versions', icon: ListTreeIcon },
  { permission: 'subject:read', title: 'Subjects', icon: BookOpenIcon },
  { permission: 'academicYear:read', title: 'Academic Years', icon: CalendarIcon },
  { permission: 'electiveGroup:read', title: 'Elective Groups', icon: Trees },
] as const;

export default function AcademicsPage() {
  return (
    <ModuleShell
      title="Academics"
      description="Departments, programs, curriculum, subjects, and academic years."
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {ACADEMIC_RESOURCES.map(({ permission, title, icon: Icon }) => (
          <PermissionGuard key={permission} require={permission}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icon aria-hidden="true" className="size-4" />
                  {title}
                </CardTitle>
                <CardDescription>{title} configured for the institution.</CardDescription>
              </CardHeader>
              <CardContent>
                <ModuleNotConnected resource={title} />
              </CardContent>
            </Card>
          </PermissionGuard>
        ))}
      </div>
    </ModuleShell>
  );
}
