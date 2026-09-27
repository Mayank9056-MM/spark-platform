/* eslint-disable @typescript-eslint/unbound-method, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockTx = {};

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    $transaction: vi.fn(async (cb: (tx: any) => Promise<any>) => cb(mockTx)),
  },
}));

vi.mock('../../lib/logger.js', () => ({
  lectureLogger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../audit/audit.service.js', () => ({
  recordAuditTx: vi.fn(),
}));

vi.mock('../timetables/timetable.repository.js', () => ({
  timetableRepository: {
    findByIdTx: vi.fn(),
  },
}));

vi.mock('../faculty-assignments/facultyAssignment.repository.js', () => ({
  facultyAssignmentRepository: {
    findByIdTx: vi.fn(),
  },
}));

vi.mock('../academic-years/academic-year.repository.js', () => ({
  academicYearRepository: {
    findByIdTx: vi.fn(),
  },
}));

vi.mock('./lecture.repository.js', () => ({
  lectureRepository: {
    findById: vi.fn(),
    create: vi.fn(),
    list: vi.fn(),
  },
}));

import { academicYearRepository } from '../academic-years/academic-year.repository.js';
import { recordAuditTx } from '../audit/audit.service.js';
import { AuditEntityType } from '../audit/audit.types.js';
import { facultyAssignmentRepository } from '../faculty-assignments/facultyAssignment.repository.js';
import { timetableRepository } from '../timetables/timetable.repository.js';

import { lectureRepository } from './lecture.repository.js';
import { lectureService } from './lecture.service.js';

describe('LectureService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockTimetable = {
    id: 'tt-1',
    subjectOfferingId: 'offering-1',
    subjectComponentId: 'comp-1',
    facultyAssignmentId: 'fa-1',
    roomId: 'room-1',
    semesterCatalogId: 'sem-cat-1',
    academicYearId: 'ay-1',
    dayOfWeek: 'MONDAY' as const,
    startTime: new Date('1970-01-01T09:00:00.000Z'),
    endTime: new Date('1970-01-01T10:00:00.000Z'),
    effectiveFrom: new Date('2026-08-01T00:00:00.000Z'),
    effectiveTo: new Date('2026-12-31T00:00:00.000Z'),
    isCancelled: false,
  };

  const mockFacultyAssignment = {
    id: 'fa-1',
    subjectOfferingId: 'offering-1',
    subjectComponentId: 'comp-1',
    facultyUserId: 'faculty-user-1',
  };

  const mockAcademicYear = {
    id: 'ay-1',
    startDate: new Date('2026-07-01T00:00:00.000Z'),
    endDate: new Date('2027-06-30T00:00:00.000Z'),
  };

  const mockLectureRow = {
    id: 'lecture-1',
    timetableId: 'tt-1',
    subjectOfferingId: 'offering-1',
    subjectComponentId: 'comp-1',
    facultyAssignmentId: 'fa-1',
    facultyUserId: 'faculty-user-1',
    roomId: 'room-1',
    semesterCatalogId: 'sem-cat-1',
    academicYearId: 'ay-1',
    scheduledDate: new Date('2026-08-03T00:00:00.000Z'), // Monday
    startTime: new Date('1970-01-01T09:00:00.000Z'),
    endTime: new Date('1970-01-01T10:00:00.000Z'),
    status: 'SCHEDULED' as const,
    createdAt: new Date('2026-08-01T00:00:00.000Z'),
    updatedAt: new Date('2026-08-01T00:00:00.000Z'),
  };

  describe('getLectureById', () => {
    it('returns DTO when lecture exists', async () => {
      vi.mocked(lectureRepository.findById).mockResolvedValue(mockLectureRow);

      const result = await lectureService.getLectureById('lecture-1');
      expect(result.id).toBe('lecture-1');
      expect(result.scheduledDate).toBe('2026-08-03');
      expect(result.startTime).toBe('09:00');
      expect(result.endTime).toBe('10:00');
      expect(result.status).toBe('SCHEDULED');
    });

    it('throws RECORD_NOT_FOUND when lecture is not found', async () => {
      vi.mocked(lectureRepository.findById).mockResolvedValue(null);

      await expect(lectureService.getLectureById('nonexistent')).rejects.toThrow(
        'Lecture not found',
      );
    });
  });

  describe('listLectures', () => {
    it('returns paginated lecture list', async () => {
      vi.mocked(lectureRepository.list).mockResolvedValue({
        lectures: [mockLectureRow],
        total: 1,
      });

      const result = await lectureService.listLectures(
        {},
        { page: 1, limit: 10, sortBy: 'scheduledDate', sortOrder: 'asc' },
      );
      expect(result.total).toBe(1);
      expect(result.lectures).toHaveLength(1);
      expect(result.lectures[0]?.id).toBe('lecture-1');
    });
  });

  describe('createLecture', () => {
    // 2026-08-03 is a Monday
    const validScheduledDate = '2026-08-03';

    it('throws RECORD_NOT_FOUND if timetable not found', async () => {
      vi.mocked(timetableRepository.findByIdTx).mockResolvedValue(null);

      await expect(
        lectureService.createLecture('admin-1', {
          timetableId: 'tt-1',
          scheduledDate: validScheduledDate,
        }),
      ).rejects.toThrow('Timetable not found');
    });

    it('throws DUPLICATE_ENTRY if timetable is cancelled', async () => {
      vi.mocked(timetableRepository.findByIdTx).mockResolvedValue({
        ...mockTimetable,
        isCancelled: true,
      } as any);

      await expect(
        lectureService.createLecture('admin-1', {
          timetableId: 'tt-1',
          scheduledDate: validScheduledDate,
        }),
      ).rejects.toThrow('This timetable entry is cancelled and cannot produce lectures');
    });

    it('throws ACADEMIC_HIERARCHY_MISMATCH if scheduledDate is before timetable effectiveFrom', async () => {
      vi.mocked(timetableRepository.findByIdTx).mockResolvedValue({
        ...mockTimetable,
        effectiveFrom: new Date('2026-09-01T00:00:00.000Z'),
      } as any);

      await expect(
        lectureService.createLecture('admin-1', {
          timetableId: 'tt-1',
          scheduledDate: validScheduledDate, // August 3, 2026
        }),
      ).rejects.toThrow('The scheduled date falls before this timetable entry takes effect');
    });

    it('throws ACADEMIC_HIERARCHY_MISMATCH if scheduledDate is after timetable effectiveTo', async () => {
      vi.mocked(timetableRepository.findByIdTx).mockResolvedValue({
        ...mockTimetable,
        effectiveTo: new Date('2026-08-01T00:00:00.000Z'),
      } as any);

      await expect(
        lectureService.createLecture('admin-1', {
          timetableId: 'tt-1',
          scheduledDate: validScheduledDate, // August 3, 2026
        }),
      ).rejects.toThrow('The scheduled date falls after this timetable entry was closed');
    });

    it('throws ACADEMIC_HIERARCHY_MISMATCH if scheduledDate weekday does not match timetable dayOfWeek', async () => {
      vi.mocked(timetableRepository.findByIdTx).mockResolvedValue({
        ...mockTimetable,
        dayOfWeek: 'TUESDAY', // August 3, 2026 is Monday
      } as any);

      await expect(
        lectureService.createLecture('admin-1', {
          timetableId: 'tt-1',
          scheduledDate: validScheduledDate,
        }),
      ).rejects.toThrow('The scheduled date does not fall on this timetable entry’s day of week');
    });

    it('throws ACADEMIC_HIERARCHY_MISMATCH if scheduledDate is Sunday (no DayOfWeek matches)', async () => {
      vi.mocked(timetableRepository.findByIdTx).mockResolvedValue(mockTimetable as any);

      // 2026-08-02 is Sunday
      await expect(
        lectureService.createLecture('admin-1', {
          timetableId: 'tt-1',
          scheduledDate: '2026-08-02',
        }),
      ).rejects.toThrow('The scheduled date does not fall on this timetable entry’s day of week');
    });

    it('throws RECORD_NOT_FOUND if faculty assignment is not found', async () => {
      vi.mocked(timetableRepository.findByIdTx).mockResolvedValue(mockTimetable as any);
      vi.mocked(facultyAssignmentRepository.findByIdTx).mockResolvedValue(null);

      await expect(
        lectureService.createLecture('admin-1', {
          timetableId: 'tt-1',
          scheduledDate: validScheduledDate,
        }),
      ).rejects.toThrow('Faculty assignment not found');
    });

    it('throws ACADEMIC_HIERARCHY_MISMATCH if faculty assignment disagrees with timetable offering/component', async () => {
      vi.mocked(timetableRepository.findByIdTx).mockResolvedValue(mockTimetable as any);
      vi.mocked(facultyAssignmentRepository.findByIdTx).mockResolvedValue({
        ...mockFacultyAssignment,
        subjectOfferingId: 'different-offering',
      } as any);

      await expect(
        lectureService.createLecture('admin-1', {
          timetableId: 'tt-1',
          scheduledDate: validScheduledDate,
        }),
      ).rejects.toThrow('This timetable entry disagrees with its faculty assignment');
    });

    it('throws RECORD_NOT_FOUND if academic year is not found', async () => {
      vi.mocked(timetableRepository.findByIdTx).mockResolvedValue(mockTimetable as any);
      vi.mocked(facultyAssignmentRepository.findByIdTx).mockResolvedValue(
        mockFacultyAssignment as any,
      );
      vi.mocked(academicYearRepository.findByIdTx).mockResolvedValue(null);

      await expect(
        lectureService.createLecture('admin-1', {
          timetableId: 'tt-1',
          scheduledDate: validScheduledDate,
        }),
      ).rejects.toThrow('Academic year not found');
    });

    it('throws ACADEMIC_HIERARCHY_MISMATCH if scheduledDate is outside academic year bounds', async () => {
      vi.mocked(timetableRepository.findByIdTx).mockResolvedValue(mockTimetable as any);
      vi.mocked(facultyAssignmentRepository.findByIdTx).mockResolvedValue(
        mockFacultyAssignment as any,
      );
      vi.mocked(academicYearRepository.findByIdTx).mockResolvedValue({
        ...mockAcademicYear,
        startDate: new Date('2026-09-01T00:00:00.000Z'),
      } as any);

      await expect(
        lectureService.createLecture('admin-1', {
          timetableId: 'tt-1',
          scheduledDate: validScheduledDate, // August 3, 2026
        }),
      ).rejects.toThrow('The scheduled date falls outside this academic year');
    });

    it('successfully creates lecture and records audit when all conditions are satisfied', async () => {
      vi.mocked(timetableRepository.findByIdTx).mockResolvedValue(mockTimetable as any);
      vi.mocked(facultyAssignmentRepository.findByIdTx).mockResolvedValue(
        mockFacultyAssignment as any,
      );
      vi.mocked(academicYearRepository.findByIdTx).mockResolvedValue(mockAcademicYear as any);
      vi.mocked(lectureRepository.create).mockResolvedValue(mockLectureRow);

      const result = await lectureService.createLecture('admin-1', {
        timetableId: 'tt-1',
        scheduledDate: validScheduledDate,
      });

      expect(result.id).toBe('lecture-1');
      expect(result.scheduledDate).toBe('2026-08-03');
      expect(result.facultyUserId).toBe('faculty-user-1');
      expect(lectureRepository.create).toHaveBeenCalledWith(
        mockTx,
        expect.objectContaining({
          timetableId: 'tt-1',
          subjectOfferingId: 'offering-1',
          subjectComponentId: 'comp-1',
          facultyAssignmentId: 'fa-1',
          facultyUserId: 'faculty-user-1',
          roomId: 'room-1',
          semesterCatalogId: 'sem-cat-1',
          academicYearId: 'ay-1',
          scheduledDate: '2026-08-03',
        }),
      );
      expect(recordAuditTx).toHaveBeenCalledWith(
        mockTx,
        expect.objectContaining({
          actorUserId: 'admin-1',
          action: 'CREATE',
          entityType: AuditEntityType.LECTURE,
          entityId: 'lecture-1',
        }),
      );
    });
  });
});
