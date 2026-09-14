// apps/api/src/modules/rbac/rbac.constants.ts

import type {
  AuthorizationAction,
  AuthorizationResource,
} from './authorization/authorization.types.js';
import type { ScopeType } from './scopes/scope.types.js';

/**
 * Module-wide constants for the RBAC domain.
 * ...(unchanged intro)...
 *
 * Deliberately NOT included here: a permission-key separator constant
 * and a module name/identifier constant — neither has a real consumer,
 * and adding them now would be speculative.
 *
 * AUTHORIZATION_ACTIONS / AUTHORIZATION_RESOURCES below now ARE
 * included, because they now have a real consumer.
 * permission.validation.ts previously hand-declared its own local,
 * shorter copy of both arrays, and that copy had drifted out of sync
 * with AuthorizationResource: 8 resources already live in
 * PERMISSION_CATALOG (department, program, curriculumVersion,
 * semesterCatalog, subject, electiveGroup, academicYear, admission)
 * were silently missing from it, causing valid
 * POST/GET /rbac/permissions requests for those resources to be
 * rejected with 400. These two arrays are the single source of truth
 * going forward.
 */

/**
 * Data, not logic — matches SCOPE_HIERARCHY's own convention below.
 * NOT automatically kept in sync with AuthorizationAction/
 * AuthorizationResource: adding a new action/resource to those types
 * requires updating the corresponding array here by hand.
 * `satisfies` checks every listed element is a valid union member; it
 * does not (and, without generic type machinery this codebase
 * otherwise avoids, cannot) enforce that every union member is listed.
 */
export const AUTHORIZATION_ACTIONS = [
  'create',
  'read',
  'update',
  'delete',
  'archive',
  'restore',
  'activate',
  'cancel',
  'finalize',
] as const satisfies readonly AuthorizationAction[];

export const AUTHORIZATION_RESOURCES = [
  'user',
  'role',
  'permission',
  'roleAssignment',
  'department',
  'program',
  'curriculumVersion',
  'semesterCatalog',
  'subject',
  'electiveGroup',
  'academicYear',
  'admission',
  'promotion',
  'student',
  'faculty',
  'facultyAssignment',
  'timetable',
  'attendance',
  'assignment',
  'notice',
] as const satisfies readonly AuthorizationResource[];

export const SCOPE_HIERARCHY: readonly ScopeType[] = Object.freeze(['COLLEGE', 'DEPARTMENT']);
