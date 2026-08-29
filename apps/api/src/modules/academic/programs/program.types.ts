// apps/api/src/modules/academic/programs/program.types.ts

import type { DepartmentId } from '../departments/department.types.js';

/**
 * A Program is a specific academic offering within a Department — e.g.
 * "Bachelor of Engineering in Computer Science" as distinct from the
 * "Computer Science" Department that offers it. This module's
 * responsibility is limited to the Program entity's own identity
 * (`id`, `name`, `code`, `durationYears`, `totalSemesters`), its
 * ownership reference (`departmentId`), and lifecycle timestamps —
 * matching exactly the fields on the Prisma `Program` model, no more.
 *
 * Program deliberately does NOT model curricula, semesters, subjects,
 * students, or faculty here — those are separate domains that will
 * reference a Program by ID once they exist (CurriculumVersion,
 * StudentEnrollment, and Admission already do this in the schema via
 * `programId`/`initialProgramId`). Modeling them here would invert the
 * dependency direction this module is meant to keep stable.
 *
 * The Prisma `Program` model has no status/lifecycle enum and no
 * `deletedAt` field, so — matching `department.types.ts`'s identical
 * reasoning for `Department` — no `ProgramStatus` type or archival
 * concept is introduced here. If one is ever added to the schema, its
 * type belongs here at that point, not invented ahead of it.
 */

export type ProgramId = string;

/**
 * The API-safe representation of a Program. Deliberately NOT the Prisma
 * `Program` model — `department`, `curriculumVersions`,
 * `studentEnrollments`, and `admissions` are all omitted, so an ordinary
 * program lookup/list never forces loading any of those relations. The
 * Department relationship is represented as `departmentId` (a plain ID),
 * not a nested `DepartmentDTO` — this keeps Program independently
 * retrievable/composable and avoids `program.types.ts` depending on
 * `DepartmentDTO`'s full shape merely to reference its owner.
 *
 * No separate `ProgramSummaryDTO` is defined, for the same reason
 * `department.types.ts` doesn't define one: Program's intrinsic fields
 * are few enough that a "summary" view would be identical to this DTO.
 */
export interface ProgramDTO {
  readonly id: ProgramId;
  readonly name: string;
  readonly code: string;
  readonly departmentId: DepartmentId;
  readonly durationYears: number;
  readonly totalSemesters: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/**
 * Fields a caller may supply when creating a Program. `id`, `createdAt`,
 * and `updatedAt` are database-generated and excluded, matching
 * `CreateDepartmentInput`'s convention.
 *
 * `departmentId` is required — `Program.departmentId` has no `?` and no
 * default in the schema, so a Program cannot be created without
 * referencing an existing Department. It is accepted as a plain ID
 * (`department: {...}` nested-creation is not offered), so Program
 * creation always references an existing Department rather than
 * implicitly creating one.
 *
 * `durationYears`/`totalSemesters` are required for the same reason:
 * both are non-nullable `Int` columns with no schema default.
 */
export interface CreateProgramInput {
  readonly name: string;
  readonly code: string;
  readonly departmentId: DepartmentId;
  readonly durationYears: number;
  readonly totalSemesters: number;
}

/**
 * Mutable Program fields. Three deliberate exclusions/flags below —
 * this is NOT a mechanical copy of `UpdateDepartmentInput`.
 *
 * `departmentId` is EXCLUDED, not merely flagged. Moving a Program to a
 * different Department after `CurriculumVersion`/`StudentEnrollment`/
 * `Admission` rows already reference it via `programId` would silently
 * change what department owns that academic/enrollment history, with no
 * schema-level cascade or guard against it. The current domain model
 * gives no operation for reassigning a Program's Department, so this
 * contract doesn't invent one.
 *
 * `code` is INCLUDED, not excluded — unlike `Department.code`,
 * `department.types.ts`'s exclusion of Department's own `code` is
 * argued from institutional-external-reference reasoning, not from
 * anything Program-specific. `Program.code` shares the same bare
 * `@@unique([code])` shape, but nothing in the schema or this
 * repository establishes that same argument for Program independently
 * — copying Department's rule here would be exactly the assumption this
 * task was told not to make. Left mutable; whether it should be
 * restricted is an open decision for the validation/service layer, not
 * this contract.
 *
 * `durationYears`/`totalSemesters` are INCLUDED but flagged for the same
 * "don't silently invent a restriction" reason as `code` — with one
 * difference: there IS concrete schema evidence they're not purely
 * cosmetic. `SemesterCatalog`'s own doc comment in schema.prisma derives
 * an enrollment's academic year FROM these two values (`ceil(number / 2)`
 * against `durationYears`/`totalSemesters`). Changing them after
 * `CurriculumVersion`/`SemesterCatalog` rows exist for this Program could
 * silently invalidate that derivation. This contract still allows the
 * update (nothing in Prisma itself forbids it), but the service layer
 * should decide whether to guard it once curricula exist — not something
 * a type file can enforce.
 *
 * `name` carries no such caveat — a plain display label, freely mutable,
 * same as `UpdateDepartmentInput.name`.
 *
 * Optional fields use `field?: type`, not `field?: type | undefined`,
 * per the project's `exactOptionalPropertyTypes: true` convention
 * (matching `UpdateDepartmentInput`'s established pattern exactly).
 */
export interface UpdateProgramInput {
  readonly name?: string;
  readonly code?: string;
  readonly durationYears?: number;
  readonly totalSemesters?: number;
}

/**
 * Filtering only — pagination/sorting live in `ListProgramsOptions`,
 * matching the `Filters`/`Options` split already established by
 * `ListDepartmentsFilters`/`ListDepartmentsOptions`.
 *
 * `departmentId` is included because `Program.departmentId` is an
 * indexed FK (`@@index([departmentId])`) — "list every Program in this
 * Department" is both schema-supported and an obviously real admin
 * need, not a speculative addition.
 */
export interface ListProgramsFilters {
  readonly search?: string;
  readonly departmentId?: DepartmentId;
}

/**
 * Pagination + sort options, mirroring `ListDepartmentsOptions` exactly.
 * `sortBy` is restricted to the same three scalar fields Department
 * sorts by (`name` | `code` | `createdAt`) — `durationYears`/
 * `totalSemesters`/`departmentId` are deliberately not offered as sort
 * keys; nothing in this repository indicates that's a genuine admin
 * requirement, and adding them here would be exactly the kind of
 * unrequested field this task warned against.
 */
export interface ListProgramsOptions {
  readonly page: number;
  readonly limit: number;
  readonly sortBy: 'name' | 'code' | 'createdAt';
  readonly sortOrder: 'asc' | 'desc';
}

export interface ListProgramsResult {
  readonly programs: ProgramDTO[];
  readonly total: number;
}
