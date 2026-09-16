// apps/api/src/modules/lectures/lecture.mapper.ts

import type { Lecture } from '@spark/database/client';

import type { LectureDTO } from './lecture.types.js';

/**
 * Maps a persisted Prisma Lecture row to the API-safe LectureDTO.
 *
 * Exposes only LectureDTO's own fields and works against a plain
 * `findUnique`/`findMany` row with no `include` — timetable,
 * subjectOffering, subjectComponent, facultyAssignment, facultyUser,
 * room, semesterCatalog, academicYear, and attendanceSession are all
 * represented as ids or omitted entirely, never as nested relation
 * objects, matching every sibling mapper's convention. No attendance
 * state is read, counted, or derived here.
 *
 * `status` is the persisted LectureStatus, passed through unchanged —
 * lifecycle transitions (cancel/complete) belong to the service layer,
 * and nothing about the current date or time is consulted here.
 * `timetableId` is nullable (`String?`) and null is preserved exactly: a
 * null means an ad-hoc session with no recurring pattern behind it, which
 * is real domain state, not a missing value to fill in.
 *
 * Each temporal field is serialized according to its semantic type, since
 * this model carries all three kinds:
 *
 * - `scheduledDate` is `@db.Date` — a calendar day, not an instant — and
 *   is rendered `YYYY-MM-DD`. `toISOString()` is deliberately NOT used:
 *   it would emit `2026-09-22T00:00:00.000Z`, which silently acquires a
 *   timezone and shifts across the date boundary for consumers east or
 *   west of UTC. This is the schema's first `@db.Date` column, so there
 *   is no sibling mapper to copy; Prisma returns such a column as a Date
 *   anchored at UTC midnight, so the calendar parts are read with `getUTC*`
 *   accessors — the same epoch-anchored reasoning `formatTimeOnly` below
 *   relies on, and independent of the server process's local timezone.
 * - `startTime`/`endTime` are `@db.Time` and are rendered `HH:mm`, using
 *   the same UTC-accessor helper `timetable.mapper.ts` already applies to
 *   Timetable's identically-typed columns. Neither value is compared,
 *   adjusted, or used to compute a duration.
 * - `createdAt`/`updatedAt` are plain `DateTime` — genuine instants — and
 *   are serialized as full ISO 8601 strings via `toISOString()`, matching
 *   every sibling mapper.
 *
 * Deterministic and side-effect free: no database access, no relation
 * loading, no validation, no authorization, and no mutation of the input
 * row. A new object is always returned.
 */

/**
 * Renders a `@db.Date` value as `YYYY-MM-DD`. UTC accessors deliberately,
 * for the reason given in the file comment above. `getUTCMonth()` is
 * zero-based, hence the +1.
 */
function formatCalendarDate(date: Date): string {
  const year = date.getUTCFullYear().toString().padStart(4, '0');
  const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
  const day = date.getUTCDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Renders a `@db.Time` value as `HH:mm` — identical to
 * `timetable.mapper.ts`'s helper of the same name, for the identically
 * typed `startTime`/`endTime` columns.
 */
function formatTimeOnly(time: Date): string {
  const hours = time.getUTCHours().toString().padStart(2, '0');
  const minutes = time.getUTCMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function toLectureDTO(lecture: Lecture): LectureDTO {
  return {
    id: lecture.id,
    timetableId: lecture.timetableId,
    subjectOfferingId: lecture.subjectOfferingId,
    subjectComponentId: lecture.subjectComponentId,
    facultyAssignmentId: lecture.facultyAssignmentId,
    facultyUserId: lecture.facultyUserId,
    semesterCatalogId: lecture.semesterCatalogId,
    academicYearId: lecture.academicYearId,
    roomId: lecture.roomId,
    scheduledDate: formatCalendarDate(lecture.scheduledDate),
    startTime: formatTimeOnly(lecture.startTime),
    endTime: formatTimeOnly(lecture.endTime),
    status: lecture.status,
    createdAt: lecture.createdAt.toISOString(),
    updatedAt: lecture.updatedAt.toISOString(),
  };
}

export function toLectureDTOList(lectures: readonly Lecture[]): LectureDTO[] {
  return lectures.map(toLectureDTO);
}
