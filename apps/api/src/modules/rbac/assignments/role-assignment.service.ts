// apps/api/src/modules/rbac/assignments/role-assignment.service.ts

import { createChildLogger } from '@spark/shared/logger';

import { ApiError } from '../../../common/errors/ApiError.js';
import { ErrorCode } from '../../../common/errors/ErrorCodes.js';
import { prisma } from '../../../lib/prisma.js';
import { recordAuditTx } from '../../audit/audit.service.js';
import { AuditEntityType } from '../../audit/audit.types.js';
import { userRepository } from '../../user/user.repository.js';
import type { OrganizationId } from '../authorization/authorization.types.js';
import { roleRepository } from '../roles/role.repository.js';
import { scopeService } from '../scopes/scope.service.js';

import { toRoleAssignmentDTO, toRoleAssignmentDTOList } from './role-assignment.mapper.js';
import { roleAssignmentRepository } from './role-assignment.repository.js';
import type {
  CreateRoleAssignmentInput,
  ListRoleAssignmentsFilters,
  ListRoleAssignmentsOptions,
  ListRoleAssignmentsResult,
  RoleAssignmentDTO,
  RoleAssignmentId,
} from './role-assignment.types.js';

const roleAssignmentLogger = createChildLogger({ component: 'role-assignment' });

/**
 * Business-logic layer for the RoleAssignment domain. Answers "is this
 * assignment operation valid and meaningful" — never "is this actor
 * allowed to perform it" (authorization.service.ts, which does not exist
 * yet in this codebase — confirmed by inspection, not assumed) and never
 * "how is this persisted" (role-assignment.repository.ts).
 *
 * Every method that touches an existing RoleAssignment takes
 * `organizationId` as an explicit, trusted parameter — never from client
 * body/query input — matching RoleService/UserService/PermissionService's
 * established convention exactly.
 *
 * TENANT-INVARIANT NOTE (task section 6): this service never manually
 * compares `role.organizationId !== organizationId` /
 * `user.organizationId !== organizationId` anywhere. That comparison is
 * unnecessary by construction: `userRepository.findById(organizationId,
 * userId)` and `roleRepository.findById(organizationId, roleId)` are
 * themselves tenant-scoped lookups (their `where` clause includes
 * `organizationId`) — a non-null result is only possible when the
 * referenced row already belongs to that organization. Similarly, every
 * RoleAssignment this service creates/reads/revokes has its
 * `organizationId` column set exactly once, by
 * `role-assignment.repository.ts`, always from this same trusted
 * parameter — so "assignment.organizationId === trusted organizationId"
 * holds structurally, not by a runtime check added here.
 */
export class RoleAssignmentService {
  // ── Create ────────────────────────────────────────────────────────

  /**
   * Business flow:
   *  1. Resolve target user via a tenant-scoped lookup (never a global
   *     lookup + manual organizationId comparison).
   *  2. Resolve target role via a tenant-scoped lookup, same reasoning.
   *  3. Validate `input.scope` belongs to `organizationId` via
   *     `scopeService.validateScopeOwnership()` (see SCOPE-OWNERSHIP
   *     VALIDATION note below).
   *  4. Validate the validFrom/validUntil ordering invariant.
   *  5. Best-effort duplicate-active-assignment check.
   *  6. Transaction: persist + audit.
   *  7. Map, log, return.
   *
   * USER STATUS POLICY (task section 15) — DELIBERATELY NOT ENFORCED:
   * user.service.ts/user.repository.ts define no rule anywhere
   * restricting role assignment to/from a particular `UserStatus`
   * (PENDING_ACTIVATION/ACTIVE/SUSPENDED/LOCKED/DEACTIVATED/ARCHIVED).
   * The only status-gating in the codebase lives in
   * `AuthService.assertLoginAllowed`, which governs *login eligibility*,
   * a materially different concern from *assignment eligibility*. Per
   * this task's explicit instruction not to manufacture a business rule
   * that doesn't already exist, this method does not reject assignment
   * to a non-ACTIVE user. This is reported as an open policy question,
   * not silently decided either way — see this file's accompanying
   * report.
   *
   * SYSTEM-DEFINED ROLE POLICY — CONFIRMED NOT RESTRICTED:
   * role.service.ts restricts system-defined roles only for its own
   * Role-entity operations (`archiveRole` refuses to archive a
   * system-defined Role); nothing in role.service.ts — or anywhere else
   * — restricts *assigning* a system-defined role to a user. That is a
   * distinct operation this service owns, and no existing rule
   * constrains it, so system-defined roles are assignable like any
   * other role here.
   *
   * SCOPE-OWNERSHIP VALIDATION — NOW IMPLEMENTED via `scopeService`:
   * `scopeService.validateScopeOwnership(organizationId, input.scope)`
   * verifies that a DEPARTMENT/DIVISION scope's `departmentId`/
   * `divisionId` exists and belongs to `organizationId` before this
   * method proceeds to the duplicate check or the persistence
   * transaction. This closes the gap schema.prisma's own comment on
   * `RoleAssignment.scopeId` describes ("the RBAC service MUST validate
   * scopeId's tenant/existence before insert"). All three `ScopeContext`
   * variants (ORGANIZATION/DEPARTMENT/DIVISION) are handled entirely
   * inside `scopeService` — this method does not switch on
   * `input.scope.type`, query `prisma.department`/`prisma.division`, or
   * call `scopeRepository` directly; it only orchestrates the call and
   * lets `ApiError.notFound(..., ErrorCode.RECORD_NOT_FOUND)` propagate
   * unmodified on failure, exactly like the User/Role not-found checks
   * immediately above it. The check is read-only and runs before the
   * mutation transaction opens below — it does not participate in it.
   *
   * SCOPE TYPE/ID INVARIANT (task section 8) — NOT RE-CHECKED HERE:
   * `ORGANIZATION` requiring a null id and `DEPARTMENT`/`DIVISION`
   * requiring a non-null id is already guaranteed by `ScopeContext`'s
   * discriminated union at the TypeScript level, and independently
   * re-enforced by `role-assignment.validation.ts`'s
   * `z.discriminatedUnion` at the HTTP boundary before this method is
   * ever reached with `input.scope`. Re-validating the identical
   * structural invariant a third time here would duplicate the type
   * system's and validation layer's job rather than add any real
   * safety — the repository's own `scopeContextToColumns` translation
   * remains the final, exhaustive, compile-time-checked conversion.
   */
  async createRoleAssignment(
    actorUserId: string,
    organizationId: OrganizationId,
    input: CreateRoleAssignmentInput,
  ): Promise<RoleAssignmentDTO> {
    const targetUser = await userRepository.findById(organizationId, input.userId);
    if (!targetUser) {
      throw ApiError.notFound('User not found', ErrorCode.RECORD_NOT_FOUND);
    }

    const targetRole = await roleRepository.findById(organizationId, input.roleId);
    if (!targetRole) {
      throw ApiError.notFound('Role not found', ErrorCode.RECORD_NOT_FOUND);
    }

    // Tenant-ownership check for the assignment's scope target (task:
    // "Organization A + Department belonging to Organization B" must
    // fail here, before any duplicate check or mutation). Centralized
    // entirely in scopeService — see the SCOPE-OWNERSHIP VALIDATION note
    // above. Any ApiError this throws propagates unchanged.
    await scopeService.validateScopeOwnership(organizationId, input.scope);

    // "Effective now" default (task section 10): resolved once, here, so
    // the persisted row and the audit record it's paired with agree
    // exactly — never letting the database's own `@default(now())` and
    // this service's audit write independently generate two different
    // timestamps for what is conceptually a single point in time.
    const now = new Date();
    const effectiveValidFrom = input.validFrom ?? now;

    if (input.validUntil !== undefined && input.validUntil <= effectiveValidFrom) {
      throw ApiError.badRequest(
        'validUntil must be strictly after validFrom',
        ErrorCode.VALIDATION_ERROR,
      );
    }

    // Fast-path duplicate check only — NOT a concurrency guarantee.
    // role-assignment.repository.ts's own `existsActive` doc comment
    // documents why: unlike PermissionRepository.hasAssignment (backed by
    // RolePermission's composite primary key, so a genuine race still
    // gets caught by the database as a P2002 on the real insert),
    // RoleAssignment has NO `@@unique` constraint at all — a race between
    // this check and the `create()` below has no database-level backstop.
    // This also only detects a CURRENTLY-active identical
    // (user, role, scope) assignment, not general overlapping-validity-
    // window duplicates — a full interval-overlap check would need
    // repository infrastructure this codebase doesn't have yet, and
    // inventing it is out of scope for this task.
    const alreadyActive = await roleAssignmentRepository.existsActive(
      organizationId,
      input.userId,
      input.roleId,
      input.scope,
    );
    if (alreadyActive) {
      throw ApiError.conflict(
        'An active assignment for this user, role, and scope already exists',
        ErrorCode.DUPLICATE_ENTRY,
      );
    }

    const created = await prisma.$transaction(async (tx) => {
      const assignment = await roleAssignmentRepository.create(tx, organizationId, actorUserId, {
        userId: input.userId,
        roleId: input.roleId,
        scope: input.scope,
        validFrom: effectiveValidFrom,
        // Conditional spread rather than `validUntil: input.validUntil` —
        // the project compiles with `exactOptionalPropertyTypes: true`,
        // under which an optional `Date` field rejects an explicit
        // `undefined` value (`{ validUntil: undefined }` is not the same
        // as omitting the key). This is the same
        // `...(x !== undefined && { x })` idiom already used throughout
        // role.repository.ts/user.repository.ts for identical reasons.
        ...(input.validUntil !== undefined && { validUntil: input.validUntil }),
      });

      await recordAuditTx(tx, {
        organizationId,
        actorUserId,
        action: 'ROLE_GRANTED',
        entityType: AuditEntityType.ROLE_ASSIGNMENT,
        entityId: assignment.id,
        newValue: {
          userId: assignment.userId,
          roleId: assignment.roleId,
          scope: input.scope,
          validFrom: assignment.validFrom.toISOString(),
          validUntil: assignment.validUntil ? assignment.validUntil.toISOString() : null,
          grantedByUserId: actorUserId,
        },
      });

      return assignment;
    });

    roleAssignmentLogger.info('Role assignment created', {
      roleAssignmentId: created.id,
      organizationId,
      userId: created.userId,
      roleId: created.roleId,
      actorUserId,
    });

    return toRoleAssignmentDTO(created);
  }

  // ── Read ──────────────────────────────────────────────────────────

  /** Tenant-safe by construction — delegates directly to the repository's own `organizationId`-scoped `findById`, never a global lookup. */
  async getById(
    organizationId: OrganizationId,
    roleAssignmentId: RoleAssignmentId,
  ): Promise<RoleAssignmentDTO> {
    const assignment = await roleAssignmentRepository.findById(organizationId, roleAssignmentId);
    if (!assignment) {
      throw ApiError.notFound('Role assignment not found', ErrorCode.RECORD_NOT_FOUND);
    }
    return toRoleAssignmentDTO(assignment);
  }

  /**
   * `filters.organizationId` travels as part of the filters object
   * itself (matching `RoleService.listRoles`'s identical convention for
   * `ListRolesFilters`) — the caller/controller is responsible for
   * populating it from trusted server context, never from client query
   * input; this method does not re-derive or override it. No separate
   * `listByUser`/`listByRole` methods are added: `ListRoleAssignmentsFilters`
   * already supports `userId`/`roleId` as optional filters, so a generic
   * call with one of those set covers the identical use case without
   * duplicating API surface.
   */
  async listRoleAssignments(
    filters: ListRoleAssignmentsFilters,
    options: ListRoleAssignmentsOptions,
  ): Promise<ListRoleAssignmentsResult> {
    const result = await roleAssignmentRepository.findMany(filters, options);
    return {
      roleAssignments: toRoleAssignmentDTOList(result.roleAssignments),
      total: result.total,
    };
  }

  // ── Revoke ────────────────────────────────────────────────────────

  /**
   * Sets `validUntil` to "now" — never a physical delete.
   * role-assignment.repository.ts exposes no `delete()` at all (no
   * `deletedAt` column exists on this model; RBAC history is
   * security/audit-sensitive), so this is the only lifecycle-ending
   * operation available, matching the architecture's own established
   * shape.
   *
   * IDEMPOTENCY DECISION: this does NOT check whether the assignment is
   * already revoked/expired before proceeding, and does not throw a
   * conflict in that case — it simply re-applies `validUntil = now`.
   * This mirrors the two closest existing lifecycle precedents in the
   * codebase: `AuthService.revokeSession` revokes unconditionally after
   * an ownership check with no "already revoked" special case, and
   * `RoleService.archiveRole` has no "already archived" check either.
   * Neither establishes a conflict-on-already-terminal-state convention
   * for this task to follow, so none is invented here.
   *
   * Resolves the target via `findById` BEFORE the transaction (for the
   * not-found error and to capture the prior `validUntil` for the audit
   * record's `oldValue`), then calls the repository's `revoke()` inside
   * the transaction. `revoke()` can still return `null` even after that
   * pre-check succeeded — role-assignment.repository.ts documents why:
   * unlike Role/User (which have `@@unique([organizationId, id])` and so
   * can use a throwing `update()`), RoleAssignment has no such
   * constraint, so its `revoke()` uses `updateMany` + a `count === 0` →
   * `null` result instead of a Prisma-thrown P2025. This method treats
   * that residual, narrow race the same as not-found rather than
   * silently swallowing it.
   */
  async revokeRoleAssignment(
    actorUserId: string,
    organizationId: OrganizationId,
    roleAssignmentId: RoleAssignmentId,
  ): Promise<RoleAssignmentDTO> {
    const existing = await roleAssignmentRepository.findById(organizationId, roleAssignmentId);
    if (!existing) {
      throw ApiError.notFound('Role assignment not found', ErrorCode.RECORD_NOT_FOUND);
    }

    const now = new Date();

    const revoked = await prisma.$transaction(async (tx) => {
      const result = await roleAssignmentRepository.revoke(tx, organizationId, existing.id, now);
      if (!result) {
        throw ApiError.notFound('Role assignment not found', ErrorCode.RECORD_NOT_FOUND);
      }

      await recordAuditTx(tx, {
        organizationId,
        actorUserId,
        action: 'ROLE_REVOKED',
        entityType: AuditEntityType.ROLE_ASSIGNMENT,
        entityId: existing.id,
        oldValue: {
          validUntil: existing.validUntil ? existing.validUntil.toISOString() : null,
        },
        newValue: {
          validUntil: result.validUntil ? result.validUntil.toISOString() : null,
        },
      });

      return result;
    });

    roleAssignmentLogger.info('Role assignment revoked', {
      roleAssignmentId: existing.id,
      organizationId,
      userId: existing.userId,
      roleId: existing.roleId,
      actorUserId,
    });

    return toRoleAssignmentDTO(revoked);
  }
}

export const roleAssignmentService = new RoleAssignmentService();
