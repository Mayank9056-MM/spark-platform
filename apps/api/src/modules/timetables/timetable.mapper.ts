// apps/api/src/modules/timetables/timetable.mapper.ts

import type { Timetable } from '@spark/database/client';

import type { TimetableDTO } from './timetable.types.js';

/**
 * Maps a persisted Prisma Timetable row to the API-safe TimetableDTO.
 *
 * Exposes only TimetableDTO's own fields and works against a plain
 * `findUnique`/`findMany` row with no `include` — facultyAssignment,
 * timeSlot, room, subjectOffering, semesterCatalog, academicYear, and
 * lectures are all represented as ids only, never as nested relation
 * objects, matching every sibling mapper's convention. dayOfWeek /
 * startTime / endTime are read directly from the persisted,
 * already-denormalized Timetable row — never recalculated from
 * timeSlotId; the service is responsible for establishing those
 * authoritative values before persistence, not this mapper.
 *
 * Point-in-time fields (`effectiveFrom`, `effectiveTo`, `createdAt`,
 * `updatedAt`) are serialized as full ISO 8601 strings via
 * `toISOString()`, matching every sibling mapper; `effectiveTo` is
 * nullable and preserved as `string | null`, never defaulted to a
 * fallback timestamp. `startTime`/`endTime` are `@db.Time` columns —
 * Prisma returns these as epoch-anchored (1970-01-01) Date values — and
 * are extracted as `HH:mm` rather than ISO-serialized, since they
 * represent a time of day, not a point in time; `getUTC*` accessors are
 * used deliberately so the result is independent of the server process's
 * local timezone.
 */

function formatTimeOnly(time: Date): string {
  const hours = time.getUTCHours().toString().padStart(2, '0');
  const minutes = time.getUTCMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function toTimetableDTO(timetable: Timetable): TimetableDTO {
  return {
    id: timetable.id,
    subjectOfferingId: timetable.subjectOfferingId,
    subjectComponentId: timetable.subjectComponentId,
    facultyAssignmentId: timetable.facultyAssignmentId,
    semesterCatalogId: timetable.semesterCatalogId,
    academicYearId: timetable.academicYearId,
    timeSlotId: timetable.timeSlotId,
    roomId: timetable.roomId,
    dayOfWeek: timetable.dayOfWeek,
    startTime: formatTimeOnly(timetable.startTime),
    endTime: formatTimeOnly(timetable.endTime),
    effectiveFrom: timetable.effectiveFrom.toISOString(),
    effectiveTo: timetable.effectiveTo?.toISOString() ?? null,
    isCancelled: timetable.isCancelled,
    createdAt: timetable.createdAt.toISOString(),
    updatedAt: timetable.updatedAt.toISOString(),
  };
}

export function toTimetableDTOList(timetables: readonly Timetable[]): TimetableDTO[] {
  return timetables.map(toTimetableDTO);
}
