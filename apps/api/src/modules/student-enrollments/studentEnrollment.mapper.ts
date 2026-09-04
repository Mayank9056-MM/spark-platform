// apps/api/src/modules/student-enrollments/studentEnrollment.mapper.ts

import type { StudentEnrollment } from '@spark/database/client';

import type { StudentEnrollmentDTO } from './studentEnrollment.types.js';

export function toStudentEnrollmentDTO(enrollment: StudentEnrollment): StudentEnrollmentDTO {
  return {
    id: enrollment.id,
    admissionId: enrollment.admissionId,
    userId: enrollment.userId,
    programId: enrollment.programId,
    curriculumVersionId: enrollment.curriculumVersionId,
    rollNumber: enrollment.rollNumber,
    admissionDate: enrollment.admissionDate.toISOString(),
    status: enrollment.status,
    statusReason: enrollment.statusReason,
    statusChangedAt: enrollment.statusChangedAt ? enrollment.statusChangedAt.toISOString() : null,
    createdAt: enrollment.createdAt.toISOString(),
    updatedAt: enrollment.updatedAt.toISOString(),
  };
}

export function toStudentEnrollmentDTOList(
  enrollments: readonly StudentEnrollment[],
): StudentEnrollmentDTO[] {
  return enrollments.map(toStudentEnrollmentDTO);
}
