// apps/api/src/modules/rbac/authorization/authorization.types.ts

import type { ErrorCode } from '../../../common/errors/ErrorCodes.js';

/**
 * Canonical authorization domain type contract for SPARK.
 *
 * Deliberately decoupled from Prisma models (repository/mapper layer
 * translates persistence rows into these types), from Express (must work
 * for HTTP, background jobs, CLI scripts, future WebSocket/event
 * consumers), and from JWT payload shape (JWT carries only `sub`/`sid`;
 * roles and permissions are always resolved dynamically from the
 * database/cache, never trusted from a token or caller-supplied input).
 */

// ─────────────────────────────────────────────────────────────────────────
// Domain primitives
// ─────────────────────────────────────────────────────────────────────────

export type OrganizationId = string;
export type UserId = string;
export type ResourceId = string;

// ─────────────────────────────────────────────────────────────────────────
// Action / Resource
// ─────────────────────────────────────────────────────────────────────────

export type AuthorizationAction = 'create' | 'read' | 'update' | 'delete' | 'archive' | 'restore';

export type AuthorizationResource =
  'user' | 'role' | 'permission' | 'student' | 'faculty' | 'attendance' | 'assignment' | 'notice';

// ─────────────────────────────────────────────────────────────────────────
// Permission identity
// ─────────────────────────────────────────────────────────────────────────

export interface PermissionIdentity {
  readonly resource: AuthorizationResource;
  readonly action: AuthorizationAction;
}

/** String form, matching `Permission.key`'s convention (e.g. "student:read"). */
export type PermissionKey = `${AuthorizationResource}:${AuthorizationAction}`;

// ─────────────────────────────────────────────────────────────────────────
// Scope context
// ─────────────────────────────────────────────────────────────────────────

/**
 * Mirrors the Prisma `ScopeType` enum exactly — do not add scope types
 * the schema doesn't yet define. `scopeId` is required everywhere the
 * schema's CHECK constraint requires it (i.e. everywhere but ORGANIZATION).
 */
export type ScopeContext =
  | { readonly type: 'COLLEGE' }
  | { readonly type: 'DEPARTMENT'; readonly departmentId: string }
  | { readonly type: 'DIVISION'; readonly divisionId: string };

// ─────────────────────────────────────────────────────────────────────────
// Subject / Context
// ─────────────────────────────────────────────────────────────────────────

export interface AuthorizationSubject {
  readonly userId: UserId;
  readonly organizationId: OrganizationId;
}

/**
 * Deliberately excludes any caller-supplied roles/permissions/scope
 * grants: the subject provides identity; the authorization engine alone
 * resolves trusted roles/permissions. `resourceId` is optional —
 * omitted for collection-level checks, present for instance-level checks.
 */
export interface AuthorizationContext {
  readonly subject: AuthorizationSubject;
  readonly action: AuthorizationAction;
  readonly resource: AuthorizationResource;
  readonly resourceId?: ResourceId;
  readonly scope?: ScopeContext;
}

// ─────────────────────────────────────────────────────────────────────────
// Decision (client/service-facing)
// ─────────────────────────────────────────────────────────────────────────

/**
 * Authentication failures are requireAuth's responsibility, not this
 * layer's — an AuthorizationContext cannot exist without an already-
 * authenticated subject. Denial reasons are therefore purely
 * authorization-space, reusing the existing ErrorCode enum rather than
 * inventing a parallel one.
 */
export type AuthorizationDenialReason = ErrorCode.INSUFFICIENT_ROLE | ErrorCode.FORBIDDEN_SCOPE;

export type AuthorizationDecision =
  | { readonly allowed: true }
  | { readonly allowed: false; readonly reason: AuthorizationDenialReason };

// ─────────────────────────────────────────────────────────────────────────
// Check result (internal diagnostic — never exposed to a client)
// ─────────────────────────────────────────────────────────────────────────

export interface AuthorizationCheckResult {
  readonly decision: AuthorizationDecision;
  readonly matchedPermissionKey?: PermissionKey;
  readonly matchedRoleId?: string;
  readonly evaluatedScope?: ScopeContext;
}
