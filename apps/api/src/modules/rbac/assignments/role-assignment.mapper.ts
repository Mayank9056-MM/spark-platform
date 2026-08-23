// apps/api/src/modules/rbac/assignments/role-assignment.mapper.ts

import type { RoleAssignment } from '@spark/database/client';

import type { ScopeContext } from '../authorization/authorization.types.js';

import type { RoleAssignmentDTO } from './role-assignment.types.js';

/**
 * Persistence → DTO boundary for the RoleAssignment domain. This must be
 * the ONLY place a Prisma `RoleAssignment` row is shaped into
 * `RoleAssignmentDTO` — route every RoleAssignment-returning endpoint
 * through this file, the same convention `role.mapper.ts`/
 * `permission.mapper.ts` establish for `Role`/`Permission` and
 * `auth.mapper.ts`'s `toPublicUser` establishes for `User`.
 *
 * Deterministic and side-effect free: no Prisma queries, no repository/
 * service calls, no authorization decisions, no audit logging, no
 * mutation of the input record. This file makes no tenant or business-
 * rule judgment — `organizationId`, `userId`, `roleId`, and
 * `grantedByUserId` are preserved exactly as supplied. Its only judgment
 * call is protecting the DTO boundary from an impossible persisted scope
 * state (see `toScopeContext` below) — that is a data-integrity check,
 * not an authorization decision.
 */

/**
 * Translates the persisted flat `scopeType`/`scopeId` columns back into
 * the domain `ScopeContext` discriminated union
 * (authorization.types.ts) — the exact reverse of
 * role-assignment.repository.ts's `scopeContextToColumns`. That function
 * owns the write direction (`ScopeContext` → columns); this one owns the
 * read direction (columns → `ScopeContext`). Neither duplicates the
 * other's logic.
 *
 * The switch is written to be exhaustive over Prisma's generated
 * `RoleAssignment['scopeType']` type: if a new `ScopeType` enum member is
 * ever added to the schema without a matching case being added here, the
 * `default` branch's `const exhaustiveCheck: never = ...` assignment
 * fails to compile — this is a genuine TypeScript exhaustiveness check
 * bridging the Prisma enum to the domain union, not a loose `as any`
 * assertion, so it is used deliberately per this task's "avoid type
 * assertions unless required to bridge a verified Prisma/domain enum
 * boundary" allowance. It also serves as a runtime guard: because Prisma
 * types are compile-time-only, a raw enum value introduced by an
 * out-of-band migration not yet reflected in the generated client could
 * still reach this function at runtime, and it will be rejected here
 * rather than silently mismapped.
 *
 * Each ORGANIZATION/DEPARTMENT/DIVISION branch also validates the
 * `scopeId` nullability invariant the schema's own CHECK constraint
 * (see schema.prisma's comment on RoleAssignment) is supposed to
 * guarantee: `scopeType = ORGANIZATION` must have a null `scopeId`, and
 * `DEPARTMENT`/`DIVISION` must have a non-null one. This mapper does not
 * trust that guarantee blindly — a boundary responsible for producing
 * authorization-relevant data must not silently coerce, default, or drop
 * data on an impossible combination. On such a state, this throws a
 * plain `Error` describing the impossible persisted row (no existing
 * mapper in this codebase — role.mapper.ts, permission.mapper.ts,
 * user.mapper.ts, auth.mapper.ts — establishes an invariant-violation
 * error convention of its own to follow instead; `jwt.ts`'s
 * `verifyAccessToken` is the closest non-HTTP-layer precedent for a
 * plain `throw new Error(...)` on a validated-but-impossible shape, and
 * this follows that same shape rather than importing `ApiError`, which
 * would introduce an HTTP-layer dependency into a pure mapper).
 */
function toScopeContext(assignment: RoleAssignment): ScopeContext {
  switch (assignment.scopeType) {
    case 'ORGANIZATION': {
      if (assignment.scopeId !== null) {
        throw new Error(
          `Invalid persisted RoleAssignment scope: scopeType=ORGANIZATION requires a null scopeId, ` +
            `but found "${assignment.scopeId}" on RoleAssignment ${assignment.id}.`,
        );
      }
      return { type: 'ORGANIZATION' };
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

/**
 * Maps every field `RoleAssignmentDTO` (role-assignment.types.ts)
 * defines — `id`, `organizationId`, `userId`, `roleId`, `scope`,
 * `validFrom`, `validUntil`, `grantedByUserId`, `createdAt`,
 * `updatedAt` — no more, no less. `userId`/`roleId` are mapped as bare
 * ids only; no nested `UserProfileDTO`/`RoleDTO` is fetched or embedded,
 * since role-assignment.repository.ts returns raw `RoleAssignment` rows
 * with no relation includes, and RoleAssignmentDTO itself has no nested
 * fields to populate. `grantedByUserId` is copied through exactly as
 * persisted — it represents who granted the assignment, not the current
 * actor, and this mapper does not rewrite or re-derive it.
 *
 * Timestamps are ISO strings, matching `RoleDTO`/`PermissionDTO`/
 * `UserProfileDTO`/`UserPublicDTO`'s existing convention. Nullable
 * `validUntil` follows the exact ternary form used by
 * `user.mapper.ts`'s `lastLoginAt` and `auth.mapper.ts`'s `lockedUntil`
 * (`x ? x.toISOString() : null`), not optional-chaining +
 * nullish-coalescing, to stay consistent with the established style.
 */
export function toRoleAssignmentDTO(assignment: RoleAssignment): RoleAssignmentDTO {
  return {
    id: assignment.id,
    organizationId: assignment.organizationId,
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

/**
 * List-mapping helper, matching `toRoleDTOList`/`toPermissionDTOList`/
 * `toUserProfileList`/`toSessionSummaryList`'s existing naming and
 * `readonly` input-array convention exactly.
 */
export function toRoleAssignmentDTOList(
  assignments: readonly RoleAssignment[],
): RoleAssignmentDTO[] {
  return assignments.map(toRoleAssignmentDTO);
}
