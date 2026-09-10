// apps/api/src/modules/promotion/promotion.types.ts

import type { SemesterCatalogId } from '../academic/SemesterCatalog/semester.types.js';
import type { AcademicYearId } from '../academic-years/academic-year.types.js';
import type { SemesterEnrollmentId } from '../semester-enrollments/semesterEnrollment.types.js';
import type { StudentEnrollmentId } from '../student-enrollments/studentEnrollment.types.js';

/**
 * Promotion manages semester-end academic progression:
 *
 *   StudentEnrollment -> SemesterEnrollment -> PromotionBatch ->
 *     PromotionDecision -> next SemesterEnrollment / lifecycle state
 *
 * A PromotionBatch is one institutional promotion process for a single
 * (semesterCatalogId, academicYearId) pair — "Semester 2, AY 2026-27".
 * A PromotionDecision is one student's outcome inside that batch.
 *
 * There is no `UserId` type anywhere in this codebase (see
 * `user.types.ts`) — every user reference (`initiatedByUserId`,
 * `decidedByUserId`) is a plain `string`, matching
 * `AdmissionDTO.admittedByUserId` / `StudentEnrollmentDTO.userId`.
 *
 * Actor identity is NEVER a field on a `Create*Input` here.
 * `studentEnrollment.service.ts` confirms the established pattern:
 * the authenticated actor is a separate service-method parameter
 * (`actorUserId: string`), derived from `req.user`, not part of the
 * request body type. `initiatedByUserId` and `decidedByUserId` follow
 * that pattern exactly.
 */

export type PromotionBatchId = string;
export type PromotionDecisionId = string;

/** Mirrors schema.prisma's PromotionBatchStatus enum exactly. */
export type PromotionBatchStatus = 'DRAFT' | 'FINALIZED';

/** Mirrors schema.prisma's PromotionOutcome enum exactly (5 values). */
export type PromotionOutcome = 'PROMOTE' | 'REPEAT' | 'WITHDRAW' | 'DISCONTINUE' | 'GRADUATE';

/**
 * API-safe representation of a PromotionBatch. `semesterCatalog`,
 * `academicYear`, `initiatedBy`, and `decisions` relations are omitted,
 * matching every sibling DTO's convention of representing parents/
 * children by id only — an ordinary batch lookup/list must never force
 * loading its full decision set. No `decisionCount` / `promotedCount` /
 * `repeatedCount` — those are computed aggregates, not intrinsic fields,
 * and are not established anywhere in this codebase.
 *
 * `finalizedAt` is `DateTime?` in Prisma — always present on the row,
 * possibly null — so it is `string | null`, never optional, matching
 * `StudentEnrollmentDTO.statusChangedAt`'s identical nullable-timestamp
 * convention.
 */
export interface PromotionBatchDTO {
  readonly id: PromotionBatchId;
  readonly semesterCatalogId: SemesterCatalogId;
  readonly academicYearId: AcademicYearId;
  readonly initiatedByUserId: string;
  readonly status: PromotionBatchStatus;
  readonly finalizedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/**
 * API-safe representation of a PromotionDecision. Deliberately has NO
 * `updatedAt` — the Prisma model's own comment states a decision is an
 * immutable audit record once made (the app's runtime DB role even has
 * `UPDATE` revoked on this table), so exposing an `updatedAt` field
 * would misrepresent a row that can never actually be updated.
 *
 * `toSemesterEnrollmentId` is nullable (`String? @unique` in Prisma)
 * because WITHDRAW/DISCONTINUE/GRADUATE outcomes create no target
 * semester enrollment — only PROMOTE/REPEAT do.
 *
 * `remarks` is nullable (`String?`), following the same
 * always-present-but-nullable convention as `finalizedAt` above.
 */
export interface PromotionDecisionDTO {
  readonly id: PromotionDecisionId;
  readonly promotionBatchId: PromotionBatchId;
  readonly studentEnrollmentId: StudentEnrollmentId;
  readonly fromSemesterEnrollmentId: SemesterEnrollmentId;
  readonly toSemesterEnrollmentId: SemesterEnrollmentId | null;
  readonly outcome: PromotionOutcome;
  readonly remarks: string | null;
  readonly decidedByUserId: string;
  readonly decidedAt: string;
  readonly createdAt: string;
}

/**
 * Fields a caller may supply when opening a PromotionBatch. `id`,
 * `createdAt`, `updatedAt` are database-generated and excluded, matching
 * every sibling `CreateXInput`.
 *
 * `initiatedByUserId` is excluded — server-derived from the actor, see
 * the module header.
 *
 * `status` is excluded, not merely defaulted — a client must never be
 * able to open a batch in anything but the schema's `DRAFT` default,
 * matching `CreateSemesterEnrollmentInput` excluding `status` for the
 * identical reason.
 *
 * `finalizedAt` is excluded. Finalization is a college-wide business
 * operation (it must make every decision under the batch immutable),
 * not a generic mutable field on a create/update input — the same
 * reasoning `AcademicYearDTO.isActive` is excluded from
 * `CreateAcademicYearInput`/`UpdateAcademicYearInput` in favor of a
 * dedicated future `activateAcademicYear(id)` operation. A future
 * `finalizePromotionBatch(id)` service method needs no input type of
 * its own for the same reason — there is no client-supplied body data
 * involved in finalizing a batch.
 */
export interface CreatePromotionBatchInput {
  readonly semesterCatalogId: SemesterCatalogId;
  readonly academicYearId: AcademicYearId;
}

/**
 * No `UpdatePromotionBatchInput` is defined. Every field beyond the two
 * in `CreatePromotionBatchInput` is either immutable identity
 * (`semesterCatalogId`, `academicYearId` — rewriting either would
 * retroactively change which curriculum semester/term a batch and its
 * decisions are understood to belong to) or reached only through the
 * dedicated finalization operation described above (`status`,
 * `finalizedAt`). There is no field left for a generic PATCH to touch.
 */

/**
 * Fields a caller may supply when recording a PromotionDecision.
 *
 * `promotionBatchId` is excluded — supplied by route/service context
 * (e.g. `POST /promotion-batches/:batchId/decisions`), not the request
 * body, matching how a nested resource's parent id is kept out of its
 * own create input elsewhere in this codebase (`CreateSubjectInput`'s
 * `semesterCatalogId` equivalent parenting pattern).
 *
 * `decidedByUserId` and `decidedAt` are excluded — actor/system-derived,
 * see the module header; `decidedAt` also has a Prisma `@default(now())`.
 *
 * `toSemesterEnrollmentId` is excluded. It is not a client-supplied fact
 * — which SemesterEnrollment (if any) opens as a consequence of this
 * decision is determined by business logic in the service (create a new
 * one for PROMOTE/REPEAT, none for WITHDRAW/DISCONTINUE/GRADUATE), not
 * an arbitrary value a caller picks.
 *
 * `remarks` is optional and omittable (`remarks?: string`, not
 * `remarks?: string | undefined`) per the project's
 * `exactOptionalPropertyTypes: true` convention as documented in
 * `academic-year.types.ts` — a caller may supply remarks or omit them
 * entirely; the Prisma column is nullable with no required default.
 */
export interface CreatePromotionDecisionInput {
  readonly studentEnrollmentId: StudentEnrollmentId;
  readonly fromSemesterEnrollmentId: SemesterEnrollmentId;
  readonly outcome: PromotionOutcome;
  readonly remarks?: string;
}

/**
 * No `UpdatePromotionDecisionInput` is defined. A PromotionDecision is
 * an immutable audit record once made — see `PromotionDecisionDTO`'s
 * comment on the absent `updatedAt`. There is nothing here for a
 * generic update contract to expose.
 */

/**
 * Filtering only — pagination/sorting live in
 * `ListPromotionBatchesOptions`, matching the Filters/Options split
 * used by every sibling module.
 *
 * All three fields are covered by the schema's own
 * `@@index([semesterCatalogId, academicYearId, status])` on
 * `PromotionBatch`. No `search` — PromotionBatch has no own string
 * field to match against, matching `ListSemesterEnrollmentsFilters`'s
 * identical reasoning for omitting `search`.
 */
export interface ListPromotionBatchesFilters {
  readonly semesterCatalogId?: SemesterCatalogId;
  readonly academicYearId?: AcademicYearId;
  readonly status?: PromotionBatchStatus;
}

/**
 * Pagination + sort options, mirroring every sibling `ListXOptions`.
 * `finalizedAt` is included alongside `createdAt` as a genuine own
 * timestamp field ("show most recently finalized batches first").
 */
export interface ListPromotionBatchesOptions {
  readonly page: number;
  readonly limit: number;
  readonly sortBy: 'createdAt' | 'finalizedAt';
  readonly sortOrder: 'asc' | 'desc';
}

export interface ListPromotionBatchesResult {
  readonly promotionBatches: readonly PromotionBatchDTO[];
  readonly total: number;
}

/**
 * Filtering only — pagination/sorting live in
 * `ListPromotionDecisionsOptions`.
 *
 * `promotionBatchId` and `studentEnrollmentId` are both covered by the
 * schema's `@@unique([promotionBatchId, studentEnrollmentId])` /
 * `@@index([studentEnrollmentId])`. `outcome` has no dedicated index,
 * but is included regardless — "all REPEAT decisions in this batch" is
 * a central use of this module, and `AdmissionType`/`AdmissionQuota`
 * are filtered on in `admission.types.ts` under the same
 * not-independently-indexed circumstance.
 */
export interface ListPromotionDecisionsFilters {
  readonly promotionBatchId?: PromotionBatchId;
  readonly studentEnrollmentId?: StudentEnrollmentId;
  readonly outcome?: PromotionOutcome;
}

/**
 * Pagination + sort options, mirroring every sibling `ListXOptions`.
 * `decidedAt` is included alongside `createdAt` as PromotionDecision's
 * own genuine timestamp field.
 */
export interface ListPromotionDecisionsOptions {
  readonly page: number;
  readonly limit: number;
  readonly sortBy: 'decidedAt' | 'createdAt';
  readonly sortOrder: 'asc' | 'desc';
}

export interface ListPromotionDecisionsResult {
  readonly promotionDecisions: readonly PromotionDecisionDTO[];
  readonly total: number;
}
