// apps/api/src/modules/rbac/rbac.constants.ts

import type { ScopeType } from './scopes/scope.types.js';

/**
 * Module-wide constants for the RBAC domain.
 *
 * This file defines ONLY stable, reusable RBAC configuration values. It is
 * not a service, repository, validator, authorization engine, or
 * middleware, and must never become one — it performs no database access,
 * no authorization decisions, no validation, and no logging.
 *
 * Canonical sources this file deliberately does NOT duplicate — if a value
 * already lives in one of these, it stays there, not here:
 *
 * - AuthorizationAction / AuthorizationResource / PermissionKey /
 *   ScopeContext  — authorization/authorization.types.ts
 * - ScopeType (= ScopeContext['type'])          — scopes/scope.types.ts
 * - the permission catalog (PERMISSIONS, PERMISSION_CATALOG,
 *   PERMISSIONS_BY_KEY, ...)                    — permissions/permission.constants.ts
 *
 * Deliberately NOT included here (see the accompanying report for why):
 * a permission-key separator constant, a module name/identifier constant,
 * and runtime arrays enumerating every AuthorizationAction/
 * AuthorizationResource. None currently has a real consumer, and adding
 * them now would be speculative.
 */

/**
 * The single-college scope hierarchy, ordered from broadest to narrowest.
 *
 * This is the definitive statement of which scope types the application
 * supports and their containment order: COLLEGE contains every
 * DEPARTMENT, and each DEPARTMENT contains its DIVISIONs. There is no
 * ORGANIZATION scope above COLLEGE — COLLEGE is the top of the hierarchy.
 *
 * This is data, not logic. It does NOT decide whether one scope covers
 * another — that is exclusively scope-resolver.ts's scopeCovers(). Nothing
 * in this file performs scope validation, coverage checks, or
 * authorization of any kind.
 *
 * Each element is typed against `ScopeType` (scope.types.ts), so a
 * renamed or misspelled scope type fails to compile. This is NOT
 * automatically kept in sync in the other direction: if a new scope type
 * is ever added to `ScopeContext` in authorization.types.ts, this array
 * must be updated by hand, in the correct hierarchy position — anything
 * that relies on this list for a complete scope enumeration would
 * otherwise silently omit the new type.
 */
export const SCOPE_HIERARCHY: readonly ScopeType[] = Object.freeze([
  'COLLEGE',
  'DEPARTMENT',
  'DIVISION',
]);
