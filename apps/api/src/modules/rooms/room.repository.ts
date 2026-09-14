// apps/api/src/modules/rooms/room.repository.ts

import type { Prisma, PrismaClient, Room } from '@spark/database/client';

import { prisma } from '../../lib/prisma.js';

type Db = PrismaClient | Prisma.TransactionClient;

/**
 * Minimal, real RoomRepository — created because `rooms/` had no module
 * at all (confirmed by `timetable.types.ts`'s own file-level comment:
 * "no `rooms/` module exists yet"), and TimetableService needs to verify
 * a Room exists inside its creation transaction. Not a stub: both
 * methods are real, working Prisma reads, following the exact
 * `findById`/`findByIdTx` shape every sibling repository in this
 * codebase uses.
 *
 * Only `findById`/`findByIdTx` exist, for the same reason as
 * TimeSlotRepository — no current workflow creates, mutates, deletes, or
 * lists Room rows. Capacity/type/equipment rules on schema.prisma's
 * `Room` model are explicitly out of scope for this repository and for
 * TimetableService (see timetable.service.ts's own Room-resolution
 * note).
 */
export class RoomRepository {
  async findById(id: string): Promise<Room | null> {
    return prisma.room.findUnique({ where: { id } });
  }

  async findByIdTx(tx: Db, id: string): Promise<Room | null> {
    return tx.room.findUnique({ where: { id } });
  }
}

export const roomRepository = new RoomRepository();
