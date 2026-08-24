// apps/api/src/modules/rbac/scopes/scope.service.ts

import { ApiError } from '../../../common/errors/ApiError.js';
import { ErrorCode } from '../../../common/errors/ErrorCodes.js';
import type { OrganizationId } from '../authorization/authorization.types.js';

import { scopeRepository } from './scope.repository.js';
import type { ScopeContext } from './scope.types.js';

/**
 * Business-logic boundary for RBAC scope OWNERSHIP. Answers exactly one
 * question: "does this ScopeContext belong to this organization?" — never
 * "is this actor allowed to use this scope" (authorization.service.ts /
 * permission-resolver.ts, which this file must not import — see
 * DEPENDENCY DIRECTION below) and never "how is a Department/Division row
 * looked up" (scope.repository.ts, the only persistence access allowed
 * here).
 *
 * `organizationId` is always an explicit, trusted parameter supplied by
 * the caller (role-assignment.service.ts, from its own already-trusted
 * organizationId) — never read from `ScopeContext` itself, never from
 * HTTP body/query/params. `ScopeContext` only ever identifies the target
 * scope (ORGANIZATION | DEPARTMENT departmentId | DIVISION divisionId);
 * it carries no tenant information of its own, matching
 * authorization.types.ts's `ScopeContext` shape exactly.
 *
 * TENANT-SAFE FAILURE, BY CONSTRUCTION: `scopeRepository
 * .departmentExistsInOrganization`/`divisionExistsInOrganization` already
 * filter by `(id, organizationId)` together in a single query — a
 * department/division that exists only under a different organizationId
 * can never make either call return `true` (see scope.repository.ts's own
 * doc comment on this). This method therefore never needs to, and never
 * does, distinguish "the target does not exist" from "the target belongs
 * to another organization" — both collapse to the same `exists === false`
 * branch and the same failure below, which is exactly the security
 * requirement: a caller can never learn that a given id exists in some
 * other tenant's data.
 *
 * ERROR CHOICE: reuses `ErrorCode.RECORD_NOT_FOUND` via
 * `ApiError.notFound(...)` — the exact code role-assignment.service.ts
 * already throws for "User not found"/"Role not found". No new code
 * (`INVALID_SCOPE`, `DEPARTMENT_NOT_FOUND`, ...) is invented.
 * `ErrorCode.FORBIDDEN_SCOPE` is deliberately NOT used: authorization
 * .types.ts defines it as part of `AuthorizationDenialReason`, i.e. an
 * *authorization decision* ("this actor may not use this scope"), which
 * is out of scope for this file (see NO AUTHORIZATION below). A missing
 * or foreign-tenant scope target is a data-existence problem, not an
 * authorization denial.
 *
 * NO AUTHORIZATION: never inspects an actor, role, permission, or
 * `AuthorizationDecision`.
 * NO AUDIT: never imports audit.service.ts — scope validation is a
 * read/business-check, not itself a mutation worth auditing; the
 * assignment mutation and its audit record remain
 * role-assignment.service.ts's job.
 * NO TRANSACTION: read-only business validation that must complete
 * before role-assignment.service.ts opens its own `prisma.$transaction`
 * for the actual insert + audit write — it never participates in that
 * transaction itself.
 * NO PRISMA: all persistence goes through `scopeRepository`.
 *
 * DEPENDENCY DIRECTION: imports only `scope.repository.ts`,
 * `scope.types.ts`, and `authorization.types.ts` (for the
 * `OrganizationId`/`ScopeContext` aliases already canonical there).
 * Never imports `role-assignment.service.ts`, `permission.service.ts`,
 * or `authorization.service.ts` — this stays a one-directional leaf the
 * assignment layer depends on, not the other way around.
 *
 * INTEGRATION POINT (not wired up by this file): role-assignment
 * .service.ts's `createRoleAssignment` currently passes `input.scope`
 * straight through to the repository, with its own doc comment flagging
 * that no ownership-validation infrastructure exists yet. Calling
 * `scopeService.validateScopeOwnership(organizationId, input.scope)`
 * ahead of its duplicate-assignment check would close that gap. This
 * task does not modify that file, so the call site remains a documented
 * follow-up rather than something silently patched in here.
 */
export class ScopeService {
  /**
   * Asserts that `scope` is a valid, in-tenant target for
   * `organizationId`. Resolves with no value on success; throws
   * `ApiError` (404, `RECORD_NOT_FOUND`) when the scope's target does not
   * belong to this organization. `ORGANIZATION` has no separate target to
   * look up — the organization itself IS the trusted `organizationId`
   * already supplied — so it resolves immediately with no repository
   * call.
   */
  async validateScopeOwnership(organizationId: OrganizationId, scope: ScopeContext): Promise<void> {
    switch (scope.type) {
      case 'ORGANIZATION':
        return;

      case 'DEPARTMENT': {
        const exists = await scopeRepository.departmentExistsInOrganization(
          organizationId,
          scope.departmentId,
        );
        if (!exists) {
          throw ApiError.notFound('Department not found', ErrorCode.RECORD_NOT_FOUND);
        }
        return;
      }

      case 'DIVISION': {
        const exists = await scopeRepository.divisionExistsInOrganization(
          organizationId,
          scope.divisionId,
        );
        if (!exists) {
          throw ApiError.notFound('Division not found', ErrorCode.RECORD_NOT_FOUND);
        }
        return;
      }

      default: {
        const exhaustiveCheck: never = scope;
        throw new Error(`Invalid ScopeContext: unknown scope type "${String(exhaustiveCheck)}".`);
      }
    }
  }
}

export const scopeService = new ScopeService();
