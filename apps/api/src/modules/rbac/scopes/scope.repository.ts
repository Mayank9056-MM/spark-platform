// apps/api/src/modules/rbac/scopes/scope.repository.ts

import { prisma } from '../../../lib/prisma.js';

import type { DepartmentId, DivisionId } from './scope.types.js';

/**
 * Persistence-only primitives for scope validation.
 *
 * The application uses a single-college architecture, so there is no
 * organizationId/tenant context in this repository.
 *
 * This repository answers only whether a referenced Department or Division
 * exists in the database, plus (see findDepartmentIdForDivision below) the
 * one trusted structural relationship the scope-coverage layer needs.
 * Business semantics for invalid scope targets belong to scope.service.ts.
 *
 * This file intentionally contains:
 * - no ApiError
 * - no ErrorCode
 * - no authorization logic
 * - no role/permission logic
 * - no actor/user context
 *
 * It is strictly a database-access boundary.
 *
 * Department and Division are not currently soft-deletable, so an existing
 * row is considered a valid persistence target. If soft-delete is introduced
 * later, the repository should be updated together with that schema change.
 *
 * Read-only methods use the shared Prisma singleton, consistent with the
 * repository conventions used throughout the RBAC module.
 */
export class ScopeRepository {
  /**
   * Checks whether a Department exists.
   *
   * No organization/tenant predicate is required because this application
   * represents a single college.
   */
  async departmentExistsInOrganization(departmentId: DepartmentId): Promise<boolean> {
    const count = await prisma.department.count({
      where: { id: departmentId },
    });
    return count > 0;
  }

  /**
   * Checks whether a Division exists.
   *
   * Division ownership through an organization is intentionally not checked
   * because organization-level tenancy no longer exists in the application.
   *
   * This method answers only whether the referenced Division exists.
   */
  async divisionExistsInOrganization(divisionId: DivisionId): Promise<boolean> {
    const count = await prisma.division.count({
      where: { id: divisionId },
    });
    return count > 0;
  }

  /**
   * Returns the departmentId that owns the given Division, or null if the
   * Division does not exist.
   *
   * This is the only method in this repository that exposes a Department
   * ↔ Division relationship rather than a bare existence check. It exists
   * for scope-resolver.ts's DEPARTMENT-grants-DIVISION coverage check,
   * which requires a trusted relationship fact — it must never be
   * inferred by comparing IDs. Division.departmentId is a required
   * (non-nullable) column on the Prisma model, so any existing Division
   * row always has a departmentId; null here means "Division not found",
   * not "Division has no department".
   */
  async findDepartmentIdForDivision(divisionId: DivisionId): Promise<string | null> {
    const division = await prisma.division.findUnique({
      where: { id: divisionId },
      select: { departmentId: true },
    });
    return division?.departmentId ?? null;
  }
}

export const scopeRepository = new ScopeRepository();
