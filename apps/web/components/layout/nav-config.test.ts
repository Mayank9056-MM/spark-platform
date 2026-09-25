import { describe, expect, it } from 'vitest';

import { NAVIGATION, type NavItem } from './nav-config';

import type { RoleKey, RoleSummary } from '@/features/auth';
import { hasAnyPermission, hasAnyRole } from '@/features/rbac';

function makeRole(key: RoleKey): RoleSummary {
  return {
    id: `role-${key}`,
    key,
    displayName: key.toUpperCase(),
  };
}

function filterNavItems(
  items: readonly NavItem[],
  roles: readonly RoleSummary[],
  permissions: readonly string[],
): NavItem[] {
  return items.filter((item) => {
    if (item.roles !== undefined && !hasAnyRole(roles, item.roles)) {
      return false;
    }
    if (item.permission === undefined) {
      return true;
    }
    const required = Array.isArray(item.permission) ? item.permission : [item.permission];
    return hasAnyPermission(permissions, required);
  });
}

describe('Navigation Configuration & Role/Permission Filtering', () => {
  const allPermissions = [
    'user:create',
    'user:read',
    'user:update',
    'role:create',
    'role:read',
    'permission:read',
    'auditLog:read',
    'admission:create',
    'admission:read',
    'department:read',
    'program:read',
    'curriculumVersion:read',
    'subject:read',
    'academicYear:read',
    'electiveGroup:read',
    'attendance:read',
    'timetable:read',
    'promotion:read',
    'facultyAssignment:read',
    'student:create',
    'student:read',
  ];

  describe('Structural Invariants', () => {
    it('defines valid labels, valid href paths, icons, and sections for all nav items', () => {
      for (const item of NAVIGATION) {
        expect(item.label).toBeTruthy();
        expect(item.href).toMatch(/^\/app(\/.*)?$/);
        expect(item.icon).toBeDefined();
        expect([
          'Overview',
          'Teaching',
          'Administration',
          'Academic & Operations',
          'Portals',
          'System',
        ]).toContain(item.section);
      }
    });

    it('does not contain redundant Student Portal entry in navigation', () => {
      const studentPortalItem = NAVIGATION.find((item) => item.href === '/app/student');
      expect(studentPortalItem).toBeUndefined();
    });

    it('strictly maps Super Admin route to super_admin role', () => {
      const superAdminItem = NAVIGATION.find((item) => item.href === '/app/super-admin');
      expect(superAdminItem).toBeDefined();
      expect(superAdminItem?.roles).toEqual(['super_admin']);
    });

    it('strictly maps Admin Console route to admin and super_admin roles', () => {
      const adminConsoleItem = NAVIGATION.find((item) => item.href === '/app/admin');
      expect(adminConsoleItem).toBeDefined();
      expect(adminConsoleItem?.roles).toEqual(['admin', 'super_admin']);
    });

    it('strictly maps Audit Logs to auditLog:read permission and admin/super_admin roles', () => {
      const auditLogsItem = NAVIGATION.find((item) => item.href === '/app/audit-logs');
      expect(auditLogsItem).toBeDefined();
      expect(auditLogsItem?.permission).toBe('auditLog:read');
      expect(auditLogsItem?.roles).toEqual(['admin', 'super_admin']);
    });

    it('strictly maps System Settings to admin and super_admin roles', () => {
      const settingsItem = NAVIGATION.find((item) => item.href === '/app/settings');
      expect(settingsItem).toBeDefined();
      expect(settingsItem?.roles).toEqual(['admin', 'super_admin']);
    });
  });

  describe('Super Admin Navigation Integrity', () => {
    const superAdminRoles = [makeRole('super_admin')];
    const superAdminNav = filterNavItems(NAVIGATION, superAdminRoles, allPermissions);
    const visibleHrefs = superAdminNav.map((i) => i.href);

    it('never exposes Student Portal (/app/student) to Super Admin', () => {
      expect(visibleHrefs).not.toContain('/app/student');
      expect(superAdminNav.some((i) => i.label === 'Student Portal')).toBe(false);
    });

    it('exposes all institutional administrative and academic modules to Super Admin', () => {
      expect(visibleHrefs).toContain('/app/dashboard');
      expect(visibleHrefs).toContain('/app/super-admin');
      expect(visibleHrefs).toContain('/app/admin');
      expect(visibleHrefs).toContain('/app/users');
      expect(visibleHrefs).toContain('/app/roles');
      expect(visibleHrefs).toContain('/app/permissions');
      expect(visibleHrefs).toContain('/app/audit-logs');
      expect(visibleHrefs).toContain('/app/admissions');
      expect(visibleHrefs).toContain('/app/academics');
      expect(visibleHrefs).toContain('/app/attendance');
      expect(visibleHrefs).toContain('/app/timetable');
      expect(visibleHrefs).toContain('/app/promotions');
      expect(visibleHrefs).toContain('/app/faculty-assignments');
      expect(visibleHrefs).toContain('/app/settings');
    });
  });

  describe('Admin Navigation Integrity', () => {
    const adminRoles = [makeRole('admin')];
    const adminNav = filterNavItems(NAVIGATION, adminRoles, allPermissions);
    const visibleHrefs = adminNav.map((i) => i.href);

    it('never exposes Student Portal (/app/student) to Admin', () => {
      expect(visibleHrefs).not.toContain('/app/student');
      expect(adminNav.some((i) => i.label === 'Student Portal')).toBe(false);
    });

    it('never exposes Super Admin Console (/app/super-admin) to Admin', () => {
      expect(visibleHrefs).not.toContain('/app/super-admin');
      expect(adminNav.some((i) => i.label === 'Super Admin')).toBe(false);
    });

    it('exposes Admin Console and operational modules to Admin', () => {
      expect(visibleHrefs).toContain('/app/dashboard');
      expect(visibleHrefs).toContain('/app/admin');
      expect(visibleHrefs).toContain('/app/users');
      expect(visibleHrefs).toContain('/app/roles');
      expect(visibleHrefs).toContain('/app/permissions');
      expect(visibleHrefs).toContain('/app/audit-logs');
      expect(visibleHrefs).toContain('/app/admissions');
      expect(visibleHrefs).toContain('/app/academics');
      expect(visibleHrefs).toContain('/app/attendance');
      expect(visibleHrefs).toContain('/app/timetable');
      expect(visibleHrefs).toContain('/app/promotions');
      expect(visibleHrefs).toContain('/app/faculty-assignments');
      expect(visibleHrefs).toContain('/app/settings');
    });
  });

  describe('Student Navigation Integrity', () => {
    const studentRoles = [makeRole('student')];
    const studentPermissions: string[] = [];
    const studentNav = filterNavItems(NAVIGATION, studentRoles, studentPermissions);
    const visibleHrefs = studentNav.map((i) => i.href);

    it('exposes Dashboard (/app/dashboard) to Student as their unified workspace', () => {
      expect(visibleHrefs).toEqual(['/app/dashboard']);
    });

    it('never exposes administrative modules to Student', () => {
      expect(visibleHrefs).not.toContain('/app/super-admin');
      expect(visibleHrefs).not.toContain('/app/admin');
      expect(visibleHrefs).not.toContain('/app/users');
      expect(visibleHrefs).not.toContain('/app/settings');
      expect(visibleHrefs).not.toContain('/app/roles');
      expect(visibleHrefs).not.toContain('/app/permissions');
      expect(visibleHrefs).not.toContain('/app/audit-logs');
      expect(visibleHrefs).not.toContain('/app/admissions');
      expect(visibleHrefs).not.toContain('/app/academics');
      expect(visibleHrefs).not.toContain('/app/faculty/timetable');
      expect(visibleHrefs).not.toContain('/app/faculty/assignments');
      expect(visibleHrefs).not.toContain('/app/faculty/attendance');
    });
  });

  describe('Faculty Navigation Integrity', () => {
    const facultyRoles = [makeRole('faculty')];
    const facultyPermissions = [
      'subject:read',
      'facultyAssignment:read',
      'timetable:read',
      'semesterCatalog:read',
      'academicYear:read',
      'department:read',
      'lecture:read',
      'attendance:create',
      'attendance:read',
    ];
    const facultyNav = filterNavItems(NAVIGATION, facultyRoles, facultyPermissions);
    const visibleHrefs = facultyNav.map((i) => i.href);

    it('exposes Dashboard and dedicated Teaching section to Faculty', () => {
      expect(visibleHrefs).toContain('/app/dashboard');
      expect(visibleHrefs).toContain('/app/faculty/timetable');
      expect(visibleHrefs).toContain('/app/faculty/assignments');
      expect(visibleHrefs).toContain('/app/faculty/attendance');
    });

    it('never exposes administrative governance to Faculty', () => {
      expect(visibleHrefs).not.toContain('/app/super-admin');
      expect(visibleHrefs).not.toContain('/app/admin');
      expect(visibleHrefs).not.toContain('/app/settings');
      expect(visibleHrefs).not.toContain('/app/audit-logs');
      expect(visibleHrefs).not.toContain('/app/roles');
      expect(visibleHrefs).not.toContain('/app/permissions');
      expect(visibleHrefs).not.toContain('/app/academics');
      expect(visibleHrefs).not.toContain('/app/attendance');
      expect(visibleHrefs).not.toContain('/app/timetable');
      expect(visibleHrefs).not.toContain('/app/faculty-assignments');
      expect(visibleHrefs).not.toContain('/app/promotions');
      expect(visibleHrefs).not.toContain('/app/admissions');
    });

    it('exclusively exposes Dashboard and Teaching routes to Faculty', () => {
      expect(visibleHrefs).toEqual([
        '/app/dashboard',
        '/app/faculty/timetable',
        '/app/faculty/assignments',
        '/app/faculty/attendance',
      ]);
    });
  });

  describe('HOD Navigation Integrity', () => {
    const hodRoles = [makeRole('hod')];
    const hodNav = filterNavItems(NAVIGATION, hodRoles, allPermissions);
    const visibleHrefs = hodNav.map((i) => i.href);

    it('exposes both Teaching and Academic & Operations to HOD', () => {
      expect(visibleHrefs).toContain('/app/dashboard');
      expect(visibleHrefs).toContain('/app/faculty/timetable');
      expect(visibleHrefs).toContain('/app/faculty/assignments');
      expect(visibleHrefs).toContain('/app/faculty/attendance');
      expect(visibleHrefs).toContain('/app/admissions');
      expect(visibleHrefs).toContain('/app/academics');
      expect(visibleHrefs).toContain('/app/attendance');
      expect(visibleHrefs).toContain('/app/timetable');
      expect(visibleHrefs).toContain('/app/promotions');
      expect(visibleHrefs).toContain('/app/faculty-assignments');
    });

    it('never exposes Super Admin, Admin Console, or System Settings to HOD', () => {
      expect(visibleHrefs).not.toContain('/app/super-admin');
      expect(visibleHrefs).not.toContain('/app/admin');
      expect(visibleHrefs).not.toContain('/app/settings');
    });
  });

  describe('Roleless / Unassigned Navigation Integrity', () => {
    const emptyRoles: RoleSummary[] = [];
    const emptyPermissions: string[] = [];
    const unassignedNav = filterNavItems(NAVIGATION, emptyRoles, emptyPermissions);
    const visibleHrefs = unassignedNav.map((i) => i.href);

    it('only exposes unrestricted items (Dashboard)', () => {
      expect(visibleHrefs).toEqual(['/app/dashboard']);
    });
  });
});
