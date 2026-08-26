// apps/api/src/modules/rbac/authorization/authorization.service.ts

import { ApiError } from '../../../common/errors/ApiError.js';
import { ErrorCode } from '../../../common/errors/ErrorCodes.js';
import { roleAssignmentService } from '../assignments/role-assignment.service.js';
import type { RoleAssignmentDTO } from '../assignments/role-assignment.types.js';
import { permissionResolver } from '../permissions/permission-resolver.js';
import type { DivisionDepartmentFact } from '../scopes/scope-resolver.js';
import { scopeCovers } from '../scopes/scope-resolver.js';
import { scopeService } from '../scopes/scope.service.js';

import type {
  AuthorizationCheckResult,
  AuthorizationContext,
  PermissionKey,
  ScopeContext,
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
  /**
   * Evaluates an AuthorizationContext and returns a diagnostic decision.
   *
   * Algorithm:
   *
   * 1. Resolve the subject's currently active role assignments.
   *    No active assignments → INSUFFICIENT_ROLE.
   *
   * 2. Resolve the effective permissions for the subject's distinct role
   *    IDs in a single batched, per-role-grouped query (no N+1 queries —
   *    one query regardless of how many assignments/roles the subject
   *    has).
   *
   * 3. Evaluate each active assignment independently, in order:
   *      a. Does THIS assignment's role grant the requested permission
   *         (`${resource}:${action}`, exact match only)?
   *         If not, move to the next assignment. Permission and scope
   *         are never combined across different assignments — see the
   *         security note below.
   *      b. If the requested scope is absent, this is a collection-level
   *         check: a permission match alone is sufficient → ALLOW.
   *      c. If a requested scope is present, does THIS assignment's
   *         granted scope cover the requested scope (via scopeCovers)?
   *         If yes → ALLOW.
   *
   * 4. If no assignment granted the permission at all → INSUFFICIENT_ROLE.
   *
   * 5. If at least one assignment granted the permission but none
   *    covered the requested scope → FORBIDDEN_SCOPE.
   *
   * SECURITY — permission/scope correlation:
   * A permission resolved from Role A must never be combined with a
   * scope granted by Role B. Example: Role A grants `student:read` at
   * DIVISION X; Role B grants nothing relevant but happens to be scoped
   * COLLEGE-wide. The subject must NOT be treated as having
   * `student:read` at COLLEGE scope. This is why permissions are grouped
   * per-role (not flattened into one set) and each assignment is
   * evaluated on its own terms.
   *
   * SCOPE SEMANTICS:
   * - `context.scope === undefined` → global/collection check. A
   *   permission match is sufficient; no implicit COLLEGE requirement is
   *   assumed.
   * - `context.scope = { type: 'COLLEGE' }` → requires an assignment
   *   whose granted scope covers COLLEGE, i.e. a COLLEGE-scoped
   *   assignment. This is a stricter, explicit request and is NOT
   *   equivalent to an absent scope.
   *
   * FAIL-CLOSED:
   * When a candidate assignment is granted at DEPARTMENT and the
   * requested scope is DIVISION, scopeCovers needs a trusted
   * DivisionDepartmentFact to know whether that division belongs to that
   * department. That fact is resolved through scopeService — never
   * guessed from matching ID strings. If the division does not exist (or
   * the lookup yields nothing), scopeCovers is called without a fact and
   * safely returns false. Unknown never means allowed.
   *
   * DETERMINISM:
   * Active assignments and grouped permissions are each fetched with one
   * query; the assignment list is evaluated in the order returned by the
   * repository/mapper. No random selection, no mutation of inputs.
   *
   * `context.resourceId` is intentionally not used here. This service
   * performs collection/resource-type-level and scope-level authorization
   * only; it does not verify ownership or any other instance-level
   * relationship between the subject and a specific resource instance.
   * That is a distinct, not-yet-implemented resource-policy layer —
   * `resourceId` is passed through the type for future use, not acted on
   * by this algorithm.
   */
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

    // Resolved lazily, at most once per distinct requested divisionId,
    // for the lifetime of this single check() call — only DEPARTMENT
    // grant → DIVISION request combinations ever need it.
    const divisionDepartmentFactCache = new Map<string, DivisionDepartmentFact | null>();

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

      const divisionDepartmentFact = await this.resolveDivisionDepartmentFactIfNeeded(
        assignment.scope,
        context.scope,
        divisionDepartmentFactCache,
      );

      if (scopeCovers(assignment.scope, context.scope, divisionDepartmentFact)) {
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

  /**
   * Resolves a trusted DivisionDepartmentFact only for the one case
   * scopeCovers actually needs it: a DEPARTMENT-granted scope evaluated
   * against a DIVISION-requested scope. Every other combination is a
   * pure, fact-free comparison and this returns undefined immediately.
   *
   * Caches by requested divisionId for the lifetime of one check() call
   * so multiple DEPARTMENT-granting candidate assignments checked
   * against the same requested DIVISION do not repeat the lookup.
   */
  private async resolveDivisionDepartmentFactIfNeeded(
    grantedScope: ScopeContext,
    requestedScope: ScopeContext,
    cache: Map<string, DivisionDepartmentFact | null>,
  ): Promise<DivisionDepartmentFact | undefined> {
    if (grantedScope.type !== 'DEPARTMENT' || requestedScope.type !== 'DIVISION') {
      return undefined;
    }

    const cached = cache.get(requestedScope.divisionId);
    if (cached !== undefined) {
      return cached ?? undefined;
    }

    const fact = await scopeService.getDivisionDepartmentFact(requestedScope.divisionId);
    cache.set(requestedScope.divisionId, fact);
    return fact ?? undefined;
  }
}

export const authorizationService = new AuthorizationService();
