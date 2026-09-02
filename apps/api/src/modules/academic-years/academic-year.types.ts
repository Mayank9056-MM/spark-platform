// apps/api/src/modules/academic-years/academic-year.types.ts

/**
 * An AcademicYear is a real enrollment term — e.g. "2025-26" — distinct
 * from the derived, non-persisted "year" concept described in
 * `SemesterCatalog`'s schema comment (computed from `number`, never
 * stored; see `semester.types.ts`). This module covers only the
 * AcademicYear entity's own fields (`id`, `label`, `startDate`,
 * `endDate`, `isActive`) and timestamps — not `semesterEnrollments`,
 * `promotionBatches`, `subjectOfferings`, `timetableEntries`, or
 * `lectures`, which belong to their own modules and reference an
 * AcademicYear by id.
 *
 * BUSINESS RULE: at most one AcademicYear is active
 * (`isActive: true`) for the whole college at any time. `isActive`
 * means "this is the college's current operational year" — it does not
 * mean the year is editable, has active enrollments, or that
 * `isActive: false` means archived/deleted/invalid. An inactive
 * AcademicYear remains a valid historical record and may still be
 * referenced by enrollments, promotions, offerings, timetables, and
 * lectures.
 *
 * Because activating a year is a college-wide state transition (it
 * requires deactivating whichever year is currently active, atomically),
 * `isActive` is exposed on the DTO as read state but is deliberately
 * excluded from `CreateAcademicYearInput` and `UpdateAcademicYearInput`.
 * Activation is a future service-level operation
 * (e.g. `activateAcademicYear(id)`), not generic CRUD. This file does
 * not attempt to encode the one-active-year invariant itself — a
 * TypeScript type describes a single object and cannot constrain how
 * many other rows in the table have `isActive: true`; that invariant is
 * a service/transaction/database concern, not a type-level one.
 *
 * No `AcademicYearStatus` enum is introduced — the Prisma model uses a
 * plain `isActive: Boolean`, not a multi-value status, so the DTO
 * mirrors that directly.
 */

export type AcademicYearId = string;

/**
 * API-safe representation of an AcademicYear. Omits all relations
 * (`semesterEnrollments`, `promotionBatches`, `subjectOfferings`,
 * `timetableEntries`, `lectures`) so an ordinary lookup/list never
 * forces loading them — each is owned by its own module.
 *
 * `startDate`/`endDate` are `string` (ISO), matching every sibling
 * DTO's convention for Prisma `DateTime` fields.
 */
export interface AcademicYearDTO {
  readonly id: AcademicYearId;
  readonly label: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly isActive: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/**
 * Fields a caller may supply when creating an AcademicYear. `id`,
 * `createdAt`, `updatedAt` are generated and excluded, matching every
 * sibling `CreateXInput`.
 *
 * `isActive` is deliberately excluded, not merely defaulted. Creating a
 * year and activating it college-wide are different operations —
 * exposing `isActive` here (even as optional) would let creation
 * implicitly perform an activation, bypassing the deactivate-current /
 * activate-requested transition activation requires. The Prisma
 * default (`isActive = false`) applies untouched; making a new year
 * current happens through the future activation workflow, not this
 * input.
 */
export interface CreateAcademicYearInput {
  readonly label: string;
  readonly startDate: string;
  readonly endDate: string;
}

/**
 * Mutable AcademicYear fields via generic update.
 *
 * `label` is unflagged — nothing references an AcademicYear by its
 * label value (only by `academicYearId`), matching
 * `UpdateProgramInput.name` / `UpdateCurriculumVersionInput.label`'s
 * precedent for freely mutable display fields.
 *
 * `startDate`/`endDate` remain here — the service may later restrict
 * changing them once dependent historical rows exist, but that's a
 * business rule the type layer doesn't enforce or assume.
 *
 * `isActive` is deliberately excluded. It is not an ordinary mutable
 * attribute — flipping it is a college-wide state transition (deactivate
 * whichever year is currently active, activate this one, atomically),
 * not a field-level PATCH. That operation belongs to a dedicated future
 * service method (e.g. `activateAcademicYear(id)`), not this generic
 * update contract.
 *
 * Optional fields use `field?: type`, not `field?: type | undefined`,
 * per the project's `exactOptionalPropertyTypes: true` convention.
 */
export interface UpdateAcademicYearInput {
  readonly label?: string;
  readonly startDate?: string;
  readonly endDate?: string;
}

/**
 * Filtering only — pagination/sorting live in `ListAcademicYearsOptions`,
 * matching every sibling module's Filters/Options split.
 *
 * `isActive` is a legitimate read filter (`@@index([isActive])`; e.g.
 * "find the current year") even though it's excluded from
 * `UpdateAcademicYearInput` — filtering by state and mutating state are
 * different concerns. `search` matches against `label`, the model's
 * only string field.
 */
export interface ListAcademicYearsFilters {
  readonly search?: string;
  readonly isActive?: boolean;
}

/**
 * Pagination + sort options, mirroring every sibling `ListXOptions`.
 * `isActive` is excluded as a sort key — a boolean flag, not a
 * meaningful ordering.
 */
export interface ListAcademicYearsOptions {
  readonly page: number;
  readonly limit: number;
  readonly sortBy: 'label' | 'startDate' | 'createdAt';
  readonly sortOrder: 'asc' | 'desc';
}

export interface ListAcademicYearsResult {
  readonly academicYears: AcademicYearDTO[];
  readonly total: number;
}
