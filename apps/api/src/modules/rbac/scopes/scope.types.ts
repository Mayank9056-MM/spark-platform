// apps/api/src/modules/rbac/scopes/scope.types.ts

import type { ScopeContext } from '../authorization/authorization.types.js';

/**
 * Domain types for authorization scope.
 *
 * A scope describes the part of the single-college academic system to which
 * an authorization grant applies:
 *
 * - COLLEGE: the entire college
 * - DEPARTMENT: one department
 * - DIVISION: one division
 *
 * This module defines scope types only. It does not determine whether a
 * scope is valid, whether a department/division exists, or whether an actor
 * is authorized to access a scope.
 *
 * Structural validation belongs to the validation layer.
 * Scope existence validation belongs to scope.service.ts.
 * Authorization decisions belong to authorization.service.ts.
 *
 * ScopeContext remains the canonical domain representation and is defined
 * in authorization.types.ts. It is re-exported here so consumers of the
 * scopes module do not need to depend directly on the authorization module
 * for basic scope typing.
 */
export type { ScopeContext } from '../authorization/authorization.types.js';

/**
 * Canonical scope discriminant.
 *
 * Derived directly from ScopeContext so the scopes module cannot drift away
 * from the authorization domain model.
 */
export type ScopeType = ScopeContext['type'];

/**
 * Identifier for a Department used as a scope target.
 *
 * This is intentionally an alias of string rather than a branded type
 * because the existing database/domain model represents Department IDs
 * as plain strings.
 */
export type DepartmentId = string;
