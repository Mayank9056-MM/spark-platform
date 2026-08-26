// apps/api/src/modules/rbac/assignments/role-assignment.service.ts

import { ApiError } from '../../../common/errors/ApiError.js';
import { ErrorCode } from '../../../common/errors/ErrorCodes.js';
import { prisma } from '../../../lib/prisma.js';
import { recordAuditTx } from '../../audit/audit.service.js';
import { AuditEntityType } from '../../audit/audit.types.js';
import { userRepository } from '../../user/user.repository.js';
import type { UserId } from '../authorization/authorization.types.js';
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

import { roleAssignmentLogger } from '@/lib/logger.js';

/**
 * Business-logic layer for RoleAssignment.
 *
 * This service determines whether a role-assignment operation is
 * structurally and semantically valid. It does not perform authorization
 * decisions and does not access Prisma directly except for transactions
 * that atomically combine repository mutations with audit records.
 *
 * The application is single-college, so there is no organization/tenant
 * context in the RoleAssignment service.
 */

export class RoleAssignmentService {
  // ── Create ────────────────────────────────────────────────────────

  /**
   * Creates a role assignment.
   *
   * Flow:
   *
   * 1. Verify the target user exists.
   * 2. Verify the target role exists.
   * 3. Validate the scope target.
   * 4. Resolve effective validFrom.
   * 5. Validate validUntil ordering.
   * 6. Perform a best-effort duplicate-active check.
   * 7. Persist assignment + audit atomically.
   * 8. Map persistence result to DTO.
   */
  async createRoleAssignment(
    actorUserId: string,
    input: CreateRoleAssignmentInput,
  ): Promise<RoleAssignmentDTO> {
    const targetUser = await userRepository.findById(input.userId);
    if (!targetUser) {
      throw ApiError.notFound('User not found', ErrorCode.RECORD_NOT_FOUND);
    }

    const targetRole = await roleRepository.findById(input.roleId);
    if (!targetRole) {
      throw ApiError.notFound('Role not found', ErrorCode.RECORD_NOT_FOUND);
    }

    await scopeService.validateScopeOwnership(input.scope);

    const now = new Date();
    const effectiveValidFrom = input.validFrom ?? now;

    if (input.validUntil !== undefined && input.validUntil <= effectiveValidFrom) {
      throw ApiError.badRequest(
        'validUntil must be strictly after validFrom',
        ErrorCode.VALIDATION_ERROR,
      );
    }

    /**
     * Best-effort duplicate check.
     *
     * This is not a concurrency guarantee because RoleAssignment does
     * not currently have a database uniqueness constraint covering the
     * complete assignment identity.
     */
    const alreadyActive = await roleAssignmentRepository.existsActive(
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
      const assignment = await roleAssignmentRepository.create(tx, actorUserId, {
        userId: input.userId,
        roleId: input.roleId,
        scope: input.scope,
        validFrom: effectiveValidFrom,
        ...(input.validUntil !== undefined && { validUntil: input.validUntil }),
      });

      await recordAuditTx(tx, {
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
      userId: created.userId,
      roleId: created.roleId,
      actorUserId,
    });

    return toRoleAssignmentDTO(created);
  }

  // ── Read ──────────────────────────────────────────────────────────

  /** Tenant-safe by construction — delegates directly to the repository's own `organizationId`-scoped `findById`, never a global lookup. */
  async getById(roleAssignmentId: RoleAssignmentId): Promise<RoleAssignmentDTO> {
    const assignment = await roleAssignmentRepository.findById(roleAssignmentId);
    if (!assignment) {
      throw ApiError.notFound('Role assignment not found', ErrorCode.RECORD_NOT_FOUND);
    }
    return toRoleAssignmentDTO(assignment);
  }

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

  /**
   * Returns the subject's currently active role assignments — validFrom
   * <= now and (validUntil is null or validUntil > now) — mapped to the
   * domain DTO shape (including the domain ScopeContext derived from the
   * persisted flat scopeType/scopeId columns, not the raw Prisma row).
   *
   * This exists specifically for authorization.service.ts, which needs a
   * user's active grants to evaluate an authorization request. It must
   * not query Prisma directly or re-derive the active-assignment time
   * window itself — both already belong to roleAssignmentRepository.
   * findManyByUser. This method is the minimal service-layer read that
   * lets authorization.service.ts stay within the established
   * repository/service boundary while still getting ScopeContext-shaped
   * results (via the existing mapper) rather than flat persistence rows.
   */
  async getActiveAssignmentsForUser(userId: UserId): Promise<RoleAssignmentDTO[]> {
    const assignments = await roleAssignmentRepository.findManyByUser(userId, true);
    return toRoleAssignmentDTOList(assignments);
  }

  // ── Revoke ────────────────────────────────────────────────────────

  /**
   * Ends the assignment by setting validUntil to the current timestamp.
   *
   * The underlying row is retained for RBAC history and auditability.
   */
  async revokeRoleAssignment(
    actorUserId: string,
    roleAssignmentId: RoleAssignmentId,
  ): Promise<RoleAssignmentDTO> {
    const existing = await roleAssignmentRepository.findById(roleAssignmentId);
    if (!existing) {
      throw ApiError.notFound('Role assignment not found', ErrorCode.RECORD_NOT_FOUND);
    }

    const now = new Date();

    const revoked = await prisma.$transaction(async (tx) => {
      const result = await roleAssignmentRepository.revoke(tx, existing.id, now);
      if (!result) {
        throw ApiError.notFound('Role assignment not found', ErrorCode.RECORD_NOT_FOUND);
      }

      await recordAuditTx(tx, {
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
      userId: existing.userId,
      roleId: existing.roleId,
      actorUserId,
    });

    return toRoleAssignmentDTO(revoked);
  }
}

export const roleAssignmentService = new RoleAssignmentService();
