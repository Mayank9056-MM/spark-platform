// apps/api/src/modules/rbac/authorization/privilege-guard.ts

import { ApiError } from '../../../common/errors/ApiError.js';
import { ErrorCode } from '../../../common/errors/ErrorCodes.js';
import { toRoleAssignmentDTOList } from '../assignments/role-assignment.mapper.js';
import { roleAssignmentRepository } from '../assignments/role-assignment.repository.js';
import { permissionResolver } from '../permissions/permission-resolver.js';
import { scopeCovers } from '../scopes/scope-resolver.js';

import type { ScopeContext, UserId } from './authorization.types.js';

/**
 * Privilege-escalation guard for RBAC administration mutations.
 *
 * WHY THIS IS SEPARATE FROM authorization.service.ts:
 *
 * authorization.service.ts (and authorize() middleware) answers "does
 * this actor have permission to call this endpoint at all" — e.g.
 * roleAssignment:create. That check says nothing about WHICH role gets
 * assigned or WHICH permission gets attached to a role. Left
 * unguarded, an actor holding only roleAssignment:create could assign
 * an arbitrarily powerful role to themselves; an actor holding only
 * role:update could attach a permission they don't personally hold to
 * a role they control. Both are direct privilege-escalation paths.
 *
 * This file adds exactly one rule, applied in two places:
 *
 *   An actor must not be able to grant or attach a capability that
 *   exceeds the actor's own currently-held effective capabilities and
 *   scope.
 *
 * This is deliberately NOT a role hierarchy, NOT a numeric priority
 * system, and NOT a second authorization engine — it recombines the
 * same primitives authorization.service.ts itself is built from (an
 * actor's active RoleAssignments, the permission-resolver, and the
 * existing scopeCovers() function) to answer a different question:
 * "is this specific mutation safe", not "is this HTTP call allowed".
 *
 * WHY THIS DOES NOT IMPORT authorizationService:
 *
 * authorization.service.ts already imports role-assignment.service.ts
 * (to resolve an actor's active assignments). This guard must, in turn,
 * be callable FROM role-assignment.service.ts (to guard
 * createRoleAssignment) and FROM permission.service.ts (to guard
 * assignToRole). If this file imported authorizationService, that would
 * create authorization.service.ts <-> role-assignment.service.ts
 * circularity through this module. Instead, this file depends only on
 * the repository + mapper + resolver layer — never on
 * role-assignment.service.ts, role.service.ts, permission.service.ts,
 * or authorization.service.ts — so those four may safely import this
 * file without ever creating a cycle.
 *
 * FAIL-CLOSED: any path that cannot positively confirm the actor's
 * effective privileges (e.g. the actor holds no active assignment at
 * all) denies. Inability to determine coverage is never an implicit
 * allow.
 */

function denyEscalation(message: string): never {
  throw ApiError.forbidden(message, ErrorCode.INSUFFICIENT_ROLE);
}

/**
 * Guards RoleAssignment creation (role-assignment.service.ts).
 *
 * Rule: for EVERY permission the target role grants, the actor must
 * already hold that exact permission, via one of their OWN active
 * assignments, at a scope that covers the requested assignment's
 * scope.
 *
 * Permission and scope are deliberately checked together, from the
 * SAME actor assignment — mirroring authorization.service.ts's own
 * rule that a permission and a scope must come from the same granting
 * assignment. Combining a permission held via one assignment with a
 * broader scope held via an unrelated assignment would itself be an
 * escalation.
 *
 * A target role that currently grants no permissions (e.g. freshly
 * created, empty) trivially passes — there is nothing to escalate.
 */
export async function assertCanAssignRole(
  actorUserId: UserId,
  targetRolePermissionKeys: readonly string[],
  requestedScope: ScopeContext,
): Promise<void> {
  if (targetRolePermissionKeys.length === 0) {
    return;
  }

  const actorAssignmentRecords = await roleAssignmentRepository.findManyByUser(actorUserId, true);

  if (actorAssignmentRecords.length === 0) {
    denyEscalation(
      'You do not currently hold any active role assignment, so you cannot grant privileges to others.',
    );
  }

  const actorAssignments = toRoleAssignmentDTOList(actorAssignmentRecords);
  const uniqueActorRoleIds = [...new Set(actorAssignments.map((assignment) => assignment.roleId))];
  const actorPermissionsByRole = await permissionResolver.resolveGroupedByRole({
    roleIds: uniqueActorRoleIds,
  });

  for (const permissionKey of targetRolePermissionKeys) {
    const isCovered = actorAssignments.some((assignment) => {
      const grantedPermissions = actorPermissionsByRole.get(assignment.roleId);
      if (!grantedPermissions) {
        return false;
      }
      const grantsThisPermission = grantedPermissions.some(
        (permission) => permission.key === permissionKey,
      );
      return grantsThisPermission && scopeCovers(assignment.scope, requestedScope);
    });

    if (!isCovered) {
      denyEscalation(
        `Cannot assign a role that grants "${permissionKey}" at this scope: it exceeds your own effective privileges.`,
      );
    }
  }
}

/**
 * Guards RolePermission creation (permission.service.ts's
 * assignToRole, reached from role.service.ts's grantPermissionToRole).
 *
 * Rule: the actor must already hold the exact permission being
 * granted, via at least one of their own active assignments, at ANY
 * scope.
 *
 * RolePermission has no scope of its own — a permission is attached to
 * a role globally, not per-scope. That's not a gap: even after this
 * check passes, the permission still cannot reach a broader scope than
 * the actor holds it at, because actually EXERCISING that permission
 * requires a RoleAssignment, and creating one is independently guarded
 * by assertCanAssignRole above.
 */
export async function assertHoldsPermission(
  actorUserId: UserId,
  permissionKey: string,
): Promise<void> {
  const actorAssignmentRecords = await roleAssignmentRepository.findManyByUser(actorUserId, true);

  if (actorAssignmentRecords.length === 0) {
    denyEscalation(
      'You do not currently hold any active role assignment, so you cannot grant permissions to a role.',
    );
  }

  const uniqueActorRoleIds = [
    ...new Set(actorAssignmentRecords.map((assignment) => assignment.roleId)),
  ];
  const actorPermissionsByRole = await permissionResolver.resolveGroupedByRole({
    roleIds: uniqueActorRoleIds,
  });

  const holdsPermission = [...actorPermissionsByRole.values()].some((permissions) =>
    permissions.some((permission) => permission.key === permissionKey),
  );

  if (!holdsPermission) {
    denyEscalation(`Cannot grant a permission you do not hold yourself: "${permissionKey}".`);
  }
}
