// apps/api/src/modules/rbac/scopes/scope.repository.ts

import { prisma } from '../../../lib/prisma.js';
import type { OrganizationId } from '../authorization/authorization.types.js';

import type { DepartmentId, DivisionId } from './scope.types.js';

/**
 * Persistence-only primitives for one question: does a given
 * Department/Division id belong to a given organizationId. This is the
 * database half of the "does this scope belong to this organization"
 * check that RoleAssignment's own schema comment says the RBAC service
 * MUST perform before insert (schema.prisma, on `RoleAssignment.scopeId`)
 * — the business decision of what a `false` result MEANS
 * (`ApiError.badRequest`, which `ErrorCode`, etc.) belongs to the future
 * `scope.service.ts`, not here. This file never imports an ErrorCode, an
 * ApiError, a role, a permission, or an actor — it only knows how to ask
 * Postgres "does this row exist for this tenant."
 *
 * No `ORGANIZATION`-scope method exists here on purpose: an
 * `{ type: 'ORGANIZATION' }` scope has no separate target row to resolve
 * — the organization itself is already the trusted `organizationId`
 * the caller supplies, and role-assignment.service.ts already proves
 * that organization exists by other means (the RoleAssignment's own
 * composite FKs to User/Role). Adding a pointless
 * `organizationExists(organizationId)` lookup here would just re-query
 * something already established, not add safety.
 *
 * Department and Division carry NO `deletedAt` column (confirmed against
 * schema.prisma directly — unlike Role/User, neither model in DOMAIN 2
 * of the schema is soft-deletable), so there is no `includeDeleted`
 * parameter to plumb through here, and no soft-delete semantics decision
 * to make: every row that exists is, as far as this schema is concerned,
 * a valid scope target. If soft-delete is ever added to these models,
 * that is a schema change this repository would need to be revisited
 * for — not something to speculatively guard against today.
 *
 * Both `Department` and `Division` declare `@@unique([organizationId, id])`
 * in schema.prisma, exactly like `Role`/`User` — so, as with
 * `RoleRepository.existsByKey`/`UserRepository.existsByEmail`, a `count()`
 * whose `where` includes both `id` and `organizationId` is answered
 * through that composite index, not a full-table scan filtered in
 * application code. Tenant isolation is therefore part of the database
 * predicate itself: a `departmentId` that exists only under a different
 * `organizationId` can never make either method below return `true`,
 * because the `organizationId` filter is applied inside the same query
 * that looks up `id` — there is no separate "fetch then compare" step
 * for a caller to bypass.
 *
 * Read-only, so — matching role.repository.ts's/user.repository.ts's/
 * role-assignment.repository.ts's own stated convention ("read-only
 * methods use the singleton directly") — these methods close over the
 * `prisma` singleton rather than accepting a `Db`/`tx` parameter. The
 * expected caller (a future `scope.service.ts`, itself called from
 * `role-assignment.service.ts` before that service opens its
 * `prisma.$transaction(...)` for the actual insert + audit write, the
 * same "check first, transact second" shape `existsActive()` already
 * uses in role-assignment.repository.ts) does not need this check to
 * participate in that later transaction — it only needs an answer before
 * one begins.
 *
 * `count()` rather than `findFirst()`/`findUnique()` — same idiom as
 * `RoleRepository.existsByKey`/`UserRepository.existsByEmail`/
 * `RoleAssignmentRepository.existsActive`: the caller only ever needs a
 * boolean, so there is no reason to materialize a full `Department`/
 * `Division` row (or even a single selected column) for a question this
 * narrow.
 */
export class ScopeRepository {
  /**
   * Tenant-safe existence check for a `DEPARTMENT` scope target.
   * Corresponds directly to `Department.id` + `Department.organizationId`
   * in schema.prisma; no other field is read or asserted.
   */
  async departmentExistsInOrganization(
    organizationId: OrganizationId,
    departmentId: DepartmentId,
  ): Promise<boolean> {
    const count = await prisma.department.count({
      where: { id: departmentId, organizationId },
    });
    return count > 0;
  }

  /**
   * Tenant-safe existence check for a `DIVISION` scope target.
   * Corresponds directly to `Division.id` + `Division.organizationId` —
   * `Division` carries `organizationId` directly on the row (it is not
   * derived through `division.department.organizationId`), so this is a
   * single-table lookup, not a join through `Department`. Confirmed
   * against schema.prisma; not assumed. Deliberately does not also
   * verify `Division.departmentId` here — this method answers only "does
   * this division belong to this organization," the exact question
   * `ScopeContext`'s `DIVISION` variant asks; it says nothing about, and
   * is not responsible for, any department/division consistency
   * invariant elsewhere in the domain.
   */
  async divisionExistsInOrganization(
    organizationId: OrganizationId,
    divisionId: DivisionId,
  ): Promise<boolean> {
    const count = await prisma.division.count({
      where: { id: divisionId, organizationId },
    });
    return count > 0;
  }
}

export const scopeRepository = new ScopeRepository();
