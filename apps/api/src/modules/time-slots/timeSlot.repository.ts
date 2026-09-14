// apps/api/src/modules/time-slots/timeSlot.repository.ts

import type { Prisma, PrismaClient, TimeSlot } from '@spark/database/client';

import { prisma } from '../../lib/prisma.js';

type Db = PrismaClient | Prisma.TransactionClient;

/**
 * Minimal, real TimeSlotRepository — created because `time-slots/` had no
 * module at all (confirmed by `timetable.types.ts`'s own file-level
 * comment: "no `time-slots/` module exists yet"), and TimetableService
 * needs to read a TimeSlot's `dayOfWeek`/`startTime`/`endTime` inside its
 * creation transaction. This is NOT a stub: both methods are real,
 * working Prisma reads, following the exact `findById`/`findByIdTx` shape
 * every sibling repository in this codebase uses (see
 * FacultyAssignmentRepository / SubjectOfferingRepository).
 *
 * Only `findById`/`findByIdTx` exist. No `create`/`update`/`delete`/
 * `list` — nothing in the current architecture creates, mutates,
 * deletes, or lists TimeSlot rows yet; adding those now would be
 * speculative CRUD with no caller, exactly what this codebase's
 * repositories consistently avoid. Add them when a real
 * TimeSlot-authoring workflow exists.
 */
export class TimeSlotRepository {
  async findById(id: string): Promise<TimeSlot | null> {
    return prisma.timeSlot.findUnique({ where: { id } });
  }

  async findByIdTx(tx: Db, id: string): Promise<TimeSlot | null> {
    return tx.timeSlot.findUnique({ where: { id } });
  }
}

export const timeSlotRepository = new TimeSlotRepository();
