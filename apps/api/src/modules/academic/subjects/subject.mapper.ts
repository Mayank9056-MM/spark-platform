// apps/api/src/modules/academic/subjects/subject.mapper.ts

import type { Subject } from '@spark/database/client';

import type { SubjectDTO } from './subject.types.js';

/**
 * Persistence → DTO boundary for the Subject domain. This must be the
 * ONLY place a Prisma `Subject` row is shaped into `SubjectDTO` — route
 * every Subject-returning endpoint through this file, the same
 * convention department.mapper.ts establishes for `Department` and
 * program.mapper.ts establishes for `Program`.
 *
 * It does not:
 * - query the database
 * - perform authorization
 * - validate uniqueness or existence
 * - write audit records
 * - mutate the input record
 * - enforce isElective/electiveGroupId agreement
 *
 * Deterministic and side-effect free. `code`, `name`, `isElective`, and
 * `electiveGroupId` are exposed exactly as persisted — no casing,
 * trimming, or cross-field derivation; that belongs at the input
 * boundary (subject.validation.ts) or the service layer, not here.
 * `electiveGroupId` stays `null` when persisted as `null` — never
 * coerced to `undefined` or a placeholder.
 *
 * Relations (`semesterCatalog`, `electiveGroup`, `components`,
 * `offerings`, `electiveSelections`) are intentionally never read or
 * serialized here. `SubjectDTO` (subject.types.ts) exposes only
 * Subject's own fields — a subject plus its components or offerings is
 * a deliberate, separately modeled response, not something this mapper
 * silently grows into.
 */

export function toSubjectDTO(subject: Subject): SubjectDTO {
  return {
    id: subject.id,
    semesterCatalogId: subject.semesterCatalogId,
    electiveGroupId: subject.electiveGroupId,
    code: subject.code,
    name: subject.name,
    isElective: subject.isElective,
    createdAt: subject.createdAt.toISOString(),
    updatedAt: subject.updatedAt.toISOString(),
  };
}

export function toSubjectDTOList(subjects: readonly Subject[]): SubjectDTO[] {
  return subjects.map(toSubjectDTO);
}
