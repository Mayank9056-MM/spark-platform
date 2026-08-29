// apps/api/src/modules/academic/departments/department.mapper.ts

import type { Department } from '@spark/database/client';

import type { DepartmentDTO } from './department.types.js';

/**
 * Persistence → DTO boundary for the Department domain. This must be the
 * ONLY place a Prisma `Department` row is shaped into `DepartmentDTO` —
 * route every Department-returning endpoint through this file, the same
 * convention role.mapper.ts establishes for `Role` and
 * role-assignment.mapper.ts establishes for `RoleAssignment`.
 *
 * It does not:
 * - query the database
 * - perform authorization
 * - validate uniqueness or existence
 * - write audit records
 * - mutate the input record
 *
 * Deterministic and side-effect free. `code` is exposed exactly as
 * persisted — no case conversion, trimming, or other normalization; that
 * belongs at the input boundary (department.validation.ts), not here.
 *
 * Relations (`programs`) are intentionally never read or serialized here.
 * `DepartmentDTO` (department.types.ts) exposes only Department's own
 * fields — a department + its programs is a deliberate, separately
 * modeled response, not something this mapper silently grows into.
 */

export function toDepartmentDTO(department: Department): DepartmentDTO {
  return {
    id: department.id,
    name: department.name,
    code: department.code,
    createdAt: department.createdAt.toISOString(),
    updatedAt: department.updatedAt.toISOString(),
  };
}

export function toDepartmentDTOList(departments: readonly Department[]): DepartmentDTO[] {
  return departments.map(toDepartmentDTO);
}
