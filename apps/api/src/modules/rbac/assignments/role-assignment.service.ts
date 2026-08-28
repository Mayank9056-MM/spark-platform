// apps/api/src/modules/rbac/assignments/role-assignment.service.ts

import { ApiError } from '../../../common/errors/ApiError.js';
import { ErrorCode } from '../../../common/errors/ErrorCodes.js';
import { prisma } from '../../../lib/prisma.js';
import { recordAuditTx } from '../../audit/audit.service.js';
import { AuditEntityType } from '../../audit/audit.types.js';
import { userRepository } from '../../user/user.repository.js';
import type { UserId } from '../authorization/authorization.types.js';
import { assertCanAssignRole } from '../authorization/privilege-guard.js';
import { permissionResolver } from '../permissions/permission-resolver.js';
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
   * 4. Privilege-escalation guard: the actor may not assign a role that
   *    grants privileges exceeding their own effective privileges and
   *    scope (see authorization/privilege-guard.ts).
   * 5. Resolve effective validFrom.
   * 6. Validate validUntil ordering.
   * 7. Perform a best-effort duplicate-active check.
   * 8. Persist assignment + audit atomically.
   * 9. Map persistence result to DTO.
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

    /**
     * PRIVILEGE-ESCALATION GUARD — see authorization/privilege-guard.ts
     * for the full rationale. authorize('roleAssignment', 'create') has
     * already confirmed the actor may call this endpoint; it says
     * nothing about WHICH role or WHICH scope. This is the check that
     * does: the actor may not hand out a role whose granted permissions,
     * at this scope, exceed what the actor already effectively holds.
     */
    const targetRolePermissions = await permissionResolver.resolve({ roleIds: [input.roleId] });
    await assertCanAssignRole(
      actorUserId,
      targetRolePermissions.map((permission) => permission.key),
      input.scope,
    );

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

  async getActiveAssignmentsForUser(userId: UserId): Promise<RoleAssignmentDTO[]> {
    const assignments = await roleAssignmentRepository.findManyByUser(userId, true);
    return toRoleAssignmentDTOList(assignments);
  }

  // ── Revoke ────────────────────────────────────────────────────────

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
