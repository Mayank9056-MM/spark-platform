// apps/api/src/modules/faculty-assignments/facultyAssignment.types.ts

import type { SubjectOfferingId } from '../subject-offerings/subjectOffering.types.js';

/**
 * A FacultyAssignment answers "which faculty member teaches which
 * component of this SubjectOffering" — the layer between the curriculum/
 * offering domain and the not-yet-implemented teaching domain:
 *
 *   SubjectOffering -> FacultyAssignment -> Timetable -> Lecture ->
 *     AttendanceRecord
 *
 * The Prisma `FacultyAssignment` model has exactly three own fields
 * beyond its id and timestamps: `subjectOfferingId`,
 * `subjectComponentId`, and `facultyUserId`. The schema's own comment
 * states the MVP simplification this reflects: "one faculty per
 * (offering, component) — no batch dimension, so no reason for this to
 * be a list." `@@unique([subjectOfferingId, subjectComponentId])`
 * enforces this directly — at most one FacultyAssignment may exist for
 * a given (SubjectOffering, SubjectComponent) pair. This file does not
 * model a shape that would suggest duplicate assignment identity is
 * expected.
 *
 * SUBJECT COMPONENT, NOT JUST SUBJECT OFFERING. A Subject decomposes
 * into one or more SubjectComponent rows (THEORY/PRACTICAL/TUTORIAL/
 * PROJECT, each with its own credits/hoursPerWeek — see
 * `SubjectComponent` in schema.prisma). FacultyAssignment assigns a
 * faculty member to teach one specific component of one specific
 * offering — e.g. "Dr. Sharma teaches the THEORY component of DBMS,
 * 2026-27" — not the offering as an undifferentiated whole. Dropping
 * `subjectComponentId` from this contract would silently misrepresent
 * the actual database identity of this row.
 *
 * NO SUBJECT COMPONENT MODULE EXISTS YET. There is no
 * `academic/subject-components/` (or similarly named) module in this
 * repository — `academic/` currently contains only `curricula/`,
 * `departments/`, `programs/`, `SemesterCatalog/`, and `subjects/`.
 * `SubjectComponentId` is therefore declared locally below using this
 * codebase's established `type XId = string` pattern, matching exactly
 * how `subject.types.ts` declares `ElectiveGroupId` locally for the
 * identical reason (`ElectiveGroup` has a real Prisma model but no
 * module of its own yet). When a SubjectComponent module is created,
 * delete the local alias here and import from it instead.
 *
 * NO DEDICATED USERID TYPE. `user.types.ts` represents user identity as
 * plain `string` throughout (no `UserId` alias exists anywhere in this
 * codebase — `AdmissionDTO.userId`, `StudentEnrollmentDTO.userId`, and
 * every `*ByUserId` field in `promotion.types.ts` are all bare
 * `string`). `facultyUserId` follows that same convention exactly; no
 * new `UserId` alias is introduced here for aesthetic symmetry with
 * `SubjectOfferingId`/`SubjectComponentId`.
 *
 * NO ACADEMIC YEAR / CURRICULUM FIELD. `academicYearId` lives on
 * `SubjectOffering`, reachable via `subjectOfferingId`.
 * FacultyAssignment does NOT redundantly store it — a caller who needs
 * an assignment's academic year resolves it by following
 * `subjectOfferingId` into the SubjectOffering module, exactly as
 * `subjectOffering.types.ts` itself resolves a Subject's semester
 * catalog by following `subjectId` rather than duplicating derived
 * data. The same reasoning excludes `programId`/`departmentId`/
 * `curriculumVersionId`/`semesterCatalogId` — none of them are stored
 * on this model, and all are only reachable through multiple relation
 * hops this module's repository does not establish.
 *
 * NO TENANT/ORGANIZATION FIELD. As with every other module in this
 * schema, there is no `organizationId`/`tenantId` column on
 * `FacultyAssignment` — this is explicitly a single-college deployment
 * (see schema.prisma's header comment) — so none is introduced here.
 *
 * NO ROLE/ELIGIBILITY FIELDS. Whether `facultyUserId` actually holds a
 * faculty-capable role is an RBAC concern the schema's own comment on
 * this model explicitly defers to the service layer ("does not verify
 * facultyUserId holds a faculty-capable role... Enforce via the RBAC
 * service at assignment time"). This contract does not encode role
 * eligibility, workload limits, or department-matching rules — those
 * are business rules, not data-contract shape.
 *
 * NOT MODELED HERE: `timetableEntries` and `lectures` are real Prisma
 * relations FROM FacultyAssignment, but each belongs to its own future
 * module and references a FacultyAssignment by
 * `facultyAssignmentId`. Embedding either here would force every
 * ordinary FacultyAssignment read to load scheduling/teaching-occurrence
 * data — exactly what `subjectOffering.types.ts` warns against for its
 * own downstream relations.
 *
 * IDENTITY IS PERMANENT ONCE SCHEDULING ACTIVITY EXISTS. `Timetable` and
 * `Lecture` both reference a FacultyAssignment by
 * `facultyAssignmentId` the moment either exists. Reassigning
 * `subjectOfferingId`, `subjectComponentId`, or `facultyUserId` after
 * that would retroactively change which offering/component/faculty an
 * already-scheduled or already-taught session is understood to belong
 * to, with no schema-level cascade or guard against it — the same
 * reasoning `subjectOffering.types.ts` applies to excluding its own
 * `UpdateSubjectOfferingInput`. See the note on the absent
 * `UpdateFacultyAssignmentInput` below.
 */

export type FacultyAssignmentId = string;

/**
 * See the file-level comment above: no `SubjectComponent` module exists
 * yet in this repository, so this is a local forward-reference, not an
 * import — delete and replace with an import once that module is
 * created, matching exactly how `subject.types.ts` handles
 * `ElectiveGroupId` for the identical reason.
 */
export type SubjectComponentId = string;

/**
 * The API-safe representation of a FacultyAssignment. Deliberately NOT
 * the Prisma model — `subjectOffering`, `subjectComponent`, and
 * `faculty` are represented as plain ids, and `timetableEntries` /
 * `lectures` are omitted entirely, matching every sibling DTO's
 * convention of representing relations by id and never embedding them.
 * This DTO can always be constructed from a bare
 * `prisma.facultyAssignment.findUnique(...)` / `findMany` with no
 * `include`.
 *
 * There is no nullable own-field on this model — a FacultyAssignment
 * row is exactly `{ id, subjectOfferingId, subjectComponentId,
 * facultyUserId, createdAt, updatedAt }`, so no `| null` appears here.
 */
export interface FacultyAssignmentDTO {
  readonly id: FacultyAssignmentId;
  readonly subjectOfferingId: SubjectOfferingId;
  readonly subjectComponentId: SubjectComponentId;
  readonly facultyUserId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/**
 * Fields a caller may supply when creating a FacultyAssignment. `id`,
 * `createdAt`, `updatedAt` are database-generated and excluded, matching
 * every sibling `Create*Input`.
 *
 * All three fields are required — none of `subjectOfferingId`,
 * `subjectComponentId`, `facultyUserId` is nullable or has a schema
 * default. Each is accepted as a plain id (no nested-creation of
 * SubjectOffering/SubjectComponent/User is offered), matching
 * `CreateSubjectOfferingInput.subjectId`'s identical "reference an
 * existing row, don't implicitly create one" convention.
 *
 * No actor id (e.g. `assignedByUserId`) is accepted, and none needs to
 * be documented as excluded — there is no such column on the
 * `FacultyAssignment` model. The authenticated actor is a separate
 * service-method parameter (`actorUserId: string`), matching every
 * sibling module's established `service.createX(actorUserId, input)`
 * pattern — never a field on this input.
 *
 * `facultyUserId` here is the faculty member BEING assigned, never to
 * be confused with the actor performing the assignment — the two are
 * structurally kept apart by this input never accepting the latter at
 * all.
 *
 * The `@@unique([subjectOfferingId, subjectComponentId])` constraint is
 * not re-expressed as a type here — this file describes the shape of a
 * valid request, not the repository's duplicate-check behavior.
 */
export interface CreateFacultyAssignmentInput {
  readonly subjectOfferingId: SubjectOfferingId;
  readonly subjectComponentId: SubjectComponentId;
  readonly facultyUserId: string;
}

/**
 * No `UpdateFacultyAssignmentInput` is defined.
 *
 * All three of FacultyAssignment's own fields are exactly the identity
 * fields the module header argues must stay immutable once any
 * scheduling activity (`Timetable`/`Lecture`) references this row —
 * there is no separate administrative attribute (no `label`, `remarks`,
 * `status`, or similar) left over for a generic PATCH to touch, the same
 * situation `subjectOffering.types.ts` documents for its own absent
 * `UpdateSubjectOfferingInput`.
 *
 * If a faculty member genuinely needs to be swapped for a given
 * (SubjectOffering, SubjectComponent) pair before any scheduling
 * activity exists against it, that is better served by delete-and-
 * recreate (or a narrow, explicitly-justified dedicated reassignment
 * command) than by a generic update contract — this file does not
 * invent either.
 */

/**
 * Filtering only — pagination/sorting live in
 * `ListFacultyAssignmentsOptions`, matching the Filters/Options split
 * used by every sibling module.
 *
 * All three fields are FacultyAssignment's own FKs and are
 * schema-backed: `subjectOfferingId` and `subjectComponentId` together
 * form `@@unique([subjectOfferingId, subjectComponentId])`, and
 * `facultyUserId` has its own `@@index([facultyUserId])` — "which
 * offerings/components is this faculty member assigned to" is a direct,
 * indexed, and obviously central query for this module.
 *
 * No `search` — FacultyAssignment has no own string field to match
 * against, matching `ListSubjectOfferingsFilters`'s identical reasoning
 * for the same absence. No `academicYearId`/`programId`/
 * `curriculumVersionId`/`semesterCatalogId` filters — none of these are
 * stored on FacultyAssignment; they are only reachable by joining
 * through `subjectOfferingId` (and beyond), and nothing in this
 * repository establishes relation-traversal filtering as an existing
 * pattern (`ListSubjectOfferingsFilters` draws the identical line at not
 * exposing `semesterCatalogId`/`curriculumVersionId`/`programId`).
 */
export interface ListFacultyAssignmentsFilters {
  readonly subjectOfferingId?: SubjectOfferingId;
  readonly subjectComponentId?: SubjectComponentId;
  readonly facultyUserId?: string;
}

/**
 * Pagination + sort options, mirroring every sibling `List*Options`.
 * `sortBy` is restricted to `createdAt` and `updatedAt` — the ONLY two
 * scalar fields on this model that are not foreign keys, the same
 * situation `subjectOffering.types.ts` documents for its own
 * `ListSubjectOfferingsOptions`. `subjectOfferingId` /
 * `subjectComponentId` / `facultyUserId` are excluded as sort keys —
 * foreign keys, not a meaningful ordering.
 */
export interface ListFacultyAssignmentsOptions {
  readonly page: number;
  readonly limit: number;
  readonly sortBy: 'createdAt' | 'updatedAt';
  readonly sortOrder: 'asc' | 'desc';
}

export interface ListFacultyAssignmentsResult {
  readonly facultyAssignments: readonly FacultyAssignmentDTO[];
  readonly total: number;
}
