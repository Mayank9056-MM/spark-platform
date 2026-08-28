// apps/api/src/modules/rbac/scopes/scope.repository.ts

import { prisma } from '../../../lib/prisma.js';

import type { DepartmentId } from './scope.types.js';

export class ScopeRepository {
  /** No organization/tenant predicate — this application represents a single college. */
  async departmentExists(departmentId: DepartmentId): Promise<boolean> {
    const count = await prisma.department.count({
      where: { id: departmentId },
    });
    return count > 0;
  }
}

export const scopeRepository = new ScopeRepository();
