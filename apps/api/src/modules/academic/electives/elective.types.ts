// apps/api/src/modules/academic/electives/elective.types.ts

import type { SemesterCatalogId } from '../SemesterCatalog/semester.types.js';

/**
 * An ElectiveGroup groups mutually-exclusive open/departmental electives
 * together within one SemesterCatalog slot — e.g. "Open Elective Group 1"
 * inside Semester 6 of "CSE 2024," from which a student picks between
 * Python/AI/Cloud (per the Prisma `ElectiveGroup` model's own schema
 * comment). This module's responsibility is limited to the ElectiveGroup
 * entity's own identity (`id`, `semesterCatalogId`, `name`, `minSelect`,
 * `maxSelect`) and lifecycle timestamps — exactly the fields on the
 * Prisma `ElectiveGroup` model, no more.
 *
 * OWNERSHIP: `semesterCatalogId` is ElectiveGroup's only parent FK
 * (`semesterCatalog SemesterCatalog @relation(...)`), and
 * `SemesterCatalog.electiveGroups ElectiveGroup[]` confirms direct
 * ownership — matching the established Department -> Program ->
 * CurriculumVersion -> SemesterCatalog -> {Subject, ElectiveGroup} chain.
 * There is no `curriculumVersionId` on this model; ElectiveGroup does NOT
 * carry a second, redundant ownership field alongside `semesterCatalogId`
 * the way nothing else in this schema carries redundant multi-hop
 * ownership either (see `PromotionBatch`'s own comment on deliberately
 * not storing `programId` alongside `semesterCatalogId`).
 *
 * IDENTITY: `@@unique([semesterCatalogId, name])` scopes uniqueness to
 * the (semesterCatalogId, name) pair, not globally — the same
 * composite-unique shape `CurriculumVersion.label`
 * (`@@unique([programId, label])`) and `SemesterCatalog.number`
 * (`@@unique([curriculumVersionId, number])`) already establish. There is
 * no `code` field on this model — unlike Department/Program/Subject,
 * `name` is ElectiveGroup's ONLY identifying string, and no `code` is
 * invented here since the schema has none.
 *
 * NOT MODELED HERE: `subjects Subject[]` and `selections
 * StudentElectiveSelection[]` are back-relations, not ElectiveGroup's own
 * fields — omitted from every type below, matching
 * `semester.types.ts`'s identical exclusion of `SemesterCatalog.subjects`
 * / `.electiveGroups` and `curriculum.types.ts`'s exclusion of
 * `CurriculumVersion.semesterCatalogs`. A caller needing the Subjects
 * inside a group, or the StudentElectiveSelections against it, resolves
 * them via the Subject module (filtered by `electiveGroupId`) or a future
 * StudentElectiveSelection module, respectively — not by embedding either
 * collection into `ElectiveGroupDTO`. This module does not define
 * `StudentElectiveSelection`-related contracts at all: submission,
 * eligibility, and selection-count enforcement against `maxSelect` belong
 * to that future domain, per this task's own scope boundary (see
 * `StudentElectiveSelection`'s own schema comment on the app-layer count
 * check it still needs).
 *
 * LIFECYCLE: the Prisma `ElectiveGroup` model has no status/lifecycle
 * enum and no `deletedAt` field, so — matching
 * `department.types.ts`/`program.types.ts`/`semester.types.ts`'s
 * identical reasoning — no `ElectiveGroupStatus` type or archival concept
 * is introduced here.
 *
 * SUBJECT RELATIONSHIP (Subject.isElective / Subject.electiveGroupId):
 * `subject.types.ts` already documents, at the Subject side, that these
 * two fields are independent and DB-unenforced — no CHECK constraint
 * ties `isElective: true` to a non-null `electiveGroupId`. That remains
 * true and is not re-litigated or re-encoded here: this file has no way
 * to see or constrain a Subject row's `isElective` value, and doing so
 * would reach across the module boundary this task is scoped to. The one
 * relevant consequence on THIS side: nothing in `ElectiveGroupDTO` below
 * exposes a derived "subject count" or "core vs. elective" indicator,
 * since computing one would require reading Subject rows this module
 * does not own. Whichever layer eventually enforces isElective/
 * electiveGroupId agreement — flagged as unresolved in both files — it is
 * not this one.
 *
 * `subject.types.ts` also currently declares a LOCAL forward-reference
 * `type ElectiveGroupId = string` with a comment instructing it be
 * deleted and replaced with an import from this module once it exists.
 * That file is out of scope for this task (see the accompanying report)
 * and is therefore left untouched; `ElectiveGroupId` below is the
 * canonical declaration going forward.
 */

export type ElectiveGroupId = string;

/**
 * The API-safe representation of an ElectiveGroup. Deliberately NOT the
 * Prisma `ElectiveGroup` model — `semesterCatalog` is represented as
 * `semesterCatalogId` (a plain id, matching `SubjectDTO.semesterCatalogId`
 * / `SemesterCatalogDTO.curriculumVersionId`'s identical convention), and
 * `subjects` / `selections` are omitted entirely, so an ordinary
 * ElectiveGroup lookup/list never forces loading either relation. This
 * DTO can always be constructed from a bare
 * `prisma.electiveGroup.findUnique(...)` / `findMany` result with no
 * `include`, matching every sibling mapper's philosophy.
 *
 * `minSelect`/`maxSelect` are plain `number`, not optional — both are
 * non-nullable `Int` columns with DB defaults (`@default(1)` each); a
 * persisted row always has concrete values for both, so there is nothing
 * for `?:`/`| null` to express here (unlike `SubjectDTO.electiveGroupId`,
 * which is genuinely `String?` in the schema).
 *
 * No separate `ElectiveGroupSummaryDTO` is defined, for the same reason
 * `department.types.ts`/`program.types.ts`/`semester.types.ts` don't
 * define one: ElectiveGroup's intrinsic fields are few enough that a
 * "summary" view would be identical to this DTO.
 */
export interface ElectiveGroupDTO {
  readonly id: ElectiveGroupId;
  readonly semesterCatalogId: SemesterCatalogId;
  readonly name: string;
  readonly minSelect: number;
  readonly maxSelect: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/**
 * Fields a caller may supply when creating an ElectiveGroup. `id`,
 * `createdAt`, and `updatedAt` are database-generated and excluded,
 * matching every sibling `Create*Input`'s convention.
 *
 * `semesterCatalogId` is required — `ElectiveGroup.semesterCatalogId` has
 * no `?` and no default in the schema, so an ElectiveGroup cannot be
 * created without referencing an existing SemesterCatalog. It is
 * accepted as a plain id (`semesterCatalog: {...}` nested-creation is
 * not offered), matching `CreateSubjectInput.semesterCatalogId` /
 * `CreateSemesterCatalogInput.curriculumVersionId`'s identical
 * convention.
 *
 * `name` is required — `ElectiveGroup.name` is a non-nullable `String`
 * column with no schema default.
 *
 * `minSelect`/`maxSelect` are optional, NOT excluded — both are plain
 * columns with real DB defaults (`@default(1)`), the same
 * "has-a-default, nothing marks it protected" reasoning
 * `CreateCurriculumVersionInput.status` uses for its own optional field.
 * Leaving them optional lets a caller either rely on the default
 * (a single-choice group, the common case per
 * `StudentElectiveSelection`'s own schema comment) or specify wider
 * selection bounds explicitly for a multi-choice group. This contract
 * does not enforce `minSelect <= maxSelect` — no CHECK constraint ties
 * them in the schema, so — matching `subject.types.ts`'s identical
 * non-enforcement of `isElective`/`electiveGroupId` — any such agreement
 * is a service-layer concern, not something this type file encodes.
 */
export interface CreateElectiveGroupInput {
  readonly semesterCatalogId: SemesterCatalogId;
  readonly name: string;
  readonly minSelect?: number;
  readonly maxSelect?: number;
}

/**
 * Mutable ElectiveGroup fields.
 *
 * `semesterCatalogId` is EXCLUDED, not merely flagged — the same
 * historical-integrity reasoning `subject.types.ts` applies to excluding
 * its own `semesterCatalogId`, and `semester.types.ts` applies to
 * excluding `curriculumVersionId`. Once an ElectiveGroup row exists, it
 * is referenced by id from `Subject.electiveGroupId` (nullable, but real
 * once set) and `StudentElectiveSelection.electiveGroupId` (required —
 * a permanent record of which group a student's choice was made
 * against). Reassigning `semesterCatalogId` after either kind of
 * reference exists would retroactively move an already-populated,
 * possibly already-selected-from elective group into a different
 * curriculum semester, with no schema-level cascade or guard against it.
 * The domain model gives no operation for moving an ElectiveGroup between
 * SemesterCatalogs, so this contract doesn't invent one.
 *
 * `name` is INCLUDED, not excluded. Nothing in the schema or this
 * repository establishes `name` as an external stable identifier the way
 * `department.types.ts` argues for `Department.code` — an ElectiveGroup
 * is referenced elsewhere in the schema strictly by `id`
 * (`Subject.electiveGroupId` / `StudentElectiveSelection.electiveGroupId`),
 * never by `name`. This mirrors `CurriculumVersion.label` /
 * `SemesterCatalog.number` / `Subject.code`'s identical position as the
 * mutable half of a composite unique constraint. Left mutable following
 * that precedent; the `@@unique([semesterCatalogId, name])` constraint
 * still applies and must be enforced by the repository on update, same
 * as on create.
 *
 * `minSelect`/`maxSelect` are INCLUDED, flagged with the same caution
 * `program.types.ts` applies to `durationYears`/`totalSemesters`: there
 * is no FK-reassignment-style historical corruption risk (no downstream
 * row embeds "the `maxSelect` value that was in effect when I was
 * created" — `StudentElectiveSelection` stores only `subjectId` /
 * `electiveGroupId`, not a snapshot of the bounds), so exclusion is not
 * warranted. But `StudentElectiveSelection`'s own schema comment states
 * `maxSelect` is read live by an app-layer count check when validating a
 * student's selections; changing it after selections already exist
 * changes what count is considered valid going forward, without
 * retroactively invalidating past selections. This contract still allows
 * the update — nothing in Prisma itself forbids it — but the service
 * layer should decide whether/how to reconcile already-made selections
 * against a newly-tightened bound; that reconciliation is out of scope
 * for a type file.
 *
 * Optional fields use `field?: type`, not `field?: type | undefined`,
 * per the project's `exactOptionalPropertyTypes: true` convention,
 * matching every sibling `Update*Input`'s established pattern.
 */
export interface UpdateElectiveGroupInput {
  readonly name?: string;
  readonly minSelect?: number;
  readonly maxSelect?: number;
}

/**
 * Filtering only — pagination/sorting live in
 * `ListElectiveGroupsOptions`, matching the Filters/Options split
 * established throughout this module family.
 *
 * `semesterCatalogId` is included because it is the leftmost column of
 * the schema's `@@unique([semesterCatalogId, name])` constraint —
 * "list every elective group in this semester catalog" is both
 * schema-supported and the obvious, central use of this module,
 * matching `ListSubjectsFilters.semesterCatalogId` /
 * `ListSemesterCatalogsFilters.curriculumVersionId`'s identical
 * justification for their own leftmost-unique-column FK.
 *
 * `search` is expected to match against `name` — ElectiveGroup's only
 * free-text identity field (there is no `code`/`label` on this model),
 * matching `ListCurriculumVersionsFilters.search`'s identical
 * single-field reasoning. Exact matching strategy is a repository-layer
 * concern, not part of this contract.
 *
 * `minSelect`/`maxSelect` are deliberately NOT offered as filters —
 * unlike `Subject.isElective` (a boolean flag with an obvious equality
 * filter use, included in `ListSubjectsFilters`), nothing in this
 * repository establishes "find groups requiring at least N selections"
 * as an existing or evidenced admin need. Adding them here would be
 * exactly the kind of unrequested field this task warned against.
 */
export interface ListElectiveGroupsFilters {
  readonly search?: string;
  readonly semesterCatalogId?: SemesterCatalogId;
}

/**
 * Pagination + sort options, mirroring every sibling `List*Options`.
 * `sortBy` is restricted to ElectiveGroup's own scalar identity fields —
 * `name` and `createdAt` — matching `ListSubjectsOptions`'s identical
 * shape for its own `name`/`createdAt`. `semesterCatalogId` is excluded
 * as a sort key (a foreign key, not a meaningful ordering, matching how
 * `electiveGroupId`/`semesterCatalogId` are excluded from
 * `ListSubjectsOptions.sortBy`), and `minSelect`/`maxSelect` are excluded
 * too — the same "no demonstrated sort requirement" reasoning
 * `ListProgramsOptions` applies to omitting `durationYears`/
 * `totalSemesters`.
 */
export interface ListElectiveGroupsOptions {
  readonly page: number;
  readonly limit: number;
  readonly sortBy: 'name' | 'createdAt';
  readonly sortOrder: 'asc' | 'desc';
}

export interface ListElectiveGroupsResult {
  readonly electiveGroups: ElectiveGroupDTO[];
  readonly total: number;
}
