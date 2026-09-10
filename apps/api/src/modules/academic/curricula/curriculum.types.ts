// apps/api/src/modules/academic/curricula/curriculum.types.ts

import type { ProgramId } from '../programs/program.types.js';

/**
 * A CurriculumVersion is the versioned academic blueprint a Program
 * follows — e.g. "CSE 2024" vs "CSE 2026" for the same "B.Tech Computer
 * Science" Program. This is the actual persisted Prisma model
 * (`CurriculumVersion`, mapped to table `curriculum_versions`); there is
 * no separate `Curriculum` model in the schema, so this file does not
 * invent a `Curriculum` abstraction sitting above it. The module
 * directory is named `curricula/` (matching the domain hierarchy this
 * task describes), but every type below is named after the actual
 * entity, `CurriculumVersion` — the same naming discipline
 * `role.types.ts` applies to `Role` inside the `roles/` directory.
 *
 * Academic hierarchy (Department -> Program -> CurriculumVersion ->
 * SemesterCatalog -> Subject -> SubjectComponent): this module's
 * responsibility is limited to CurriculumVersion's own identity (`id`,
 * `programId`, `label`, `status`) and lifecycle timestamps — exactly the
 * fields on the Prisma `CurriculumVersion` model, no more. It
 * deliberately does NOT model SemesterCatalog, Subject, ElectiveGroup,
 * StudentEnrollment, or Admission here — those are separate domains that
 * reference a CurriculumVersion by id once they exist (all four already
 * do this in the schema via `curriculumVersionId`/`initialCurriculumId`).
 * Modeling them here would invert the dependency direction this module
 * is meant to keep stable.
 *
 * Versioning/historical safety: multiple CurriculumVersion rows can and
 * do coexist for the same Program — `@@unique([programId, label])`
 * scopes uniqueness to the (programId, label) pair, not to `programId`
 * alone, so e.g. "2024" and "2026" versions of the same Program can
 * exist simultaneously. `StudentEnrollment.curriculumVersionId` is
 * locked at admission time and is NOT retroactively repointed when a
 * newer CurriculumVersion is created (see that model's own schema
 * comment). This file does not encode that invariant itself — it lives
 * in the StudentEnrollment domain — but it is exactly why
 * CurriculumVersion is never modeled here as a singleton-per-Program
 * concept.
 *
 * `CurriculumStatus` (DRAFT | ACTIVE | RETIRED) IS a real column on this
 * model (`status CurriculumStatus @default(DRAFT)`) — unlike the
 * `isActive`/`archivedAt`-style fields this task warned against
 * inventing, it is included below because it genuinely exists in the
 * schema, not despite the instruction to avoid speculative lifecycle
 * fields. Nothing in the schema enforces "only one ACTIVE version per
 * Program" — there is no partial unique index on `(programId, status)`
 * restricted to ACTIVE — so this file does not assume or encode that
 * constraint either.
 */

/**
 * The Prisma `CurriculumVersion` model has a real surrogate `id` column
 * (not a composite-key join table), so a standalone id type is
 * legitimate here, matching `DepartmentId`/`ProgramId`'s convention.
 */
export type CurriculumVersionId = string;

/**
 * Mirrors the Prisma `CurriculumStatus` enum's name and exact three
 * values (`DRAFT | ACTIVE | RETIRED`). Declared as a local literal union
 * rather than imported from the generated Prisma client, so this file
 * stays persistence-independent — consistent with the project's
 * established convention of never importing Prisma model types into the
 * API-facing contract (see the note on `CurriculumVersionDTO` below). If
 * the Prisma enum's values ever change, this union must be updated to
 * match.
 */
export type CurriculumStatus = 'DRAFT' | 'ACTIVE' | 'RETIRED';

/**
 * The API-safe representation of a CurriculumVersion. Deliberately NOT
 * the Prisma `CurriculumVersion` model — `program`, `semesterCatalogs`,
 * `studentEnrollments`, and `admissions` are all omitted:
 *
 * - `program` -> represented as `programId` only (a plain id, not a
 *   nested `ProgramDTO`), matching exactly how `program.types.ts`
 *   represents its own `Department` relation as `departmentId`. This
 *   keeps CurriculumVersion independently retrievable/composable and
 *   avoids this file depending on `ProgramDTO`'s full shape merely to
 *   reference its owner.
 * - `semesterCatalogs` -> owned by the future Semester module. A
 *   CurriculumVersion lookup/list must never be forced to load its
 *   entire semester/subject/elective structure; a caller that needs
 *   semesters fetches them via that module, scoped by
 *   `curriculumVersionId`.
 * - `studentEnrollments` / `admissions` -> operational student-lifecycle
 *   data, explicitly out of scope for this module per the task's domain
 *   boundary. A CurriculumVersion represents academic configuration, not
 *   who is currently following it.
 *
 * No separate `CurriculumVersionSummaryDTO` is defined, for the same
 * reason `department.types.ts`/`program.types.ts` don't define one:
 * CurriculumVersion's intrinsic fields are few enough (four, plus
 * timestamps) that a "summary" view would be identical to this DTO.
 */
export interface CurriculumVersionDTO {
  readonly id: CurriculumVersionId;
  readonly programId: ProgramId;
  readonly label: string;
  readonly status: CurriculumStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/**
 * Fields a caller may supply when creating a CurriculumVersion. `id`,
 * `createdAt`, `updatedAt` are database-generated and excluded.
 *
 * `status` is INTENTIONALLY excluded (previously optional). Curriculum
 * hardening establishes a real lifecycle (DRAFT -> ACTIVE -> RETIRED,
 * one-way, via dedicated activate/retire commands only). Accepting a
 * client-supplied initial status here would let a caller create a
 * version directly as ACTIVE or RETIRED, bypassing that lifecycle
 * entirely. Every CurriculumVersion is now created DRAFT — the schema's
 * own `@default(DRAFT)` — with no exception.
 */
export interface CreateCurriculumVersionInput {
  readonly programId: ProgramId;
  readonly label: string;
}

/**
 * Mutable CurriculumVersion fields via the generic update path.
 *
 * `status` is EXCLUDED, not merely flagged. Lifecycle transitions are
 * now real: DRAFT -> ACTIVE -> RETIRED, one-way, enforced by
 * curriculum.service.ts's dedicated `activateCurriculumVersion`/
 * `retireCurriculumVersion`. Allowing `status` through this generic
 * PATCH would let a client set any status value directly, bypassing
 * both the transition legality checks and the audit semantics those
 * dedicated methods provide.
 *
 * `label` remains here structurally, but curriculum.service.ts now
 * additionally rejects this entire update once the CurriculumVersion is
 * no longer DRAFT — see that file's `updateCurriculumVersion`.
 */
export interface UpdateCurriculumVersionInput {
  readonly label?: string;
}

/**
 * Filtering only — pagination/sorting live in
 * `ListCurriculumVersionsOptions`, matching the Filters/Options split
 * already established by `ListDepartmentsFilters`/`ListDepartmentsOptions`
 * and `ListProgramsFilters`/`ListProgramsOptions`.
 *
 * `search` is expected to match against `label` — the only free-text
 * identity field on this model (there is no `code`/`name` on
 * CurriculumVersion). Exact matching strategy is a repository-layer
 * concern, not part of this contract.
 *
 * `programId` is included because `CurriculumVersion.programId` is part
 * of an indexed pair (`@@index([programId, status])`) and "list every
 * curriculum version for this Program" is an obvious, schema-supported
 * admin need — the same justification `ListProgramsFilters.departmentId`
 * uses for its own indexed FK.
 *
 * `status` is included for the same indexed-field reason —
 * `@@index([programId, status])` directly supports filtering by status,
 * optionally combined with `programId`.
 */
export interface ListCurriculumVersionsFilters {
  readonly search?: string;
  readonly programId?: ProgramId;
  readonly status?: CurriculumStatus;
}

/**
 * Pagination + sort options, mirroring `ListDepartmentsOptions`/
 * `ListProgramsOptions`. `sortBy` is a literal union restricted to
 * CurriculumVersion's own scalar fields that are reasonable
 * administrative sort keys. `programId` is deliberately excluded as a
 * sort key — a foreign key, not a meaningful ordering — matching how
 * `ListProgramsOptions` excludes `departmentId` for the same reason.
 */
export interface ListCurriculumVersionsOptions {
  readonly page: number;
  readonly limit: number;
  readonly sortBy: 'label' | 'status' | 'createdAt';
  readonly sortOrder: 'asc' | 'desc';
}

export interface ListCurriculumVersionsResult {
  readonly curriculumVersions: CurriculumVersionDTO[];
  readonly total: number;
}
