// apps/api/src/modules/rbac/authorization/authorization.service.ts

import { ApiError } from '../../../common/errors/ApiError.js';
import { ErrorCode } from '../../../common/errors/ErrorCodes.js';
import { roleAssignmentService } from '../assignments/role-assignment.service.js';
import type { RoleAssignmentDTO } from '../assignments/role-assignment.types.js';
import { permissionResolver } from '../permissions/permission-resolver.js';
import { scopeCovers } from '../scopes/scope-resolver.js';

import type {
  AuthorizationCheckResult,
  AuthorizationContext,
  PermissionKey,
} from './authorization.types.js';

/**
 * The central RBAC authorization decision engine.
 *
 * This service answers exactly one question:
 *
 *   "Given this AuthorizationContext, is the subject allowed to perform
 *   this action on this resource (optionally within this scope)?"
 *
 * It composes three already-implemented layers rather than reimplementing
 * any of them:
 *
 *   role-assignment.service.ts  → which roles/scopes does this user
 *                                  currently, actively hold?
 *   permission-resolver.ts      → what permissions do those roles grant?
 *   scope-resolver.ts           → does a granted scope cover the
 *                                  requested scope?
 *
 * This service owns only the correlation and the final ALLOW/DENY
 * decision. It does not resolve role assignments itself, does not
 * resolve permissions itself, does not evaluate scope coverage itself,
 * and does not validate that a scope target exists (that is
 * scope.service.ts's validateScopeOwnership, a separate concern from
 * authorization — a scope can be a perfectly valid, existing Department
 * and still not be covered by the subject's grants).
 *
 * Single-college architecture: there is no organizationId/tenantId
 * anywhere in this file, and none should be added. COLLEGE is the top
 * of the scope hierarchy, not a stand-in tenant boundary.
 *
 * Authentication is out of scope here. This service receives an already-
 * authenticated AuthorizationSubject; it never verifies JWTs, sessions,
 * or credentials.
 */
export class AuthorizationService {
  async check(context: AuthorizationContext): Promise<AuthorizationCheckResult> {
    const assignments = await roleAssignmentService.getActiveAssignmentsForUser(
      context.subject.userId,
    );

    if (assignments.length === 0) {
      return {
        decision: { allowed: false, reason: ErrorCode.INSUFFICIENT_ROLE },
      };
    }

    const uniqueRoleIds = [...new Set(assignments.map((assignment) => assignment.roleId))];

    const permissionsByRole = await permissionResolver.resolveGroupedByRole({
      roleIds: uniqueRoleIds,
    });

    const requestedPermissionKey: PermissionKey = `${context.resource}:${context.action}`;

    let matchedPermissionKey: PermissionKey | undefined;

    for (const assignment of assignments) {
      if (!this.assignmentGrantsPermission(assignment, permissionsByRole, requestedPermissionKey)) {
        continue;
      }

      matchedPermissionKey = requestedPermissionKey;

      if (context.scope === undefined) {
        return {
          decision: { allowed: true },
          matchedPermissionKey: requestedPermissionKey,
          matchedRoleId: assignment.roleId,
        };
      }

      if (scopeCovers(assignment.scope, context.scope)) {
        return {
          decision: { allowed: true },
          matchedPermissionKey: requestedPermissionKey,
          matchedRoleId: assignment.roleId,
          evaluatedScope: context.scope,
        };
      }
    }

    if (matchedPermissionKey === undefined) {
      return {
        decision: { allowed: false, reason: ErrorCode.INSUFFICIENT_ROLE },
      };
    }

    return {
      decision: { allowed: false, reason: ErrorCode.FORBIDDEN_SCOPE },
      matchedPermissionKey,
    };
  }

  /**
   * Pure interpretation of check() — never a second authorization
   * algorithm.
   */
  async isAllowed(context: AuthorizationContext): Promise<boolean> {
    const result = await this.check(context);
    return result.decision.allowed;
  }

  /**
   * Throws the project's established forbidden error when check()
   * denies, using the existing ErrorCode taxonomy. Never returns an HTTP
   * response itself — that remains the caller's (eventual middleware's)
   * responsibility.
   */
  async authorize(context: AuthorizationContext): Promise<void> {
    const result = await this.check(context);

    if (result.decision.allowed) {
      return;
    }

    if (result.decision.reason === ErrorCode.INSUFFICIENT_ROLE) {
      throw ApiError.forbidden(
        'You do not have the required role or permission to perform this action',
        ErrorCode.INSUFFICIENT_ROLE,
      );
    }

    throw ApiError.forbidden(
      'You do not have access to the requested scope',
      ErrorCode.FORBIDDEN_SCOPE,
    );
  }

  /**
   * Whether the given assignment's role grants the requested permission.
   * Exact key match only — no prefix/partial/case-insensitive matching.
   */
  private assignmentGrantsPermission(
    assignment: RoleAssignmentDTO,
    permissionsByRole: ReadonlyMap<string, { readonly key: string }[]>,
    requestedPermissionKey: PermissionKey,
  ): boolean {
    const rolePermissions = permissionsByRole.get(assignment.roleId);
    if (!rolePermissions) {
      return false;
    }
    return rolePermissions.some((permission) => permission.key === requestedPermissionKey);
  }
}

export const authorizationService = new AuthorizationService();
