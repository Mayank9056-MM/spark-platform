// apps/api/src/modules/rbac/assignments/role-assignment.mapper.ts

import type { RoleAssignment } from '@spark/database/client';

import type { ScopeContext } from '../authorization/authorization.types.js';

import type { RoleAssignmentDTO } from './role-assignment.types.js';

/**
 * Persistence → DTO boundary for the RoleAssignment domain.
 *
 * This mapper is responsible only for converting the persisted
 * RoleAssignment representation into the API/domain DTO representation.
 *
 * It does not:
 * - query the database
 * - perform authorization
 * - validate ownership
 * - write audit records
 * - mutate persistence data
 *
 * Tenant/organization information is intentionally absent because this
 * application is single-college. Authorization scope is represented by
 * ScopeContext through COLLEGE, DEPARTMENT, or DIVISION.
 */

/**
 * Converts the persisted scopeType/scopeId representation into the
 * domain ScopeContext discriminated union.
 *
 * Persistence representation:
 *
 *   COLLEGE      → scopeId = null
 *   DEPARTMENT   → scopeId = department id
 *   DIVISION     → scopeId = division id
 *
 * Impossible persisted combinations are rejected rather than silently
 * coerced into a valid-looking scope.
 */
function toScopeContext(assignment: RoleAssignment): ScopeContext {
  switch (assignment.scopeType) {
    case 'COLLEGE': {
      if (assignment.scopeId !== null) {
        throw new Error(
          `Invalid persisted RoleAssignment scope: scopeType=COLLEGE requires a null scopeId, ` +
            `but found "${assignment.scopeId}" on RoleAssignment ${assignment.id}.`,
        );
      }
      return { type: 'COLLEGE' };
    }

    case 'DEPARTMENT': {
      if (assignment.scopeId === null) {
        throw new Error(
          `Invalid persisted RoleAssignment scope: scopeType=DEPARTMENT requires a non-null scopeId, ` +
            `but found null on RoleAssignment ${assignment.id}.`,
        );
      }
      return { type: 'DEPARTMENT', departmentId: assignment.scopeId };
    }

    case 'DIVISION': {
      if (assignment.scopeId === null) {
        throw new Error(
          `Invalid persisted RoleAssignment scope: scopeType=DIVISION requires a non-null scopeId, ` +
            `but found null on RoleAssignment ${assignment.id}.`,
        );
      }
      return { type: 'DIVISION', divisionId: assignment.scopeId };
    }

    default: {
      const exhaustiveCheck: never = assignment.scopeType;
      throw new Error(
        `Invalid persisted RoleAssignment scope: unknown scopeType "${String(exhaustiveCheck)}" ` +
          `on RoleAssignment ${assignment.id}.`,
      );
    }
  }
}

export function toRoleAssignmentDTO(assignment: RoleAssignment): RoleAssignmentDTO {
  return {
    id: assignment.id,
    userId: assignment.userId,
    roleId: assignment.roleId,
    scope: toScopeContext(assignment),
    validFrom: assignment.validFrom.toISOString(),
    validUntil: assignment.validUntil ? assignment.validUntil.toISOString() : null,
    grantedByUserId: assignment.grantedByUserId,
    createdAt: assignment.createdAt.toISOString(),
    updatedAt: assignment.updatedAt.toISOString(),
  };
}

export function toRoleAssignmentDTOList(
  assignments: readonly RoleAssignment[],
): RoleAssignmentDTO[] {
  return assignments.map(toRoleAssignmentDTO);
}
