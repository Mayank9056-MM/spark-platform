// apps/api/src/modules/rbac/scopes/scope.service.ts

import { ApiError } from '../../../common/errors/ApiError.js';
import { ErrorCode } from '../../../common/errors/ErrorCodes.js';

import type { DivisionDepartmentFact } from './scope-resolver.js';
import { scopeRepository } from './scope.repository.js';
import type { DivisionId, ScopeContext } from './scope.types.js';

/**
 * Business-logic boundary for RBAC scope validation.
 *
 * This service answers one question:
 *
 *   "Does the supplied ScopeContext reference a valid scope target?"
 *
 * The application uses a single-college architecture, therefore there is
 * no organizationId/tenant ownership check here.
 *
 * Scope semantics:
 *
 *   COLLEGE
 *     The entire application/college. No database lookup is required.
 *
 *   DEPARTMENT
 *     The referenced department must exist.
 *
 *   DIVISION
 *     The referenced division must exist.
 *
 * This service does not:
 * - make authorization decisions
 * - inspect actors, roles, or permissions
 * - access Prisma directly
 * - write audit records
 *
 * Persistence is delegated exclusively to scopeRepository.
 */
export class ScopeService {
  /**
   * Validates that a ScopeContext references a valid scope target.
   *
   * Resolves with no value when valid.
   *
   * Throws RECORD_NOT_FOUND when a Department or Division target does not
   * exist.
   *
   * COLLEGE requires no database lookup because the application itself is
   * the single college boundary.
   */
  async validateScopeOwnership(scope: ScopeContext): Promise<void> {
    switch (scope.type) {
      case 'COLLEGE':
        return;

      case 'DEPARTMENT': {
        const exists = await scopeRepository.departmentExistsInOrganization(scope.departmentId);
        if (!exists) {
          throw ApiError.notFound('Department not found', ErrorCode.RECORD_NOT_FOUND);
        }
        return;
      }

      case 'DIVISION': {
        const exists = await scopeRepository.divisionExistsInOrganization(scope.divisionId);
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

  /**
   * Resolves the trusted Department ↔ Division relationship fact needed
   * by scope-resolver.ts's scopeCovers() when a DEPARTMENT-granted scope
   * is evaluated against a DIVISION-requested scope.
   *
   * Returns null when the Division does not exist. Callers — specifically
   * authorization.service.ts — must treat null exactly like "no fact
   * available" and let scopeCovers fail closed (return false), never
   * substitute a guessed relationship or assume coverage in its absence.
   *
   * This is a read-only lookup, not a validation call: it does not throw
   * for a missing Division. Existence validation belongs to
   * validateScopeOwnership above; this method only answers "what
   * department does this division belong to, if it exists at all".
   */
  async getDivisionDepartmentFact(divisionId: DivisionId): Promise<DivisionDepartmentFact | null> {
    const departmentId = await scopeRepository.findDepartmentIdForDivision(divisionId);

    if (departmentId === null) {
      return null;
    }

    return { divisionId, departmentId };
  }
}

export const scopeService = new ScopeService();
