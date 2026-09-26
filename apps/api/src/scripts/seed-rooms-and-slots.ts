// apps/api/src/scripts/seed-rooms-and-slots.ts

import type { DayOfWeek, RoomType } from '@spark/database/client';

import { prisma } from '../lib/prisma.js';

const ROOMS: { name: string; type: RoomType; capacity: number }[] = [
  { name: 'LH-101', type: 'LECTURE_HALL', capacity: 60 },
  { name: 'LH-102', type: 'LECTURE_HALL', capacity: 60 },
  { name: 'LH-201', type: 'LECTURE_HALL', capacity: 60 },
  { name: 'Lab-1 (Software)', type: 'LABORATORY', capacity: 30 },
  { name: 'Lab-2 (Hardware)', type: 'LABORATORY', capacity: 30 },
  { name: 'Seminar Hall A', type: 'SEMINAR_HALL', capacity: 120 },
];

const DAYS: DayOfWeek[] = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

const TIME_RANGES = [
  { start: '09:00', end: '10:00' },
  { start: '10:00', end: '11:00' },
  { start: '11:15', end: '12:15' },
  { start: '12:15', end: '13:15' },
  { start: '14:00', end: '15:00' },
  { start: '15:00', end: '16:00' },
];

export async function seedRoomsAndSlots() {
  console.log('Seeding rooms and time slots...');

  // 1. Seed Rooms
  for (const r of ROOMS) {
    await prisma.room.upsert({
      where: { name: r.name },
      create: {
        name: r.name,
        type: r.type,
        capacity: r.capacity,
      },
      update: {
        type: r.type,
        capacity: r.capacity,
      },
    });
  }
  console.log(`Seeded ${ROOMS.length} institutional rooms.`);

  // 2. Seed TimeSlots
  let slotCount = 0;
  for (const day of DAYS) {
    for (const range of TIME_RANGES) {
      const startTime = new Date(`1970-01-01T${range.start}:00.000Z`);
      const endTime = new Date(`1970-01-01T${range.end}:00.000Z`);

      const existing = await prisma.timeSlot.findFirst({
        where: {
          dayOfWeek: day,
          startTime,
          endTime,
        },
      });

      if (!existing) {
        await prisma.timeSlot.create({
          data: {
            dayOfWeek: day,
            startTime,
            endTime,
          },
        });
        slotCount++;
      }
    }
  }
  console.log(`Ensured time slots across Monday-Saturday (added ${slotCount} new slots).`);
}

async function run() {
  try {
    await seedRoomsAndSlots();
    console.log('Academic infrastructure seed completed successfully.');
  } catch (err) {
    console.error('Failed to seed rooms and slots:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (import.meta.url.endsWith(process.argv[1] ?? '')) {
  void run();
}
