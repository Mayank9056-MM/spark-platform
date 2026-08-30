// apps/api/src/modules/academic/curricula/curriculum.mapper.ts

import type { CurriculumVersion } from '@spark/database/client';

import type { CurriculumVersionDTO } from './curriculum.types.js';

/**
 * Persistence → DTO boundary for the CurriculumVersion domain. This must
 * be the ONLY place a Prisma `CurriculumVersion` row is shaped into
 * `CurriculumVersionDTO` — route every CurriculumVersion-returning
 * endpoint through this file, the same convention department.mapper.ts
 * establishes for `Department` and program.mapper.ts establishes for
 * `Program`.
 *
 * It does not:
 * - query the database
 * - perform authorization
 * - validate uniqueness or existence
 * - enforce or infer status transitions
 * - write audit records
 * - mutate the input record
 *
 * Deterministic and side-effect free. `label` and `status` are exposed
 * exactly as persisted — no case conversion, trimming, or other
 * normalization; that belongs at the input boundary
 * (curriculum.validation.ts) or the service layer, not here.
 *
 * Relations (`program`, `semesterCatalogs`, `studentEnrollments`,
 * `admissions`) are intentionally never read or serialized here.
 * `CurriculumVersionDTO` (curriculum.types.ts) exposes only
 * CurriculumVersion's own fields plus `programId` — a curriculum version
 * enriched with its Program, semesters, or enrollment/admission history
 * is a deliberate, separately modeled response, not something this
 * mapper silently grows into.
 */

export function toCurriculumVersionDTO(curriculumVersion: CurriculumVersion): CurriculumVersionDTO {
  return {
    id: curriculumVersion.id,
    programId: curriculumVersion.programId,
    label: curriculumVersion.label,
    status: curriculumVersion.status,
    createdAt: curriculumVersion.createdAt.toISOString(),
    updatedAt: curriculumVersion.updatedAt.toISOString(),
  };
}

export function toCurriculumVersionDTOList(
  curriculumVersions: readonly CurriculumVersion[],
): CurriculumVersionDTO[] {
  return curriculumVersions.map(toCurriculumVersionDTO);
}
