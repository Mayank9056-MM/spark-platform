// apps/api/src/modules/academic/departments/department.types.ts

/**
 * A Department is the top-level academic organizational unit directly
 * beneath the (implicit, single) college in this deployment's academic
 * hierarchy: Department -> Program -> CurriculumVersion -> SemesterCatalog
 * -> Subject -> SubjectComponent.
 *
 * This module's responsibility is limited to the Department entity's own
 * identity (`id`, `name`, `code`) and lifecycle timestamps. It deliberately
 * does NOT model programs, faculty, HOD assignment, students, or any other
 * concept that merely relates to a department — those belong to their own
 * modules (Program, RBAC scope assignment, etc.), per the domain boundary
 * this task was scoped to.
 *
 * The Prisma `Department` model has no status/lifecycle enum (no
 * `PENDING` / `ARCHIVED` / etc. field exists on it), so no
 * `DepartmentStatus` type is introduced here. If department archival is
 * ever added to the schema, the corresponding type belongs here at that
 * point — not invented ahead of the schema.
 */

export type DepartmentId = string;

/**
 * The API-safe representation of a Department. Deliberately NOT the
 * Prisma `Department` model — the `programs` relation is omitted so an
 * ordinary department lookup/list never forces loading every program
 * under it; a caller that needs programs fetches them via the Program
 * module instead.
 *
 * No separate `DepartmentSummaryDTO` / list-item type is defined. A
 * Department has only three intrinsic fields (id, name, code) plus
 * timestamps — a "summary" view would be byte-for-byte identical to this
 * DTO, so a second type would be pure duplication. Contrast with
 * `role.types.ts`'s `RoleSummaryDTO`, which exists precisely because
 * `RoleDTO` carries more than an embedding consumer needs; that
 * justification doesn't apply here.
 */
export interface DepartmentDTO {
  readonly id: DepartmentId;
  readonly name: string;
  readonly code: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/**
 * Fields a caller may supply when creating a Department. `id`,
 * `createdAt`, and `updatedAt` are database-generated and excluded. The
 * `programs` relation is not created through this operation — a
 * Department is created empty; programs are attached to it later via the
 * Program module.
 */
export interface CreateDepartmentInput {
  readonly name: string;
  readonly code: string;
}

/**
 * `code` is intentionally NOT updateable — the same design decision as
 * `Role.key` in `role.types.ts`. A Department's `code` is its stable
 * external identity: it's the kind of value referenced by transcripts,
 * admission records, and other institutional documents outside this
 * system's direct control, and the schema backs this with
 * `@@unique([code])`. Allowing it to change after creation would silently
 * invalidate those external references. Only `name` — the mutable,
 * human-facing label — may be updated.
 *
 * `name` is a plain optional (`?:`), not `?: string | undefined`. Under
 * `exactOptionalPropertyTypes`, this lets a caller omit the field
 * entirely on a partial update without being forced to explicitly pass
 * `name: undefined`.
 */
export interface UpdateDepartmentInput {
  readonly name?: string;
}

/**
 * Filtering only. Pagination (`page`/`limit`) and sorting live in
 * `ListDepartmentsOptions` below — the same Filters/Options split already
 * established by `role.types.ts` (`ListRolesFilters` /
 * `ListRolesOptions`) and `user.types.ts` (`ListUsersFilters` /
 * `ListUsersOptions`), rather than folding pagination concerns into the
 * filter contract or duplicating the generic `PaginationParams` shape
 * from `common/responses/pagination.ts`.
 *
 * `search` is expected to match against `name` and/or `code`; the exact
 * matching strategy (prefix, contains, case sensitivity) is a
 * repository-layer concern, not part of this contract.
 *
 * No `status` filter: the schema has no department status field to
 * filter on.
 */
export interface ListDepartmentsFilters {
  readonly search?: string;
}

/**
 * Pagination + sort options for listing Departments, mirroring
 * `ListRolesOptions` / `ListUsersOptions`. `sortBy` is restricted to
 * Department's own persisted fields.
 */
export interface ListDepartmentsOptions {
  readonly page: number;
  readonly limit: number;
  readonly sortBy: 'name' | 'code' | 'createdAt';
  readonly sortOrder: 'asc' | 'desc';
}

export interface ListDepartmentsResult {
  readonly departments: DepartmentDTO[];
  readonly total: number;
}
