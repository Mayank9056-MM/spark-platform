// apps/api/src/modules/academic/SemesterCatalog/semester.types.ts

import type { CurriculumVersionId } from '../curricula/curriculum.types.js';

/**
 * A SemesterCatalog is one semester slot within a CurriculumVersion's
 * structure — e.g. "Semester 3 of CSE 2024" — identified by its
 * `number` scoped inside `curriculumVersionId`
 * (`@@unique([curriculumVersionId, number])` in schema.prisma). This
 * module's responsibility is limited to the SemesterCatalog entity's own
 * identity (`id`, `curriculumVersionId`, `number`) and lifecycle
 * timestamps — exactly the own-fields on the Prisma `SemesterCatalog`
 * model, no more.
 *
 * Academic hierarchy (Department -> Program -> CurriculumVersion ->
 * SemesterCatalog -> Subject -> SubjectComponent): this file does NOT
 * model Subject, ElectiveGroup, SemesterEnrollment, PromotionBatch,
 * Timetable, Lecture, or Admission here, even though all seven relate
 * back to SemesterCatalog via `semesterCatalogId` /
 * `entrySemesterCatalogId` in the schema. Those are separate domains
 * that reference a SemesterCatalog by id once it exists; modeling them
 * here would invert the dependency direction this module is meant to
 * keep stable — the same reasoning `curriculum.types.ts` applies to
 * excluding SemesterCatalog itself from CurriculumVersionDTO.
 *
 * `curriculumVersion` is represented as `curriculumVersionId` only (a
 * plain id, not a nested `CurriculumVersionDTO`) — matching
 * `ProgramDTO.departmentId` / `CurriculumVersionDTO.programId`'s
 * identical convention of representing the parent by id rather than
 * embedding its full shape.
 *
 * ACADEMIC YEAR IS DELIBERATELY NOT MODELED. schema.prisma's own comment
 * on the `SemesterCatalog` model says so explicitly: year is derived
 * from `number` against the owning Program's
 * totalSemesters/durationYears rather than persisted as a second source
 * of truth. No `academicYear` field appears below — inventing one would
 * directly contradict a documented schema decision, not merely add an
 * unrequested field. (Note: `AcademicYear` is a distinct, unrelated
 * model in schema.prisma — a real enrollment term, e.g. "2025-26" —
 * consumed by `SemesterEnrollment`, not by `SemesterCatalog`; it is out
 * of scope here.)
 *
 * The Prisma `SemesterCatalog` model has no status/lifecycle enum and no
 * `deletedAt` field, so — matching `department.types.ts` /
 * `program.types.ts`'s identical reasoning — no `SemesterCatalogStatus`
 * type or archival concept is introduced here.
 *
 * NAMING NOTE: list-related type names below pluralize the entity name
 * (`ListSemesterCatalogsFilters`, not `ListSemesterCatalogFilters`),
 * matching the established project convention of pluralizing the list
 * contract's own entity name (`ListDepartmentsFilters`,
 * `ListProgramsFilters`, `ListCurriculumVersionsFilters` — the last
 * pluralizing `CurriculumVersion` the same way this file pluralizes
 * `SemesterCatalog`), even though `SemesterCatalog` itself does not end
 * in a way that makes the plural visually obvious.
 */

export type SemesterCatalogId = string;

/**
 * The API-safe representation of a SemesterCatalog. Deliberately NOT the
 * Prisma `SemesterCatalog` model — `curriculumVersion` is represented as
 * `curriculumVersionId`, and `semesterEnrollments`, `subjects`,
 * `electiveGroups`, `promotionBatches`, `timetableEntries`, `lectures`,
 * and `entryAdmissions` are all omitted entirely, so an ordinary
 * SemesterCatalog lookup/list never forces loading any of those
 * relations. Each belongs to its own module, scoped by
 * `semesterCatalogId` once it exists.
 *
 * No separate `SemesterCatalogSummaryDTO` is defined, for the same
 * reason `department.types.ts` / `program.types.ts` don't define one:
 * SemesterCatalog's only intrinsic fields are `curriculumVersionId` and
 * `number` plus timestamps — a "summary" view would be identical to
 * this DTO.
 */
export interface SemesterCatalogDTO {
  readonly id: SemesterCatalogId;
  readonly curriculumVersionId: CurriculumVersionId;
  readonly number: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/**
 * Fields a caller may supply when creating a SemesterCatalog. `id`,
 * `createdAt`, and `updatedAt` are database-generated and excluded,
 * matching `CreateDepartmentInput` / `CreateProgramInput` /
 * `CreateCurriculumVersionInput`'s convention.
 *
 * `curriculumVersionId` is required — `SemesterCatalog.curriculumVersionId`
 * has no `?` and no default in the schema, so a SemesterCatalog cannot
 * be created without referencing an existing CurriculumVersion. It is
 * accepted as a plain id (`curriculumVersion: {...}` nested-creation is
 * not offered), matching `CreateCurriculumVersionInput.programId`'s
 * identical convention.
 *
 * `number` is required — `SemesterCatalog.number` is a non-nullable
 * `Int` column with no schema default.
 */
export interface CreateSemesterCatalogInput {
  readonly curriculumVersionId: CurriculumVersionId;
  readonly number: number;
}

/**
 * Mutable SemesterCatalog fields.
 *
 * `curriculumVersionId` is EXCLUDED, not merely flagged — the same
 * reasoning `curriculum.types.ts` applies to excluding `programId` from
 * `UpdateCurriculumVersionInput`, extended by considerably more evidence
 * here. Once a SemesterCatalog row exists, it is referenced by id from
 * `SemesterEnrollment.semesterCatalogId`,
 * `PromotionBatch.semesterCatalogId` (the schema's own comment calls
 * this "the FROM curriculum semester being promoted"),
 * `Timetable.semesterCatalogId`, `Lecture.semesterCatalogId`,
 * `Subject.semesterCatalogId`, `ElectiveGroup.semesterCatalogId`, and
 * `Admission.entrySemesterCatalogId` (a permanent, one-time-only entry
 * record per the schema's own comment on `Admission`). Silently
 * reassigning a SemesterCatalog to a different CurriculumVersion after
 * any of those historical rows exist would retroactively change what
 * curriculum/program a student's enrollment, attendance, promotion,
 * timetable, or admission history is understood to belong to, with no
 * schema-level cascade or guard against it. The domain model gives no
 * operation for moving a SemesterCatalog between CurriculumVersions, so
 * this contract doesn't invent one.
 *
 * `number` is INCLUDED, flagged with caution rather than excluded — the
 * evidence here doesn't clear the bar this file uses for exclusion (an
 * FK whose reassignment silently repoints a chain of historical
 * records), but it isn't evidence-free either, and the tension is
 * documented rather than resolved by invention:
 *
 *   - Structurally, `curriculumVersionId` + `number` form the same
 *     "excluded FK / mutable co-identity field" composite shape already
 *     established by CurriculumVersion's own
 *     `@@unique([programId, label])` (`programId` excluded from update,
 *     `label` left mutable). `number` is this model's `label`-equivalent
 *     half of `@@unique([curriculumVersionId, number])`, and — like
 *     `label` — nothing elsewhere in the schema references a
 *     SemesterCatalog BY its `number` value; every reference found
 *     (`semesterCatalogId` / `entrySemesterCatalogId` listed above) is
 *     by `id`.
 *   - However, `program.types.ts`'s own `UpdateProgramInput` establishes
 *     that being referenced only by id elsewhere doesn't by itself make
 *     a field consequence-free to change: `durationYears` /
 *     `totalSemesters` are left mutable there but explicitly flagged,
 *     because SemesterCatalog's own schema comment derives academic year
 *     FROM those two fields. `number` sits on the other side of that
 *     exact same derivation (`ceil(number / 2)` against the owning
 *     Program's `durationYears`/`totalSemesters`) — changing it after a
 *     SemesterEnrollment/PromotionBatch/Admission history exists for
 *     this row would silently shift which derived academic year that
 *     history is understood to have occurred in.
 *
 * This file leaves `number` mutable, following the closer structural
 * precedent (`CurriculumVersion.label`), rather than inventing an
 * immutability rule neither the schema nor an existing sibling module
 * actually states. The service layer should revisit this once real
 * product requirements for editing a published semester number exist.
 *
 * Optional field uses `field?: type`, not `field?: type | undefined`,
 * per the project's `exactOptionalPropertyTypes: true` convention,
 * matching `UpdateCurriculumVersionInput`'s established pattern exactly.
 */
export interface UpdateSemesterCatalogInput {
  readonly number?: number;
}

/**
 * Filtering only — pagination/sorting live in
 * `ListSemesterCatalogsOptions`, matching the Filters/Options split
 * already established by `ListProgramsFilters`/`ListProgramsOptions` and
 * `ListCurriculumVersionsFilters`/`ListCurriculumVersionsOptions`.
 *
 * `curriculumVersionId` is included because it is the leftmost column of
 * the schema's `@@unique([curriculumVersionId, number])` constraint —
 * "list every semester in this curriculum version" is both
 * schema-supported (a composite unique index serves equality lookups on
 * its leftmost column, the same justification
 * `ListProgramsFilters.departmentId` uses for its own indexed FK) and
 * the obvious, central use of this module: viewing a CurriculumVersion's
 * semester structure.
 *
 * `number` is included alongside it for the same indexed-pair reason
 * `ListCurriculumVersionsFilters.status` is included alongside
 * `programId` (`@@index([programId, status])` there vs.
 * `@@unique([curriculumVersionId, number])` here) — filtering to an
 * exact semester within a specific curriculum version is a direct,
 * schema-backed lookup, not a speculative addition.
 *
 * No `search` filter: unlike Department/Program/CurriculumVersion,
 * SemesterCatalog has no string field (`name`/`code`/`label`) to match
 * against — its only own-fields are `curriculumVersionId` (a UUID) and
 * `number` (an Int). There is nothing real for a text search to match.
 */
export interface ListSemesterCatalogsFilters {
  readonly curriculumVersionId?: CurriculumVersionId;
  readonly number?: number;
}

/**
 * Pagination + sort options, mirroring `ListCurriculumVersionsOptions`.
 * `sortBy` is a literal union restricted to SemesterCatalog's own
 * scalar fields that are reasonable sort keys: `number` (the natural
 * ordering within a curriculum version) and `createdAt` (matching every
 * sibling module's inclusion of the creation timestamp). `curriculumVersionId`
 * is deliberately excluded as a sort key — a foreign key, not a
 * meaningful ordering — matching how `ListProgramsOptions` excludes
 * `departmentId` and `ListCurriculumVersionsOptions` excludes
 * `programId` for the same reason.
 */
export interface ListSemesterCatalogsOptions {
  readonly page: number;
  readonly limit: number;
  readonly sortBy: 'number' | 'createdAt';
  readonly sortOrder: 'asc' | 'desc';
}

export interface ListSemesterCatalogsResult {
  readonly semesterCatalogs: SemesterCatalogDTO[];
  readonly total: number;
}
