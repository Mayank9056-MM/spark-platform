/* eslint-disable @typescript-eslint/unbound-method, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-assignment */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockTx = {};

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    $transaction: vi.fn(async (cb: (tx: any) => Promise<any>) => cb(mockTx)),
  },
}));

vi.mock('@spark/shared/logger', () => ({
  createChildLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

vi.mock('../audit/audit.service.js', () => ({
  recordAuditTx: vi.fn(),
}));

vi.mock('../lectures/lecture.repository.js', () => ({
  lectureRepository: {
    findByIdTx: vi.fn(),
  },
}));

vi.mock('../semester-enrollments/semesterEnrollment.repository.js', () => ({
  semesterEnrollmentRepository: {
    findByIdTx: vi.fn(),
  },
}));

vi.mock('./attendance.repository.js', () => ({
  attendanceSessionRepository: {
    create: vi.fn(),
    findById: vi.fn(),
    findByIdTx: vi.fn(),
    findByLectureIdTx: vi.fn(),
    list: vi.fn(),
    lock: vi.fn(),
  },
  attendanceRecordRepository: {
    bulkCreate: vi.fn(),
    findAllBySessionIdTx: vi.fn(),
    findByIdTx: vi.fn(),
    correct: vi.fn(),
    list: vi.fn(),
  },
}));

import { recordAuditTx } from '../audit/audit.service.js';
import { AuditEntityType } from '../audit/audit.types.js';
import { lectureRepository } from '../lectures/lecture.repository.js';
import { semesterEnrollmentRepository } from '../semester-enrollments/semesterEnrollment.repository.js';

import {
  attendanceRecordRepository,
  attendanceSessionRepository,
} from './attendance.repository.js';
import { attendanceService } from './attendance.service.js';

describe('AttendanceService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const facultyUserId = 'faculty-1';

  const mockLecture = {
    id: 'lecture-1',
    facultyUserId,
    semesterCatalogId: 'sem-cat-1',
    academicYearId: 'ay-1',
    status: 'SCHEDULED' as const,
  };

  const mockSession = {
    id: 'session-1',
    lectureId: 'lecture-1',
    takenByUserId: facultyUserId,
    status: 'OPEN' as const,
    lockedAt: null,
    createdAt: new Date('2026-08-01T09:00:00.000Z'),
    updatedAt: new Date('2026-08-01T09:00:00.000Z'),
  };

  const mockEnrollment = {
    id: 'enrollment-1',
    semesterCatalogId: 'sem-cat-1',
    academicYearId: 'ay-1',
    status: 'IN_PROGRESS' as const,
  };

  const mockRecord = {
    id: 'record-1',
    attendanceSessionId: 'session-1',
    semesterEnrollmentId: 'enrollment-1',
    status: 'PRESENT' as const,
    markedByUserId: facultyUserId,
    correctedAt: null,
    correctionReason: null,
    correctedByUserId: null,
    createdAt: new Date('2026-08-01T09:05:00.000Z'),
    updatedAt: new Date('2026-08-01T09:05:00.000Z'),
  };

  describe('createAttendanceSession', () => {
    it('throws RECORD_NOT_FOUND when lecture does not exist', async () => {
      vi.mocked(lectureRepository.findByIdTx).mockResolvedValue(null);

      await expect(
        attendanceService.createAttendanceSession(facultyUserId, { lectureId: 'lecture-1' }),
      ).rejects.toThrow('Lecture not found');
    });

    it('throws conflict when lecture is cancelled', async () => {
      vi.mocked(lectureRepository.findByIdTx).mockResolvedValue({
        ...mockLecture,
        status: 'CANCELLED',
      } as any);

      await expect(
        attendanceService.createAttendanceSession(facultyUserId, { lectureId: 'lecture-1' }),
      ).rejects.toThrow('Attendance cannot be taken for a cancelled lecture');
    });

    it('throws forbidden when actor is not the faculty assigned to the lecture', async () => {
      vi.mocked(lectureRepository.findByIdTx).mockResolvedValue(mockLecture as any);

      await expect(
        attendanceService.createAttendanceSession('other-faculty', { lectureId: 'lecture-1' }),
      ).rejects.toThrow('You are not the faculty member assigned to this lecture');
    });

    it('throws conflict when session already exists for the lecture', async () => {
      vi.mocked(lectureRepository.findByIdTx).mockResolvedValue(mockLecture as any);
      vi.mocked(attendanceSessionRepository.findByLectureIdTx).mockResolvedValue(mockSession);

      await expect(
        attendanceService.createAttendanceSession(facultyUserId, { lectureId: 'lecture-1' }),
      ).rejects.toThrow('An attendance session already exists for this lecture');
    });

    it('creates attendance session and records audit when valid', async () => {
      vi.mocked(lectureRepository.findByIdTx).mockResolvedValue(mockLecture as any);
      vi.mocked(attendanceSessionRepository.findByLectureIdTx).mockResolvedValue(null);
      vi.mocked(attendanceSessionRepository.create).mockResolvedValue(mockSession);

      const result = await attendanceService.createAttendanceSession(facultyUserId, {
        lectureId: 'lecture-1',
      });

      expect(result.id).toBe('session-1');
      expect(result.status).toBe('OPEN');
      expect(result.lockedAt).toBeNull();
      expect(recordAuditTx).toHaveBeenCalledWith(
        mockTx,
        expect.objectContaining({
          actorUserId: facultyUserId,
          action: 'CREATE',
          entityType: AuditEntityType.ATTENDANCE,
          entityId: 'session-1',
        }),
      );
    });
  });

  describe('getAttendanceSessionById', () => {
    it('returns DTO when session is found', async () => {
      vi.mocked(attendanceSessionRepository.findById).mockResolvedValue(mockSession);

      const result = await attendanceService.getAttendanceSessionById('session-1');
      expect(result.id).toBe('session-1');
      expect(result.lectureId).toBe('lecture-1');
    });

    it('throws RECORD_NOT_FOUND when session is not found', async () => {
      vi.mocked(attendanceSessionRepository.findById).mockResolvedValue(null);

      await expect(attendanceService.getAttendanceSessionById('nonexistent')).rejects.toThrow(
        'Attendance session not found',
      );
    });
  });

  describe('listAttendanceSessions', () => {
    it('returns session list and total', async () => {
      vi.mocked(attendanceSessionRepository.list).mockResolvedValue({
        attendanceSessions: [mockSession],
        total: 1,
      });

      const result = await attendanceService.listAttendanceSessions(
        {},
        { page: 1, limit: 10, sortBy: 'createdAt', sortOrder: 'desc' },
      );
      expect(result.total).toBe(1);
      expect(result.attendanceSessions).toHaveLength(1);
    });
  });

  describe('lockAttendanceSession', () => {
    it('throws RECORD_NOT_FOUND if session not found', async () => {
      vi.mocked(attendanceSessionRepository.findByIdTx).mockResolvedValue(null);

      await expect(
        attendanceService.lockAttendanceSession(facultyUserId, 'session-1'),
      ).rejects.toThrow('Attendance session not found');
    });

    it('throws RECORD_NOT_FOUND if lecture not found', async () => {
      vi.mocked(attendanceSessionRepository.findByIdTx).mockResolvedValue(mockSession);
      vi.mocked(lectureRepository.findByIdTx).mockResolvedValue(null);

      await expect(
        attendanceService.lockAttendanceSession(facultyUserId, 'session-1'),
      ).rejects.toThrow('Lecture not found');
    });

    it('throws forbidden if actor is not the faculty assigned to lecture', async () => {
      vi.mocked(attendanceSessionRepository.findByIdTx).mockResolvedValue(mockSession);
      vi.mocked(lectureRepository.findByIdTx).mockResolvedValue(mockLecture as any);

      await expect(
        attendanceService.lockAttendanceSession('other-user', 'session-1'),
      ).rejects.toThrow('You are not the faculty member assigned to this lecture');
    });

    it('throws conflict if session is already locked', async () => {
      vi.mocked(attendanceSessionRepository.findByIdTx).mockResolvedValue({
        ...mockSession,
        status: 'LOCKED',
      } as any);
      vi.mocked(lectureRepository.findByIdTx).mockResolvedValue(mockLecture as any);

      await expect(
        attendanceService.lockAttendanceSession(facultyUserId, 'session-1'),
      ).rejects.toThrow('This attendance session is already locked');
    });

    it('throws conflict if session was concurrently locked (lock returns null)', async () => {
      vi.mocked(attendanceSessionRepository.findByIdTx).mockResolvedValue(mockSession);
      vi.mocked(lectureRepository.findByIdTx).mockResolvedValue(mockLecture as any);
      vi.mocked(attendanceSessionRepository.lock).mockResolvedValue(null);

      await expect(
        attendanceService.lockAttendanceSession(facultyUserId, 'session-1'),
      ).rejects.toThrow('This attendance session was concurrently locked');
    });

    it('locks session successfully and records audit', async () => {
      vi.mocked(attendanceSessionRepository.findByIdTx).mockResolvedValue(mockSession);
      vi.mocked(lectureRepository.findByIdTx).mockResolvedValue(mockLecture as any);
      const lockedDate = new Date('2026-08-01T10:00:00.000Z');
      vi.mocked(attendanceSessionRepository.lock).mockResolvedValue({
        ...mockSession,
        status: 'LOCKED',
        lockedAt: lockedDate,
      } as any);

      const result = await attendanceService.lockAttendanceSession(facultyUserId, 'session-1');

      expect(result.status).toBe('LOCKED');
      expect(result.lockedAt).toBe(lockedDate.toISOString());
      expect(recordAuditTx).toHaveBeenCalledWith(
        mockTx,
        expect.objectContaining({
          actorUserId: facultyUserId,
          action: 'UPDATE',
          entityType: AuditEntityType.ATTENDANCE,
          entityId: 'session-1',
          oldValue: { status: 'OPEN', lockedAt: null },
        }),
      );
    });
  });

  describe('bulkMarkAttendance', () => {
    it('throws badRequest when input has duplicate semesterEnrollmentIds', async () => {
      await expect(
        attendanceService.bulkMarkAttendance(facultyUserId, {
          attendanceSessionId: 'session-1',
          records: [
            { semesterEnrollmentId: 'enrollment-1', status: 'PRESENT' },
            { semesterEnrollmentId: 'enrollment-1', status: 'ABSENT' },
          ],
        }),
      ).rejects.toThrow(
        'Duplicate semester enrollment enrollment-1 in the same attendance request',
      );
    });

    it('throws RECORD_NOT_FOUND when session not found', async () => {
      vi.mocked(attendanceSessionRepository.findByIdTx).mockResolvedValue(null);

      await expect(
        attendanceService.bulkMarkAttendance(facultyUserId, {
          attendanceSessionId: 'session-1',
          records: [{ semesterEnrollmentId: 'enrollment-1', status: 'PRESENT' }],
        }),
      ).rejects.toThrow('Attendance session not found');
    });

    it('throws conflict when session is not OPEN', async () => {
      vi.mocked(attendanceSessionRepository.findByIdTx).mockResolvedValue({
        ...mockSession,
        status: 'LOCKED',
      } as any);

      await expect(
        attendanceService.bulkMarkAttendance(facultyUserId, {
          attendanceSessionId: 'session-1',
          records: [{ semesterEnrollmentId: 'enrollment-1', status: 'PRESENT' }],
        }),
      ).rejects.toThrow(
        'This attendance session is locked and no longer accepts new attendance records',
      );
    });

    it('throws RECORD_NOT_FOUND when lecture not found', async () => {
      vi.mocked(attendanceSessionRepository.findByIdTx).mockResolvedValue(mockSession);
      vi.mocked(lectureRepository.findByIdTx).mockResolvedValue(null);

      await expect(
        attendanceService.bulkMarkAttendance(facultyUserId, {
          attendanceSessionId: 'session-1',
          records: [{ semesterEnrollmentId: 'enrollment-1', status: 'PRESENT' }],
        }),
      ).rejects.toThrow('Lecture not found');
    });

    it('throws conflict when lecture is cancelled', async () => {
      vi.mocked(attendanceSessionRepository.findByIdTx).mockResolvedValue(mockSession);
      vi.mocked(lectureRepository.findByIdTx).mockResolvedValue({
        ...mockLecture,
        status: 'CANCELLED',
      } as any);

      await expect(
        attendanceService.bulkMarkAttendance(facultyUserId, {
          attendanceSessionId: 'session-1',
          records: [{ semesterEnrollmentId: 'enrollment-1', status: 'PRESENT' }],
        }),
      ).rejects.toThrow('Attendance cannot be taken for a cancelled lecture');
    });

    it('throws forbidden when actor is not the assigned faculty', async () => {
      vi.mocked(attendanceSessionRepository.findByIdTx).mockResolvedValue(mockSession);
      vi.mocked(lectureRepository.findByIdTx).mockResolvedValue(mockLecture as any);

      await expect(
        attendanceService.bulkMarkAttendance('other-faculty', {
          attendanceSessionId: 'session-1',
          records: [{ semesterEnrollmentId: 'enrollment-1', status: 'PRESENT' }],
        }),
      ).rejects.toThrow('You are not the faculty member assigned to this lecture');
    });

    it('throws RECORD_NOT_FOUND when semester enrollment does not exist', async () => {
      vi.mocked(attendanceSessionRepository.findByIdTx).mockResolvedValue(mockSession);
      vi.mocked(lectureRepository.findByIdTx).mockResolvedValue(mockLecture as any);
      vi.mocked(semesterEnrollmentRepository.findByIdTx).mockResolvedValue(null);

      await expect(
        attendanceService.bulkMarkAttendance(facultyUserId, {
          attendanceSessionId: 'session-1',
          records: [{ semesterEnrollmentId: 'enrollment-1', status: 'PRESENT' }],
        }),
      ).rejects.toThrow('Semester enrollment enrollment-1 not found');
    });

    it('throws ACADEMIC_HIERARCHY_MISMATCH when enrollment semester/year context does not match lecture', async () => {
      vi.mocked(attendanceSessionRepository.findByIdTx).mockResolvedValue(mockSession);
      vi.mocked(lectureRepository.findByIdTx).mockResolvedValue(mockLecture as any);
      vi.mocked(semesterEnrollmentRepository.findByIdTx).mockResolvedValue({
        ...mockEnrollment,
        semesterCatalogId: 'different-sem',
      } as any);

      await expect(
        attendanceService.bulkMarkAttendance(facultyUserId, {
          attendanceSessionId: 'session-1',
          records: [{ semesterEnrollmentId: 'enrollment-1', status: 'PRESENT' }],
        }),
      ).rejects.toThrow('does not belong to this lecture’s semester/academic year context');
    });

    it('throws conflict when enrollment status is not IN_PROGRESS', async () => {
      vi.mocked(attendanceSessionRepository.findByIdTx).mockResolvedValue(mockSession);
      vi.mocked(lectureRepository.findByIdTx).mockResolvedValue(mockLecture as any);
      vi.mocked(semesterEnrollmentRepository.findByIdTx).mockResolvedValue({
        ...mockEnrollment,
        status: 'COMPLETED',
      } as any);

      await expect(
        attendanceService.bulkMarkAttendance(facultyUserId, {
          attendanceSessionId: 'session-1',
          records: [{ semesterEnrollmentId: 'enrollment-1', status: 'PRESENT' }],
        }),
      ).rejects.toThrow('is not in progress and cannot receive new attendance records');
    });

    it('successfully bulk marks attendance, audits, and returns marked records', async () => {
      vi.mocked(attendanceSessionRepository.findByIdTx).mockResolvedValue(mockSession);
      vi.mocked(lectureRepository.findByIdTx).mockResolvedValue(mockLecture as any);
      vi.mocked(semesterEnrollmentRepository.findByIdTx).mockResolvedValue(mockEnrollment as any);
      vi.mocked(attendanceRecordRepository.bulkCreate).mockResolvedValue({ count: 1 });
      vi.mocked(attendanceRecordRepository.findAllBySessionIdTx).mockResolvedValue([
        mockRecord,
        { ...mockRecord, id: 'record-old', semesterEnrollmentId: 'other-enr' },
      ]);

      const result = await attendanceService.bulkMarkAttendance(facultyUserId, {
        attendanceSessionId: 'session-1',
        records: [{ semesterEnrollmentId: 'enrollment-1', status: 'PRESENT' }],
      });

      expect(result).toHaveLength(1);
      expect(result[0]?.id).toBe('record-1');
      expect(result[0]?.status).toBe('PRESENT');
      expect(attendanceRecordRepository.bulkCreate).toHaveBeenCalledWith(mockTx, [
        {
          attendanceSessionId: 'session-1',
          semesterEnrollmentId: 'enrollment-1',
          status: 'PRESENT',
          markedByUserId: facultyUserId,
        },
      ]);
      expect(recordAuditTx).toHaveBeenCalledWith(
        mockTx,
        expect.objectContaining({
          actorUserId: facultyUserId,
          action: 'CREATE',
          entityType: AuditEntityType.ATTENDANCE,
          entityId: 'session-1',
          newValue: expect.objectContaining({
            attendanceSessionId: 'session-1',
            recordCount: 1,
            semesterEnrollmentIds: ['enrollment-1'],
          }),
        }),
      );
    });
  });

  describe('correctAttendanceRecord', () => {
    it('throws RECORD_NOT_FOUND when record is not found', async () => {
      vi.mocked(attendanceRecordRepository.findByIdTx).mockResolvedValue(null);

      await expect(
        attendanceService.correctAttendanceRecord(facultyUserId, 'record-1', {
          status: 'ABSENT',
          correctionReason: 'Wrongly marked',
        }),
      ).rejects.toThrow('Attendance record not found');
    });

    it('throws RECORD_NOT_FOUND when session is not found', async () => {
      vi.mocked(attendanceRecordRepository.findByIdTx).mockResolvedValue(mockRecord);
      vi.mocked(attendanceSessionRepository.findByIdTx).mockResolvedValue(null);

      await expect(
        attendanceService.correctAttendanceRecord(facultyUserId, 'record-1', {
          status: 'ABSENT',
          correctionReason: 'Wrongly marked',
        }),
      ).rejects.toThrow('Attendance session not found');
    });

    it('throws RECORD_NOT_FOUND when lecture is not found', async () => {
      vi.mocked(attendanceRecordRepository.findByIdTx).mockResolvedValue(mockRecord);
      vi.mocked(attendanceSessionRepository.findByIdTx).mockResolvedValue(mockSession);
      vi.mocked(lectureRepository.findByIdTx).mockResolvedValue(null);

      await expect(
        attendanceService.correctAttendanceRecord(facultyUserId, 'record-1', {
          status: 'ABSENT',
          correctionReason: 'Wrongly marked',
        }),
      ).rejects.toThrow('Lecture not found');
    });

    it('throws forbidden when actor is not the faculty assigned to lecture', async () => {
      vi.mocked(attendanceRecordRepository.findByIdTx).mockResolvedValue(mockRecord);
      vi.mocked(attendanceSessionRepository.findByIdTx).mockResolvedValue(mockSession);
      vi.mocked(lectureRepository.findByIdTx).mockResolvedValue(mockLecture as any);

      await expect(
        attendanceService.correctAttendanceRecord('other-faculty', 'record-1', {
          status: 'ABSENT',
          correctionReason: 'Wrongly marked',
        }),
      ).rejects.toThrow('You are not the faculty member assigned to this lecture');
    });

    it('successfully corrects record, audits change, and returns corrected DTO', async () => {
      vi.mocked(attendanceRecordRepository.findByIdTx).mockResolvedValue(mockRecord);
      vi.mocked(attendanceSessionRepository.findByIdTx).mockResolvedValue(mockSession);
      vi.mocked(lectureRepository.findByIdTx).mockResolvedValue(mockLecture as any);

      const correctedDate = new Date('2026-08-01T12:00:00.000Z');
      vi.mocked(attendanceRecordRepository.correct).mockResolvedValue({
        ...mockRecord,
        status: 'ABSENT',
        correctedAt: correctedDate,
        correctionReason: 'Correction note',
        correctedByUserId: facultyUserId,
      } as any);

      const result = await attendanceService.correctAttendanceRecord(facultyUserId, 'record-1', {
        status: 'ABSENT',
        correctionReason: 'Correction note',
      });

      expect(result.id).toBe('record-1');
      expect(result.status).toBe('ABSENT');
      expect(result.correctionReason).toBe('Correction note');
      expect(result.correctedByUserId).toBe(facultyUserId);
      expect(result.correctedAt).toBe(correctedDate.toISOString());

      expect(recordAuditTx).toHaveBeenCalledWith(
        mockTx,
        expect.objectContaining({
          actorUserId: facultyUserId,
          action: 'UPDATE',
          entityType: AuditEntityType.ATTENDANCE,
          entityId: 'record-1',
          oldValue: expect.objectContaining({
            status: 'PRESENT',
            correctedAt: null,
            correctionReason: null,
          }),
          newValue: expect.objectContaining({
            status: 'ABSENT',
            correctedAt: correctedDate.toISOString(),
            correctionReason: 'Correction note',
          }),
        }),
      );
    });
  });

  describe('listAttendanceRecords', () => {
    it('returns record list and total', async () => {
      vi.mocked(attendanceRecordRepository.list).mockResolvedValue({
        attendanceRecords: [mockRecord],
        total: 1,
      });

      const result = await attendanceService.listAttendanceRecords(
        {},
        { page: 1, limit: 10, sortBy: 'createdAt', sortOrder: 'asc' },
      );

      expect(result.total).toBe(1);
      expect(result.attendanceRecords).toHaveLength(1);
      expect(result.attendanceRecords[0]?.id).toBe('record-1');
    });
  });
});
