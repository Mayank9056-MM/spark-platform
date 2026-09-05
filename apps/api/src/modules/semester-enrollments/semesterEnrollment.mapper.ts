// apps/api/src/modules/semester-enrollments/semesterEnrollment.mapper.ts

import type { SemesterEnrollment } from '@spark/database/client';

import type { SemesterEnrollmentDTO } from './semesterEnrollment.types.js';

/**
 * Maps a Prisma SemesterEnrollment entity to the API-safe DTO.
 *
 * This mapper intentionally exposes only the scalar fields defined by
 * SemesterEnrollmentDTO and does not depend on any loaded relations —
 * it works correctly against a plain `findUnique({ where: { id } })`
 * row with no `include`.
 */
export function toSemesterEnrollmentDTO(enrollment: SemesterEnrollment): SemesterEnrollmentDTO {
  return {
    id: enrollment.id,
    studentEnrollmentId: enrollment.studentEnrollmentId,
    semesterCatalogId: enrollment.semesterCatalogId,
    academicYearId: enrollment.academicYearId,
    attemptNumber: enrollment.attemptNumber,
    status: enrollment.status,
    createdAt: enrollment.createdAt.toISOString(),
    updatedAt: enrollment.updatedAt.toISOString(),
  };
}

export function toSemesterEnrollmentDTOList(
  enrollments: readonly SemesterEnrollment[],
): SemesterEnrollmentDTO[] {
  return enrollments.map(toSemesterEnrollmentDTO);
}
