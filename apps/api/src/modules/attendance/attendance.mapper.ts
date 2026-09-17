// apps/api/src/modules/attendance/attendance.mapper.ts

import type { AttendanceRecord, AttendanceSession } from '@spark/database/client';

import type { AttendanceRecordDTO, AttendanceSessionDTO } from './attendance.types.js';

/**
 * Maps persisted Prisma AttendanceSession/AttendanceRecord rows to their
 * API-safe DTOs.
 *
 * Both mappers expose only the fields defined by AttendanceSessionDTO /
 * AttendanceRecordDTO and work against a plain `findUnique`/`findMany`
 * row with no `include` — `lecture`, `takenBy`, `records`,
 * `attendanceSession`, `semesterEnrollment`, `markedBy`, and
 * `correctedBy` are all omitted, matching every sibling mapper's
 * convention of never embedding relations.
 *
 * `lockedAt` (AttendanceSession) and `correctedAt` (AttendanceRecord) are
 * the only nullable `DateTime` columns here; both serialize via
 * `?.toISOString() ?? null`, matching `PromotionBatchDTO.finalizedAt`'s
 * identical nullable-timestamp convention. `correctionReason` and
 * `correctedByUserId` are nullable strings and are passed through
 * unchanged — a `null` triple means "never corrected".
 *
 * No status interpretation, no derived fields (counts, percentages,
 * summaries), and no mutation of the input row.
 */

export function toAttendanceSessionDTO(session: AttendanceSession): AttendanceSessionDTO {
  return {
    id: session.id,
    lectureId: session.lectureId,
    takenByUserId: session.takenByUserId,
    status: session.status,
    lockedAt: session.lockedAt?.toISOString() ?? null,
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
  };
}

export function toAttendanceSessionDTOList(
  sessions: readonly AttendanceSession[],
): AttendanceSessionDTO[] {
  return sessions.map(toAttendanceSessionDTO);
}

export function toAttendanceRecordDTO(record: AttendanceRecord): AttendanceRecordDTO {
  return {
    id: record.id,
    attendanceSessionId: record.attendanceSessionId,
    semesterEnrollmentId: record.semesterEnrollmentId,
    status: record.status,
    markedByUserId: record.markedByUserId,
    correctedAt: record.correctedAt?.toISOString() ?? null,
    correctionReason: record.correctionReason,
    correctedByUserId: record.correctedByUserId,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

export function toAttendanceRecordDTOList(
  records: readonly AttendanceRecord[],
): AttendanceRecordDTO[] {
  return records.map(toAttendanceRecordDTO);
}
