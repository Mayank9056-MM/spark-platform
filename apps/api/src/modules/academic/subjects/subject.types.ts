// apps/api/src/modules/academic/subjects/subject.types.ts

import type { SemesterCatalogId } from '../SemesterCatalog/semester.types.js';

/**
 * A Subject is one syllabus entry inside a specific SemesterCatalog slot
 * — e.g. "CS301 Data Structures" as it appears in Semester 3 of the
 * "CSE 2024" curriculum version. The Prisma `Subject` model
 * (`@@unique([semesterCatalogId, code])`) is CURRICULUM/SEMESTER-SPECIFIC,
 * not a global academic-subject identity: two Subject rows with the same
 * `code` can legitimately exist under two different SemesterCatalog rows
 * (e.g. "CS301" re-declared for "CSE 2024" vs "CSE 2026"), and nothing in
 * the schema deduplicates or links them. `SemesterCatalog.subjects
 * Subject[]` confirms direct ownership: Subject belongs to exactly one
 * SemesterCatalog, matching the established Department -> Program ->
 * CurriculumVersion -> SemesterCatalog -> Subject chain.
 *
 * SUBJECT VS SUBJECT OFFERING — the single most important distinction in
 * this file. `SubjectOffering` is a SEPARATE Prisma model ("Data
 * Structures taught in 2025-26" per its own schema comment): one row per
 * (subjectId, academicYearId), and it is what `FacultyAssignment`,
 * `Assignment`, and `StudyMaterial` actually reference. `Subject` itself
 * is the semester-catalog-level syllabus definition — it does NOT carry
 * credits, hours, or teaching data; those live on the separate
 * `SubjectComponent` model (`subjectId` FK, THEORY/PRACTICAL/TUTORIAL/
 * PROJECT, own `credits`/`hoursPerWeek`). Neither `SubjectOffering` nor
 * `SubjectComponent` is modeled in this file — both are owned by their
 * own future modules and reference Subject by id.
 *
 * Nothing that consumes teaching/scheduling data references Subject
 * directly: `Timetable` and `Lecture` key on `subjectOfferingId` /
 * `subjectComponentId`, never `subjectId`. `StudentEnrollment` does not
 * reference Subject at all (it stops at `programId`/`curriculumVersionId`).
 * The only rows that reference Subject BY ID directly are
 * `SubjectComponent.subjectId`, `SubjectOffering.subjectId`, and
 * `StudentElectiveSelection.subjectId` — none of which are modeled here,
 * per the same "reference by id, don't embed" boundary
 * `semester.types.ts` establishes for its own downstream relations.
 *
 * ELECTIVE RELATIONSHIP: Subject carries TWO independent elective-related
 * fields — `isElective: Boolean @default(false)` and `electiveGroupId:
 * String?` ("null for core subjects" per the schema comment). The schema
 * does not CHECK-constrain these to agree; keeping them consistent is a
 * service-layer concern, not something this type contract enforces — the
 * same class of unenforced cross-field agreement schema.prisma documents
 * repeatedly elsewhere (e.g. Admission's entrySemesterCatalog/
 * initialProgram note). Both fields are modeled below exactly as they
 * exist; neither is collapsed into the other.
 *
 * ELECTIVE GROUP MODULE DOES NOT YET EXIST: `ElectiveGroup` is a real
 * Prisma model, but there is no `academic/electives/` (or similarly
 * named) module in this repository yet — the `academic/` directory
 * currently contains only `curricula/`, `departments/`, `programs/`, and
 * `SemesterCatalog/`. `ElectiveGroupId` is therefore declared locally
 * below using this codebase's established `type XId = string` pattern,
 * rather than imported from a file that doesn't exist. When an
 * ElectiveGroup module is created, delete the local alias and import
 * from it instead, exactly as `SemesterCatalogId` is imported here.
 *
 * HISTORICAL INTEGRITY: `semesterCatalogId` is Subject's single most
 * consequential FK — `SubjectComponent`, `SubjectOffering`, and
 * `StudentElectiveSelection` all key off a Subject row, and
 * `SubjectComponent`/`SubjectOffering` fan out further into
 * `Timetable`/`Lecture`/`FacultyAssignment`/`Assignment`/`StudyMaterial`.
 * Reassigning `semesterCatalogId` after any of that exists would
 * retroactively move an already-taught, already-scheduled, already-
 * assessed subject into a different curriculum semester. See
 * `UpdateSubjectInput` below for the resulting exclusion.
 */

export type SubjectId = string;

/**
 * See the file-level comment above: no `academic/electives/` module
 * exists yet in this repository, so this is a local forward-reference,
 * not an import — delete and replace with an import once that module is
 * created.
 */
export type ElectiveGroupId = string;

/**
 * The API-safe representation of a Subject. Deliberately NOT the Prisma
 * `Subject` model — `semesterCatalog` and `electiveGroup` are
 * represented as plain ids, and `components`, `offerings`, and
 * `electiveSelections` are omitted entirely, matching every sibling
 * DTO's convention of representing relations by id and never embedding
 * them. This DTO can always be constructed from a bare
 * `prisma.subject.findUnique(...)` / `findMany` result with no
 * `include`, matching every sibling mapper's philosophy.
 *
 * `electiveGroupId` is `ElectiveGroupId | null`, not `?: ElectiveGroupId`
 * — the Prisma column is nullable (`String?`), not merely
 * optional-on-write. A serialized Subject row always HAS this key; its
 * VALUE may be null for a core subject. `exactOptionalPropertyTypes`
 * governs `?:` (key presence) and is orthogonal to `| null` (value
 * nullability) — this DTO uses the latter, matching how Prisma itself
 * types this column. None of the sibling DTOs have a nullable own-field
 * to establish precedent for this; the choice follows directly from the
 * schema's `String?` rather than from an existing sibling pattern.
 */
export interface SubjectDTO {
  readonly id: SubjectId;
  readonly semesterCatalogId: SemesterCatalogId;
  readonly electiveGroupId: ElectiveGroupId | null;
  readonly code: string;
  readonly name: string;
  readonly isElective: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/**
 * Fields a caller may supply when creating a Subject. `id`, `createdAt`,
 * and `updatedAt` are database-generated and excluded, matching every
 * sibling `Create*Input`'s convention.
 *
 * `semesterCatalogId` is required — `Subject.semesterCatalogId` has no
 * `?` and no default. Accepted as a plain id (`semesterCatalog: {...}`
 * nested-creation is not offered), matching
 * `CreateSemesterCatalogInput.curriculumVersionId`'s identical
 * convention: a Subject references an existing SemesterCatalog rather
 * than implicitly creating one.
 *
 * `code` and `name` are required — both are non-nullable `String`
 * columns with no schema default.
 *
 * `electiveGroupId` is optional (`?:`), not required-and-nullable.
 * Omitting it is how a caller creates a core subject, matching the
 * schema's own "null for core subjects" comment; when omitted, the
 * repository/service passes `null` through to Prisma. Unlike
 * `UpdateSubjectInput` below, Create has no need for an explicit `null`
 * variant — there is no "existing value" to distinguish "don't touch"
 * from.
 *
 * `isElective` is optional, NOT excluded — a plain column with a DB
 * default (`@default(false)`), the same "has a real default, nothing
 * marks it protected" reasoning `CreateCurriculumVersionInput.status`
 * uses for its own optional field. This contract does not enforce that
 * `isElective`/`electiveGroupId` agree — see the file-level comment.
 */
export interface CreateSubjectInput {
  readonly semesterCatalogId: SemesterCatalogId;
  readonly code: string;
  readonly name: string;
  readonly electiveGroupId?: ElectiveGroupId;
  readonly isElective?: boolean;
}

/**
 * Mutable Subject fields.
 *
 * `semesterCatalogId` is EXCLUDED, not merely flagged — the strongest
 * historical-integrity case in this file. `SubjectComponent`,
 * `SubjectOffering`, and `StudentElectiveSelection` all reference a
 * Subject by id, and the first two fan out further into `Timetable`,
 * `Lecture`, `FacultyAssignment`, `Assignment`, and `StudyMaterial`.
 * Reassigning `semesterCatalogId` after any of that exists would
 * retroactively move an already-taught/scheduled/assessed subject into a
 * different curriculum semester, with no schema-level cascade or guard
 * against it — the same reasoning `semester.types.ts` applies to
 * excluding `curriculumVersionId`, with more direct downstream evidence
 * here. The domain model gives no operation for moving a Subject between
 * semester catalogs, so this contract doesn't invent one.
 *
 * `code` is INCLUDED, flagged rather than excluded. This deliberately
 * does NOT copy `Department.code`'s exclusion — `Subject.code`'s
 * uniqueness is SCOPED (`@@unique([semesterCatalogId, code])`), not
 * global, and nothing in the schema or this repository marks it as an
 * external institutional/transcript reference the way
 * `department.types.ts` argues for `Department.code`. The closer
 * structural precedent is `CurriculumVersion.label` /
 * `SemesterCatalog.number`: both are the mutable half of a composite
 * unique constraint, referenced nowhere else in the schema BY VALUE
 * (`SubjectComponent`/`SubjectOffering`/`StudentElectiveSelection` all
 * reference Subject by id, never by code). Left mutable following that
 * precedent; the `@@unique([semesterCatalogId, code])` constraint still
 * applies and must be enforced by the repository on update, same as on
 * create.
 *
 * `name` is INCLUDED, unflagged — a plain display label, same as
 * `Department.name` / `Program.name`.
 *
 * `electiveGroupId` is INCLUDED, typed `ElectiveGroupId | null` (not
 * bare `ElectiveGroupId`) so a caller can distinguish "omit = leave
 * unchanged" from "explicit `null` = clear back to a core subject" —
 * standard nullable-field update semantics, and the reason this is the
 * one field in the file that pairs `?:` with `| null`. Unlike
 * `semesterCatalogId`, `StudentElectiveSelection` stores its own
 * `electiveGroupId` value directly on the selection row rather than
 * deriving it from `Subject.electiveGroupId` at read time, so changing a
 * Subject's elective-group assignment does not retroactively alter any
 * existing student's selection record.
 *
 * `isElective` is INCLUDED for the same reason as `electiveGroupId` — a
 * plain flag with no schema-level protection. Not enforced to stay
 * consistent with `electiveGroupId` on update, matching
 * `CreateSubjectInput`'s identical non-enforcement.
 *
 * Optional fields use `field?: type`, not `field?: type | undefined`,
 * per the project's `exactOptionalPropertyTypes: true` convention,
 * matching every sibling `Update*Input`'s established pattern.
 */
export interface UpdateSubjectInput {
  readonly code?: string;
  readonly name?: string;
  readonly electiveGroupId?: ElectiveGroupId | null;
  readonly isElective?: boolean;
}

/**
 * Filtering only — pagination/sorting live in `ListSubjectsOptions`,
 * matching the Filters/Options split established throughout this module
 * family.
 *
 * `search` matches against `name` and/or `code`, the same convention
 * `department.types.ts`/`program.types.ts`/`curriculum.types.ts`
 * establish for their own string identity fields. (Unlike
 * `semester.types.ts`, which has no `search` because SemesterCatalog has
 * no string field to match — Subject does, so this file follows the
 * earlier precedent instead.)
 *
 * `semesterCatalogId` is included — the leftmost column of
 * `@@unique([semesterCatalogId, code])` and Subject's direct ownership
 * FK. "List every subject in this semester catalog" is the central,
 * obvious use of this module, the same justification
 * `ListSemesterCatalogsFilters.curriculumVersionId` uses for its own
 * leftmost-unique-column FK.
 *
 * `electiveGroupId` is included for the same reason — Subject's other
 * own FK, and "list every subject in this elective group" is a direct,
 * schema-supported admin need.
 *
 * `isElective` is included as a direct boolean filter on Subject's own
 * field.
 *
 * `curriculumVersionId`/`programId`/`departmentId` are deliberately NOT
 * included, even though Subject transitively belongs to both through
 * `semesterCatalogId` — they are not Subject's own fields, and nothing
 * in this repository establishes relation-traversal filtering as an
 * existing pattern. A caller needing "all subjects in this curriculum
 * version" resolves the relevant `semesterCatalogId`s via the
 * SemesterCatalog module first, matching how `ListProgramsFilters` never
 * gained an indirect `curriculumVersionId` filter either.
 */
export interface ListSubjectsFilters {
  readonly search?: string;
  readonly semesterCatalogId?: SemesterCatalogId;
  readonly electiveGroupId?: ElectiveGroupId;
  readonly isElective?: boolean;
}

/**
 * Pagination + sort options, mirroring every sibling `List*Options`.
 * `sortBy` is restricted to Subject's own scalar identity fields —
 * `code`, `name`, `createdAt` — matching the exact shape
 * `ListDepartmentsOptions`/`ListProgramsOptions` use for their own
 * name/code/createdAt fields. `semesterCatalogId`/`electiveGroupId` are
 * excluded as sort keys (foreign keys, not a meaningful ordering,
 * matching how `departmentId`/`programId` are excluded elsewhere), and
 * `isElective` is excluded too — a boolean flag is not a demonstrated
 * sort requirement anywhere in this repository.
 */
export interface ListSubjectsOptions {
  readonly page: number;
  readonly limit: number;
  readonly sortBy: 'code' | 'name' | 'createdAt';
  readonly sortOrder: 'asc' | 'desc';
}

export interface ListSubjectsResult {
  readonly subjects: SubjectDTO[];
  readonly total: number;
}
