// apps/api/src/modules/rbac/scopes/scope.service.ts

import { ApiError } from '../../../common/errors/ApiError.js';
import { ErrorCode } from '../../../common/errors/ErrorCodes.js';

import { scopeRepository } from './scope.repository.js';
import type { ScopeContext } from './scope.types.js';

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
        const exists = await scopeRepository.departmentExists(scope.departmentId);
        if (!exists) {
          throw ApiError.notFound('Department not found', ErrorCode.RECORD_NOT_FOUND);
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
