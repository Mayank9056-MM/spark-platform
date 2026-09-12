// apps/api/src/modules/faculty-assignments/facultyAssignment.mapper.ts

import type { FacultyAssignment } from '@spark/database/client';

import type { FacultyAssignmentDTO } from './facultyAssignment.types.js';

/**
 * Maps a Prisma FacultyAssignment entity to the API-safe DTO.
 *
 * This mapper intentionally exposes only the scalar fields defined by
 * FacultyAssignmentDTO — `id`, `subjectOfferingId`, `subjectComponentId`,
 * `facultyUserId`, `createdAt`, `updatedAt` — and does not depend on any
 * loaded relations. It works correctly against a plain
 * `findUnique({ where: { id } })` / `findMany(...)` row with no
 * `include`, since `FacultyAssignment` has no nullable own-fields for the
 * DTO to distinguish: `subjectOffering`, `subjectComponent`, and `faculty`
 * are represented as ids only (`subjectOfferingId`, `subjectComponentId`,
 * `facultyUserId`), never as nested relation objects, matching every
 * sibling mapper's convention. `timetableEntries` and `lectures` are
 * never read or serialized here.
 */
export function toFacultyAssignmentDTO(assignment: FacultyAssignment): FacultyAssignmentDTO {
  return {
    id: assignment.id,
    subjectOfferingId: assignment.subjectOfferingId,
    subjectComponentId: assignment.subjectComponentId,
    facultyUserId: assignment.facultyUserId,
    createdAt: assignment.createdAt.toISOString(),
    updatedAt: assignment.updatedAt.toISOString(),
  };
}

export function toFacultyAssignmentDTOList(
  assignments: readonly FacultyAssignment[],
): FacultyAssignmentDTO[] {
  return assignments.map(toFacultyAssignmentDTO);
}
