// apps/api/src/modules/academic/SemesterCatalog/semester.mapper.ts

import type { SemesterCatalog } from '@spark/database/client';

import type { SemesterCatalogDTO } from './semester.types.js';

/**
 * Persistence → DTO boundary for the SemesterCatalog domain. This must
 * be the ONLY place a Prisma `SemesterCatalog` row is shaped into
 * `SemesterCatalogDTO` — route every SemesterCatalog-returning endpoint
 * through this file, the same convention curriculum.mapper.ts
 * establishes for `CurriculumVersion` and department.mapper.ts
 * establishes for `Department`.
 *
 * It does not:
 * - query the database
 * - perform authorization
 * - validate uniqueness or existence
 * - decide whether a `number` change is safe (that's
 *   semester.service.ts's `updateSemesterCatalog`)
 * - write audit records
 * - mutate the input record
 *
 * Deterministic and side-effect free. `number` is exposed exactly as
 * persisted — no normalization; that belongs at the input boundary
 * (semester.validation.ts) or the service layer, not here.
 *
 * Relations (`curriculumVersion`, `semesterEnrollments`, `subjects`,
 * `electiveGroups`, `promotionBatches`, `timetableEntries`, `lectures`,
 * `entryAdmissions`) are intentionally never read or serialized here.
 * `SemesterCatalogDTO` (semester.types.ts) exposes only
 * SemesterCatalog's own fields plus `curriculumVersionId` — a semester
 * catalog enriched with its subjects, enrollments, or schedule is a
 * deliberate, separately modeled response, not something this mapper
 * silently grows into.
 */

export function toSemesterCatalogDTO(semesterCatalog: SemesterCatalog): SemesterCatalogDTO {
  return {
    id: semesterCatalog.id,
    curriculumVersionId: semesterCatalog.curriculumVersionId,
    number: semesterCatalog.number,
    createdAt: semesterCatalog.createdAt.toISOString(),
    updatedAt: semesterCatalog.updatedAt.toISOString(),
  };
}

export function toSemesterCatalogDTOList(
  semesterCatalogs: readonly SemesterCatalog[],
): SemesterCatalogDTO[] {
  return semesterCatalogs.map(toSemesterCatalogDTO);
}
