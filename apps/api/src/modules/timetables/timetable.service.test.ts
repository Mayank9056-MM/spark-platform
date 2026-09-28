/* eslint-disable @typescript-eslint/unbound-method, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockTx = {
  semesterCatalog: {
    findUnique: vi.fn(),
  },
};

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    $transaction: vi.fn(async (cb: (tx: any) => Promise<any>) => cb(mockTx)),
  },
}));

vi.mock('../../lib/logger.js', () => ({
  timetableLogger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../audit/audit.service.js', () => ({
  recordAuditTx: vi.fn(),
}));

vi.mock('../rbac/authorization/authorization.service.js', () => ({
  authorizationService: {
    check: vi.fn(),
  },
}));

vi.mock('../faculty-assignments/facultyAssignment.repository.js', () => ({
  facultyAssignmentRepository: {
    findByIdTx: vi.fn(),
  },
}));

vi.mock('../subject-offerings/subjectOffering.repository.js', () => ({
  subjectOfferingRepository: {
    findByIdTx: vi.fn(),
  },
}));

vi.mock('../academic/subjects/subject.repository.js', () => ({
  subjectRepository: {
    findByIdTx: vi.fn(),
  },
}));

vi.mock('../time-slots/timeSlot.repository.js', () => ({
  timeSlotRepository: {
    findByIdTx: vi.fn(),
  },
}));

vi.mock('../rooms/room.repository.js', () => ({
  roomRepository: {
    findByIdTx: vi.fn(),
  },
}));

vi.mock('./timetable.repository.js', () => ({
  timetableRepository: {
    findById: vi.fn(),
    create: vi.fn(),
    list: vi.fn(),
  },
}));

import { subjectRepository } from '../academic/subjects/subject.repository.js';
import { facultyAssignmentRepository } from '../faculty-assignments/facultyAssignment.repository.js';
import { authorizationService } from '../rbac/authorization/authorization.service.js';
import { roomRepository } from '../rooms/room.repository.js';
import { subjectOfferingRepository } from '../subject-offerings/subjectOffering.repository.js';
import { timeSlotRepository } from '../time-slots/timeSlot.repository.js';

import { timetableRepository } from './timetable.repository.js';
import { timetableService } from './timetable.service.js';

describe('TimetableService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTx.semesterCatalog.findUnique.mockResolvedValue({
      curriculumVersion: {
        program: {
          departmentId: 'dept-1',
        },
      },
    });
    vi.mocked(authorizationService.check).mockResolvedValue({
      decision: { allowed: true },
    } as any);
  });

  const mockAssignment = {
    id: 'assignment-1',
    subjectOfferingId: 'offering-1',
    subjectComponentId: 'component-1',
    facultyUserId: 'faculty-1',
  };

  const mockOffering = {
    id: 'offering-1',
    subjectId: 'subject-1',
    academicYearId: 'ay-1',
  };

  const mockSubject = {
    id: 'subject-1',
    semesterCatalogId: 'sem-cat-1',
  };

  const mockTimeSlot = {
    id: 'timeslot-1',
    dayOfWeek: 'MONDAY' as const,
    startTime: new Date('1970-01-01T09:00:00Z'),
    endTime: new Date('1970-01-01T10:00:00Z'),
  };

  const mockRoom = {
    id: 'room-1',
    number: '101',
  };

  const mockTimetableRow = {
    id: 'timetable-1',
    subjectOfferingId: 'offering-1',
    subjectComponentId: 'component-1',
    facultyAssignmentId: 'assignment-1',
    timeSlotId: 'timeslot-1',
    roomId: 'room-1',
    semesterCatalogId: 'sem-cat-1',
    academicYearId: 'ay-1',
    dayOfWeek: 'MONDAY' as const,
    startTime: new Date('1970-01-01T09:00:00Z'),
    endTime: new Date('1970-01-01T10:00:00Z'),
    effectiveFrom: new Date('2026-08-01T00:00:00Z'),
    effectiveTo: null,
    isCancelled: false,
    createdAt: new Date('2026-08-01T00:00:00Z'),
    updatedAt: new Date('2026-08-01T00:00:00Z'),
  };

  describe('getTimetableById', () => {
    it('returns DTO when timetable exists', async () => {
      vi.mocked(timetableRepository.findById).mockResolvedValue(mockTimetableRow);

      const result = await timetableService.getTimetableById('timetable-1');
      expect(result.id).toBe('timetable-1');
      expect(result.dayOfWeek).toBe('MONDAY');
    });

    it('throws RECORD_NOT_FOUND when timetable does not exist', async () => {
      vi.mocked(timetableRepository.findById).mockResolvedValue(null);

      await expect(timetableService.getTimetableById('nonexistent')).rejects.toThrow(
        'Timetable not found',
      );
    });
  });

  describe('createTimetable', () => {
    const input = {
      facultyAssignmentId: 'assignment-1',
      timeSlotId: 'timeslot-1',
      roomId: 'room-1',
    };

    it('throws RECORD_NOT_FOUND if faculty assignment does not exist', async () => {
      vi.mocked(facultyAssignmentRepository.findByIdTx).mockResolvedValue(null);

      await expect(timetableService.createTimetable('admin-1', input)).rejects.toThrow(
        'Faculty assignment not found',
      );
    });

    it('throws RECORD_NOT_FOUND if subject offering does not exist', async () => {
      vi.mocked(facultyAssignmentRepository.findByIdTx).mockResolvedValue(mockAssignment as any);
      vi.mocked(subjectOfferingRepository.findByIdTx).mockResolvedValue(null);

      await expect(timetableService.createTimetable('admin-1', input)).rejects.toThrow(
        'Subject offering not found',
      );
    });

    it('throws RECORD_NOT_FOUND if subject does not exist', async () => {
      vi.mocked(facultyAssignmentRepository.findByIdTx).mockResolvedValue(mockAssignment as any);
      vi.mocked(subjectOfferingRepository.findByIdTx).mockResolvedValue(mockOffering as any);
      vi.mocked(subjectRepository.findByIdTx).mockResolvedValue(null);

      await expect(timetableService.createTimetable('admin-1', input)).rejects.toThrow(
        'Subject not found',
      );
    });

    it('throws RECORD_NOT_FOUND if time slot does not exist', async () => {
      vi.mocked(facultyAssignmentRepository.findByIdTx).mockResolvedValue(mockAssignment as any);
      vi.mocked(subjectOfferingRepository.findByIdTx).mockResolvedValue(mockOffering as any);
      vi.mocked(subjectRepository.findByIdTx).mockResolvedValue(mockSubject as any);
      vi.mocked(timeSlotRepository.findByIdTx).mockResolvedValue(null);

      await expect(timetableService.createTimetable('admin-1', input)).rejects.toThrow(
        'Time slot not found',
      );
    });

    it('throws RECORD_NOT_FOUND if room does not exist', async () => {
      vi.mocked(facultyAssignmentRepository.findByIdTx).mockResolvedValue(mockAssignment as any);
      vi.mocked(subjectOfferingRepository.findByIdTx).mockResolvedValue(mockOffering as any);
      vi.mocked(subjectRepository.findByIdTx).mockResolvedValue(mockSubject as any);
      vi.mocked(timeSlotRepository.findByIdTx).mockResolvedValue(mockTimeSlot as any);
      vi.mocked(roomRepository.findByIdTx).mockResolvedValue(null);

      await expect(timetableService.createTimetable('admin-1', input)).rejects.toThrow(
        'Room not found',
      );
    });

    it('throws FORBIDDEN_SCOPE if actor lacks department scope', async () => {
      vi.mocked(facultyAssignmentRepository.findByIdTx).mockResolvedValue(mockAssignment as any);
      vi.mocked(subjectOfferingRepository.findByIdTx).mockResolvedValue(mockOffering as any);
      vi.mocked(subjectRepository.findByIdTx).mockResolvedValue(mockSubject as any);
      // College and Dept scope both fail
      vi.mocked(authorizationService.check).mockResolvedValue({
        decision: { allowed: false },
      } as any);

      await expect(timetableService.createTimetable('user-faculty', input)).rejects.toThrow(
        'You cannot schedule timetable entries for subjects outside your department',
      );
    });

    it('allows creation when actor has departmental scope (e.g. HOD)', async () => {
      vi.mocked(facultyAssignmentRepository.findByIdTx).mockResolvedValue(mockAssignment as any);
      vi.mocked(subjectOfferingRepository.findByIdTx).mockResolvedValue(mockOffering as any);
      vi.mocked(subjectRepository.findByIdTx).mockResolvedValue(mockSubject as any);
      vi.mocked(timeSlotRepository.findByIdTx).mockResolvedValue(mockTimeSlot as any);
      vi.mocked(roomRepository.findByIdTx).mockResolvedValue(mockRoom as any);
      // First call (COLLEGE scope) fails, second call (DEPARTMENT scope) succeeds
      vi.mocked(authorizationService.check)
        .mockResolvedValueOnce({ decision: { allowed: false } } as any)
        .mockResolvedValueOnce({ decision: { allowed: true } } as any);
      vi.mocked(timetableRepository.create).mockResolvedValue({
        ...mockTimetableRow,
        effectiveTo: new Date('2026-12-31T00:00:00Z'),
      });

      const result = await timetableService.createTimetable('user-hod', input);
      expect(result.id).toBe('timetable-1');
      expect(result.effectiveTo).toBe('2026-12-31T00:00:00.000Z');
    });

    it('creates timetable successfully when validations pass', async () => {
      vi.mocked(facultyAssignmentRepository.findByIdTx).mockResolvedValue(mockAssignment as any);
      vi.mocked(subjectOfferingRepository.findByIdTx).mockResolvedValue(mockOffering as any);
      vi.mocked(subjectRepository.findByIdTx).mockResolvedValue(mockSubject as any);
      vi.mocked(timeSlotRepository.findByIdTx).mockResolvedValue(mockTimeSlot as any);
      vi.mocked(roomRepository.findByIdTx).mockResolvedValue(mockRoom as any);
      vi.mocked(timetableRepository.create).mockResolvedValue(mockTimetableRow);

      const result = await timetableService.createTimetable('admin-1', input);
      expect(result.id).toBe('timetable-1');
      expect(result.dayOfWeek).toBe('MONDAY');
    });
  });

  describe('listTimetables', () => {
    it('returns paginated timetables', async () => {
      vi.mocked(timetableRepository.list).mockResolvedValue({
        timetables: [mockTimetableRow],
        total: 1,
      });

      const result = await timetableService.listTimetables(
        {},
        { page: 1, limit: 10, sortBy: 'createdAt', sortOrder: 'desc' },
      );
      expect(result.total).toBe(1);
      expect(result.timetables).toHaveLength(1);
    });
  });
});
