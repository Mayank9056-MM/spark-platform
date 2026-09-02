// apps/api/src/modules/academic-years/academic-year.mapper.ts

import type { AcademicYear } from '@spark/database/client';

import type { AcademicYearDTO } from './academic-year.types.js';

/**
 * Persistence → DTO boundary for the AcademicYear domain. This must be
 * the ONLY place a Prisma `AcademicYear` row is shaped into
 * `AcademicYearDTO` — route every AcademicYear-returning endpoint
 * through this file, the same convention department.mapper.ts
 * establishes for `Department` and program.mapper.ts establishes for
 * `Program`.
 *
 * It does not:
 * - query the database
 * - perform authorization
 * - validate uniqueness or existence
 * - enforce or infer the one-active-year invariant
 * - activate or deactivate anything
 * - write audit records
 * - mutate the input record
 *
 * Deterministic and side-effect free. `label` and `isActive` are exposed
 * exactly as persisted — no normalization, casing, or derived active-state
 * logic; that belongs at the input boundary (academic-year.validation.ts)
 * or the service layer, not here.
 *
 * Relations (`semesterEnrollments`, `promotionBatches`,
 * `subjectOfferings`, `timetableEntries`, `lectures`) are intentionally
 * never read or serialized here. `AcademicYearDTO` (academic-year.types.ts)
 * exposes only AcademicYear's own fields — an academic year enriched with
 * its enrollments, offerings, or schedule is a deliberate, separately
 * modeled response, not something this mapper silently grows into.
 */

export function toAcademicYearDTO(academicYear: AcademicYear): AcademicYearDTO {
  return {
    id: academicYear.id,
    label: academicYear.label,
    startDate: academicYear.startDate.toISOString(),
    endDate: academicYear.endDate.toISOString(),
    isActive: academicYear.isActive,
    createdAt: academicYear.createdAt.toISOString(),
    updatedAt: academicYear.updatedAt.toISOString(),
  };
}

export function toAcademicYearDTOList(academicYears: readonly AcademicYear[]): AcademicYearDTO[] {
  return academicYears.map(toAcademicYearDTO);
}
