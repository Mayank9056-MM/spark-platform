// apps/api/src/modules/subject-offerings/subjectOffering.types.ts

import type { SubjectId } from '../academic/subjects/subject.types.js';
import type { AcademicYearId } from '../academic-years/academic-year.types.js';

export type SubjectOfferingId = string;

export interface SubjectOfferingDTO {
  readonly id: SubjectOfferingId;
  readonly subjectId: SubjectId;
  readonly academicYearId: AcademicYearId;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateSubjectOfferingInput {
  readonly subjectId: SubjectId;
  readonly academicYearId: AcademicYearId;
}

/**
 * Filtering only — pagination/sorting live in
 * `ListSubjectOfferingsOptions`, matching the Filters/Options split used
 * by every sibling module.
 *
 * Both fields are SubjectOffering's own FKs and are schema-backed:
 * `subjectId` and `academicYearId` together form
 * `@@unique([subjectId, academicYearId])`, and `academicYearId` alone
 * also has its own `@@index([academicYearId])` — "all offerings for this
 * academic year" is a direct, indexed, and obviously central query for
 * this module.
 *
 * No `search` — SubjectOffering has no own string field to match
 * against (matching `ListSemesterEnrollmentsFilters` /
 * `ListSemesterCatalogsFilters`'s identical reasoning for the same
 * absence). No `semesterCatalogId`/`curriculumVersionId`/`programId`
 * filters — none of these are stored on SubjectOffering; they are only
 * reachable by joining through `subjectId` into Subject and beyond, and
 * nothing in this repository establishes relation-traversal filtering
 * as an existing pattern (`ListSubjectsFilters` draws the identical line
 * at not exposing `curriculumVersionId`/`programId`/`departmentId`). No
 * `facultyId`/`sectionId` — neither exists on this model; faculty
 * assignment is a separate downstream domain.
 */
export interface ListSubjectOfferingsFilters {
  readonly subjectId?: SubjectId;
  readonly academicYearId?: AcademicYearId;
}

/**
 * Pagination + sort options, mirroring every sibling `List*Options`.
 * `sortBy` is restricted to `createdAt` and `updatedAt` — the ONLY two
 * scalar fields on this model that are not foreign keys. Every sibling
 * module's `sortBy` union includes at least one genuine non-FK own field
 * (`number`, `label`, `code`/`name`, `attemptNumber`, `finalizedAt`);
 * SubjectOffering has none, so its timestamps are the only legitimate
 * sort keys available. `subjectId`/`academicYearId` are excluded as
 * sort keys for the same "foreign key, not a meaningful ordering"
 * reason `ListSemesterCatalogsOptions` excludes `curriculumVersionId`.
 */
export interface ListSubjectOfferingsOptions {
  readonly page: number;
  readonly limit: number;
  readonly sortBy: 'createdAt' | 'updatedAt';
  readonly sortOrder: 'asc' | 'desc';
}

export interface ListSubjectOfferingsResult {
  readonly subjectOfferings: readonly SubjectOfferingDTO[];
  readonly total: number;
}
