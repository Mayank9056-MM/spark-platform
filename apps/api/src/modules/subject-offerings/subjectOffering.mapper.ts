// apps/api/src/modules/subject-offerings/subjectOffering.mapper.ts

import type { SubjectOffering } from '@spark/database/client';

import type { SubjectOfferingDTO } from './subjectOffering.types.js';

/**
 * Maps a Prisma SubjectOffering entity to the API-safe DTO.
 *
 * This mapper intentionally exposes only the scalar fields defined by
 * SubjectOfferingDTO — `id`, `subjectId`, `academicYearId`, `createdAt`,
 * `updatedAt` — and does not depend on any loaded relations. It works
 * correctly against a plain `findUnique({ where: { id } })` /
 * `findMany(...)` row with no `include`, since `SubjectOffering` has no
 * nullable own-fields for the DTO to distinguish: `subject` and
 * `academicYear` are represented as ids only (`subjectId`,
 * `academicYearId`), never as nested `subject`/`academicYear` relation
 * objects, matching every sibling mapper's convention. `facultyAssignments`,
 * `timetableEntries`, `lectures`, `assignments`, and `studyMaterials` are
 * never read or serialized here.
 */
export function toSubjectOfferingDTO(offering: SubjectOffering): SubjectOfferingDTO {
  return {
    id: offering.id,
    subjectId: offering.subjectId,
    academicYearId: offering.academicYearId,
    createdAt: offering.createdAt.toISOString(),
    updatedAt: offering.updatedAt.toISOString(),
  };
}

export function toSubjectOfferingDTOList(
  offerings: readonly SubjectOffering[],
): SubjectOfferingDTO[] {
  return offerings.map(toSubjectOfferingDTO);
}
