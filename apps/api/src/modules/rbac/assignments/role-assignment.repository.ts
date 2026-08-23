// apps/api/src/modules/rbac/assignments/role-assignment.repository.ts

import type { Prisma, PrismaClient, RoleAssignment, ScopeType } from '@spark/database/client';

import { prisma } from '../../../lib/prisma.js';
import type { OrganizationId, ScopeContext, UserId } from '../authorization/authorization.types.js';
import type { RoleId } from '../roles/role.types.js';

import type {
  CreateRoleAssignmentInput,
  ListRoleAssignmentsFilters,
  ListRoleAssignmentsOptions,
  RoleAssignmentId,
} from './role-assignment.types.js';

/**
 * As with UserRepository/PermissionRepository/RoleRepository, mutating
 * methods take an explicit Prisma transaction client rather than closing
 * over the singleton — so role-assignment.service.ts can wrap a grant/
 * revoke together with its audit-log write in one
 * `prisma.$transaction(async (tx) => { ... })`. Read-only methods use the
 * singleton directly.
 *
 * This repository is persistence-only: it answers "what RoleAssignment
 * records exist and how are they persisted," never "is this actor
 * allowed to do this" (authorization.service.ts / authorize.middleware.ts)
 * or "does this role grant this permission" (permission-resolver.ts). It
 * never reads req.user, a JWT, a session, or any authorization context,
 * and it never writes an audit record — that is role-assignment.service.ts's
 * job, via recordAuditTx inside the same transaction it hands this
 * repository's `tx` parameter to.
 */
type Db = PrismaClient | Prisma.TransactionClient;

export interface RoleAssignmentListQueryResult {
  readonly roleAssignments: RoleAssignment[];
  readonly total: number;
}

/**
 * Persistence-side translation of the domain `ScopeContext` discriminated
 * union into the flat `scopeType`/`scopeId` columns the Prisma model
 * actually stores. This is the one place that translation happens for
 * writes — role-assignment.types.ts stays Prisma-independent, and
 * role-assignment.mapper.ts (not touched here) owns the reverse direction
 * (persisted row → DTO) on the read side. No new scope type/value is
 * introduced: ORGANIZATION/DEPARTMENT/DIVISION are exactly the Prisma
 * `ScopeType` enum's members and exactly `ScopeContext`'s existing
 * variants.
 */
function scopeContextToColumns(scope: ScopeContext): {
  scopeType: ScopeType;
  scopeId: string | null;
} {
  switch (scope.type) {
    case 'ORGANIZATION':
      return { scopeType: 'ORGANIZATION', scopeId: null };
    case 'DEPARTMENT':
      return { scopeType: 'DEPARTMENT', scopeId: scope.departmentId };
    case 'DIVISION':
      return { scopeType: 'DIVISION', scopeId: scope.divisionId };
  }
}

/**
 * The only file allowed to call `prisma.roleAssignment.*` directly.
 * Persistence access only — no authorization decisions, no DTO mapping,
 * no audit orchestration, no scope *authorization* (only scope
 * *translation*, per scopeContextToColumns above).
 *
 * Every method that touches an existing RoleAssignment is
 * organization-scoped. There is no method here that can read/write a
 * RoleAssignment without an explicit organizationId.
 */
export class RoleAssignmentRepository {
  // ── Create ────────────────────────────────────────────────────────

  /**
   * `organizationId` is a trusted, separate parameter — CreateRoleAssignmentInput
   * (role-assignment.types.ts) deliberately excludes it, matching
   * CreateRoleInput/CreateUserInput's established convention of deriving
   * tenant context from the caller's authenticated/service context rather
   * than from client-controlled input.
   *
   * `grantedByUserId` is likewise a separate explicit parameter, not part
   * of `input` — role-assignment.types.ts's own doc comment on
   * CreateRoleAssignmentInput explains why: it is the acting user's
   * identity, the same kind of value every other RBAC mutation
   * (`permissionService.assignToRole`, `roleService.createRole`) receives
   * as a trusted `actorUserId` parameter rather than as request-body
   * data. Nullable because the Prisma column itself is nullable
   * (`grantedByUserId String?`) — a seed/bootstrap-provisioned assignment
   * may legitimately have no recorded granter.
   *
   * Both `user`/`role` relations use COMPOSITE foreign keys
   * (`fields: [organizationId, userId] references: [organizationId, id]`
   * and the equivalent for role) — see schema.prisma's own comment on
   * RoleAssignment. This means Postgres itself rejects an insert whose
   * `(organizationId, userId)` pair doesn't match an existing User, or
   * whose `(organizationId, roleId)` pair doesn't match an existing Role
   * in that same organization — the exact "User A + Role B across
   * different orgs" scenario is structurally impossible at the database
   * level. No separate existence-check query is performed here before
   * insert; that would duplicate a guarantee Postgres already enforces,
   * per this task's own instruction not to duplicate database guarantees
   * unnecessarily. A violation surfaces as Prisma P2003
   * (FOREIGN_KEY_VIOLATION), which this repository does not catch — it
   * bubbles up uncaught, matching every other repository in this
   * codebase (see prisma-error.mapper.ts, which is called from the
   * global error-handling layer, never from inside a repository method).
   *
   * `scopeId`'s tenant/existence validation is explicitly NOT this
   * repository's job — schema.prisma's own comment on RoleAssignment
   * states plainly that Postgres cannot enforce which parent table a
   * polymorphic `scopeId` points into, and that "the RBAC service MUST
   * validate scopeId's tenant/existence before insert." This repository
   * only translates the domain `ScopeContext` into columns; it performs
   * no scope authorization or validation of its own.
   *
   * NO DUPLICATE-ASSIGNMENT DATABASE GUARANTEE: unlike RolePermission's
   * `@@id([roleId, permissionId])` or Role's
   * `@@unique([organizationId, key])`, RoleAssignment has NO `@@unique`
   * constraint at all — only plain `@@index` entries
   * (`[organizationId]`, `[roleId, scopeType, scopeId]`,
   * `[userId, validUntil]`). Nothing at the database level prevents two
   * rows with identical `(organizationId, userId, roleId, scopeType,
   * scopeId)`. This is a real, discovered gap in the current schema, not
   * something this repository can compensate for — see `existsActive()`
   * below, and this file's accompanying report.
   */
  async create(
    tx: Db,
    organizationId: OrganizationId,
    grantedByUserId: UserId | null,
    input: CreateRoleAssignmentInput,
  ): Promise<RoleAssignment> {
    const { scopeType, scopeId } = scopeContextToColumns(input.scope);

    return tx.roleAssignment.create({
      data: {
        organizationId,
        userId: input.userId,
        roleId: input.roleId,
        scopeType,
        scopeId,
        // Omitted entirely (not even `undefined`-assigned) when the
        // caller doesn't supply one, so Prisma applies the schema's own
        // `@default(now())` rather than this repository re-implementing
        // "now" itself.
        ...(input.validFrom !== undefined && { validFrom: input.validFrom }),
        validUntil: input.validUntil ?? null,
        grantedByUserId: grantedByUserId ?? null,
      },
    });
  }

  // ── Read ──────────────────────────────────────────────────────────

  /**
   * Tenant-safe by construction: `id` alone is never enough to select a
   * row, `organizationId` is always required alongside it. Uses
   * `findFirst` (not a composite-unique `where` selector) because —
   * unlike Role/User — RoleAssignment has no `@@unique([organizationId,
   * id])` constraint in the schema, so there is no `organizationId_id`
   * compound-unique field Prisma's client would recognize here. This
   * mirrors the same `findFirst({ where: { id, organizationId } })`
   * shape role.repository.ts's own `findById` already uses for its own
   * reads (that model's `update`/`archive`/`restore` use the composite
   * selector only because Role additionally declares that `@@unique`;
   * RoleAssignment does not).
   */
  async findById(
    organizationId: OrganizationId,
    id: RoleAssignmentId,
  ): Promise<RoleAssignment | null> {
    return prisma.roleAssignment.findFirst({
      where: { id, organizationId },
    });
  }

  /**
   * `activeOnly` implements the exact condition specified for this
   * domain: `validFrom <= now() AND (validUntil IS NULL OR validUntil >
   * now())`. A future-dated assignment (`validFrom` in the future) is
   * deliberately excluded even though `validUntil` may be null — this is
   * persistence-level filtering only, not an authorization decision.
   */
  async findManyByUser(
    organizationId: OrganizationId,
    userId: UserId,
    activeOnly = false,
  ): Promise<RoleAssignment[]> {
    const now = new Date();
    return prisma.roleAssignment.findMany({
      where: {
        organizationId,
        userId,
        ...(activeOnly && {
          validFrom: { lte: now },
          OR: [{ validUntil: null }, { validUntil: { gt: now } }],
        }),
      },
    });
  }

  /** Same tenant-safe + activeOnly shape as findManyByUser, scoped to a role instead of a user. */
  async findManyByRole(
    organizationId: OrganizationId,
    roleId: RoleId,
    activeOnly = false,
  ): Promise<RoleAssignment[]> {
    const now = new Date();
    return prisma.roleAssignment.findMany({
      where: {
        organizationId,
        roleId,
        ...(activeOnly && {
          validFrom: { lte: now },
          OR: [{ validUntil: null }, { validUntil: { gt: now } }],
        }),
      },
    });
  }

  /**
   * Supports every field ListRoleAssignmentsFilters/ListRoleAssignmentsOptions
   * (role-assignment.types.ts) actually defines — no additional filters
   * are added here. `filters.scopeType` (the domain's
   * `RoleAssignmentScopeType`, derived as `ScopeContext['type']`) is
   * assigned directly to the Prisma `scopeType` column filter: both are
   * the identical string-literal union (`'ORGANIZATION' | 'DEPARTMENT' |
   * 'DIVISION'`), so no translation function is needed here the way
   * `scopeContextToColumns` is needed for a full `ScopeContext` — this is
   * a plain, already-matching value, not a shape conversion.
   *
   * Same count+findMany-in-parallel shape as
   * UserRepository.findMany/RoleRepository.findMany/
   * PermissionRepository.findMany.
   */
  async findMany(
    filters: ListRoleAssignmentsFilters,
    options: ListRoleAssignmentsOptions,
  ): Promise<RoleAssignmentListQueryResult> {
    const now = new Date();

    const where: Prisma.RoleAssignmentWhereInput = {
      organizationId: filters.organizationId,
      ...(filters.userId !== undefined && { userId: filters.userId }),
      ...(filters.roleId !== undefined && { roleId: filters.roleId }),
      ...(filters.scopeType !== undefined && {
        scopeType: filters.scopeType,
      }),
      ...(filters.scopeId !== undefined && { scopeId: filters.scopeId }),
      ...(filters.activeOnly && {
        validFrom: { lte: now },
        OR: [{ validUntil: null }, { validUntil: { gt: now } }],
      }),
    };

    const [roleAssignments, total] = await Promise.all([
      prisma.roleAssignment.findMany({
        where,
        orderBy: { [options.sortBy]: options.sortOrder },
        skip: (options.page - 1) * options.limit,
        take: options.limit,
      }),
      prisma.roleAssignment.count({ where }),
    ]);

    return { roleAssignments, total };
  }

  // ── Revoke (lifecycle, not deletion) ────────────────────────────────

  /**
   * RoleAssignment has no `deletedAt` column — confirmed directly against
   * schema.prisma, not assumed. Its lifecycle is expressed entirely
   * through `validFrom`/`validUntil`, and the model's own history is
   * security/audit-sensitive (RBAC grant/revoke trail), so this
   * repository exposes no physical `delete()` at all — only this
   * explicit `revoke()`, which sets `validUntil` and leaves the row
   * intact.
   *
   * TENANT-SAFETY / SCHEMA CONSTRAINT: RoleAssignment has no
   * `@@unique([organizationId, id])` (see the file-level and `create()`
   * comments), so — unlike RoleRepository.archive/restore/update, which
   * use `tx.role.update({ where: { organizationId_id: { ... } } })` —
   * there is no compound-unique selector this repository can pass to a
   * single-row `update()` here. `update()` requires its `where` to
   * uniquely identify a row via an `@id`/`@unique` field; `organizationId`
   * is neither for this model, so `where: { id, organizationId }` is not
   * a legal `update()` selector on this schema.
   *
   * Instead, this uses `updateMany` — which, unlike `update`, accepts an
   * arbitrary (non-unique) filter — with an explicit `{ id, organizationId
   * }` filter, so the mutation itself remains atomically tenant-safe: a
   * caller can never revoke a row belonging to another organization by
   * supplying its bare `id`. `updateMany` does not return the mutated
   * row, so a `count === 0` result (nothing matched — either the id
   * doesn't exist or it belongs to a different organizationId) yields
   * `null`; otherwise a tenant-scoped `findFirst` on the same `tx` fetches
   * the now-updated record to return. The follow-up read does not affect
   * the mutation's atomicity — the `updateMany` alone is what makes the
   * tenant-scoped write itself safe.
   */
  async revoke(
    tx: Db,
    organizationId: OrganizationId,
    id: RoleAssignmentId,
    validUntil: Date,
  ): Promise<RoleAssignment | null> {
    const result = await tx.roleAssignment.updateMany({
      where: { id, organizationId },
      data: { validUntil },
    });

    if (result.count === 0) {
      return null;
    }

    return tx.roleAssignment.findFirst({ where: { id, organizationId } });
  }

  // ── Duplicate-assignment fast-path check ────────────────────────────

  /**
   * Informational only, mirroring PermissionRepository.hasAssignment's
   * own documented caveat — NOT a concurrency guarantee. As noted on
   * `create()` above, RoleAssignment has no `@@unique` constraint
   * covering `(organizationId, userId, roleId, scopeType, scopeId)` at
   * all, unlike RolePermission's composite primary key. That means,
   * unlike `PermissionRepository.hasAssignment` (where a genuine race
   * still gets caught by the database's P2002 on the actual insert),
   * a race between this check and a subsequent `create()` here has NO
   * database-level backstop — two concurrent callers can both observe
   * `false` and both successfully insert a duplicate active assignment.
   * This is a real, currently-unresolved gap in the schema, not
   * something this method can paper over; it is included only because
   * three of three sibling repositories (User/Role/Permission) already
   * establish this exact fast-path-check idiom, and the service layer
   * may still want a best-effort duplicate check for the common
   * non-concurrent case. See this file's accompanying report.
   */
  async existsActive(
    organizationId: OrganizationId,
    userId: UserId,
    roleId: RoleId,
    scope: ScopeContext,
  ): Promise<boolean> {
    const { scopeType, scopeId } = scopeContextToColumns(scope);
    const now = new Date();

    const count = await prisma.roleAssignment.count({
      where: {
        organizationId,
        userId,
        roleId,
        scopeType,
        scopeId,
        validFrom: { lte: now },
        OR: [{ validUntil: null }, { validUntil: { gt: now } }],
      },
    });
    return count > 0;
  }
}

export const roleAssignmentRepository = new RoleAssignmentRepository();
