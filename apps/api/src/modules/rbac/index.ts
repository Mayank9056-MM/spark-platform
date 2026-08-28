// apps/api/src/modules/rbac/index.ts

/**
 * Public API boundary for the RBAC module.
 *
 * External application modules should import RBAC capabilities from here,
 * not from deep internal paths (e.g. `../rbac/scopes/scope.repository.js`).
 * This file re-exports only what another module genuinely needs; it
 * contains no logic of its own.
 *
 * What is deliberately NOT exported — see the accompanying report for the
 * reasoning behind each: roleRepository / permissionRepository /
 * roleAssignmentRepository / scopeRepository (persistence details),
 * permissionResolver / scopeCovers / DivisionDepartmentFact (internal
 * composition pieces already wrapped by authorizationService), roleService
 * / permissionService (no consumer exists outside this module today — see
 * report), any Prisma model, and rbac.types.ts (intentionally empty).
 */

// ── Runtime ─────────────────────────────────────────────────────────────

export { authorizationService } from './authorization/authorization.service.js';
export { roleAssignmentService } from './assignments/role-assignment.service.js';
export { authorize } from './authorization/authorization.middleware.js';
export { permissionRouter } from './permissions/permission.routes.js';
export { roleAssignmentRouter } from './assignments/role-assignment.routes.js';
export { roleRouter } from './roles/role.routes.js';
export { scopeService } from './scopes/scope.service.js';
export { SCOPE_HIERARCHY } from './rbac.constants.js';

// ── Types ───────────────────────────────────────────────────────────────

export type {
  AuthorizationAction,
  AuthorizationResource,
  AuthorizationSubject,
  AuthorizationContext,
  AuthorizationDecision,
  AuthorizationCheckResult,
  PermissionKey,
  ScopeContext,
} from './authorization/authorization.types.js';

export type { AuthorizeOptions } from './authorization/authorization.middleware.ts';

export type { RoleId } from './roles/role.types.js';

export type { RoleAssignmentId } from './assignments/role-assignment.types.js';

export type { ScopeType } from './scopes/scope.types.js';
