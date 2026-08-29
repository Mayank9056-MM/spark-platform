// apps/api/src/modules/academic/programs/program.mapper.ts

import type { Program } from '@spark/database/client';

import type { ProgramDTO } from './program.types.js';

/**
 * Persistence → DTO boundary for the Program domain. This must be the
 * ONLY place a Prisma `Program` row is shaped into `ProgramDTO` — route
 * every Program-returning endpoint through this file, the same
 * convention department.mapper.ts establishes for `Department`.
 *
 * It does not:
 * - query the database
 * - perform authorization
 * - validate uniqueness or existence
 * - write audit records
 * - mutate the input record
 * - derive or recalculate durationYears/totalSemesters
 *
 * Deterministic and side-effect free. `name`, `code`, `departmentId`,
 * `durationYears`, and `totalSemesters` are exposed exactly as
 * persisted — no normalization, casing, or cross-field derivation; that
 * belongs at the input boundary (program.validation.ts) or the domain
 * layer, not here.
 *
 * Relations (`department`, `curriculumVersions`, `studentEnrollments`,
 * `admissions`) are intentionally never read or serialized here.
 * `ProgramDTO` (program.types.ts) exposes only Program's own fields — a
 * program plus its department or enrollments is a deliberate, separately
 * modeled response, not something this mapper silently grows into.
 */

export function toProgramDTO(program: Program): ProgramDTO {
  return {
    id: program.id,
    name: program.name,
    code: program.code,
    departmentId: program.departmentId,
    durationYears: program.durationYears,
    totalSemesters: program.totalSemesters,
    createdAt: program.createdAt.toISOString(),
    updatedAt: program.updatedAt.toISOString(),
  };
}

export function toProgramDTOList(programs: readonly Program[]): ProgramDTO[] {
  return programs.map(toProgramDTO);
}
