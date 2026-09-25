/* eslint-disable @typescript-eslint/unbound-method, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return */
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    $transaction: vi.fn(async (cb: (tx: any) => Promise<any>) => cb({})),
  },
}));

vi.mock('../audit/audit.service.js', () => ({
  recordAuditTx: vi.fn(),
}));

import type { FacultyRepository } from './faculty.repository.js';
import { FacultyService } from './faculty.service.js';

describe('FacultyService', () => {
  const mockRepo = {
    findFacultyRoleAssignment: vi.fn(),
    findUserWithProfile: vi.fn(),
    findDepartmentById: vi.fn(),
    findActiveAcademicYear: vi.fn(),
    findFacultyAssignments: vi.fn(),
    findFacultyTimetable: vi.fn(),
    findFacultyLectures: vi.fn(),
    findLectureById: vi.fn(),
    findEligibleStudentsForLecture: vi.fn(),
    findAttendanceSessionByLectureIdTx: vi.fn(),
    createAttendanceSessionTx: vi.fn(),
    upsertAttendanceRecordTx: vi.fn(),
    lockAttendanceSessionTx: vi.fn(),
  } as unknown as FacultyRepository;

  const service = new FacultyService(mockRepo);

  describe('getProfile', () => {
    it('throws forbidden error when user has no active faculty role', async () => {
      vi.mocked(mockRepo.findFacultyRoleAssignment).mockResolvedValue(null);

      await expect(service.getProfile('user-123')).rejects.toThrow(
        'Access restricted: Your account does not have an active faculty assignment.',
      );
    });

    it('returns faculty profile with workload when authorized', async () => {
      vi.mocked(mockRepo.findFacultyRoleAssignment).mockResolvedValue({
        id: 'ra-1',
        userId: 'faculty-1',
        roleId: 'role-1',
        scopeType: 'DEPARTMENT',
        scopeId: 'dept-1',
        validFrom: new Date(),
        validUntil: null,
        grantedByUserId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        role: {
          id: 'role-1',
          key: 'faculty',
          displayName: 'Faculty',
          isSystemDefined: true,
          deletedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      } as any);

      vi.mocked(mockRepo.findUserWithProfile).mockResolvedValue({
        id: 'faculty-1',
        email: 'prof.smith@hvpm.edu',
        firstName: 'John',
        middleName: 'R',
        lastName: 'Smith',
        avatarUrl: null,
        status: 'ACTIVE',
      });

      vi.mocked(mockRepo.findDepartmentById).mockResolvedValue({
        id: 'dept-1',
        name: 'Information Technology',
        code: 'IT',
      });

      vi.mocked(mockRepo.findActiveAcademicYear).mockResolvedValue({
        id: 'ay-1',
        label: '2026-2027',
        startDate: new Date('2026-07-01'),
        endDate: new Date('2027-06-30'),
      });

      vi.mocked(mockRepo.findFacultyAssignments).mockResolvedValue([
        {
          id: 'fa-1',
          subjectOffering: {
            subject: { id: 'subj-1', code: 'IT301', name: 'Web Engineering' },
          },
          subjectComponent: { hoursPerWeek: 4 },
        },
      ] as any);

      vi.mocked(mockRepo.findFacultyLectures).mockResolvedValue([]);

      const profile = await service.getProfile('faculty-1');

      expect(profile.user.email).toBe('prof.smith@hvpm.edu');
      expect(profile.department?.code).toBe('IT');
      expect(profile.role.key).toBe('faculty');
      expect(profile.workload.assignedSubjectsCount).toBe(1);
      expect(profile.workload.totalWeeklyHours).toBe(4);
    });
  });

  describe('IDOR & Security Protection', () => {
    it('throws forbidden error when requesting roster for a lecture assigned to another faculty member', async () => {
      vi.mocked(mockRepo.findFacultyRoleAssignment).mockResolvedValue({
        role: { key: 'faculty', displayName: 'Faculty' },
      } as any);

      vi.mocked(mockRepo.findLectureById).mockResolvedValue({
        id: 'lec-1',
        facultyUserId: 'faculty-other', // Belongs to different faculty!
      } as any);

      await expect(service.getLectureRoster('faculty-1', 'lec-1')).rejects.toThrow(
        'Access denied: You are not the assigned faculty member for this lecture.',
      );
    });

    it('throws forbidden error when submitting attendance for a lecture assigned to another faculty member', async () => {
      vi.mocked(mockRepo.findFacultyRoleAssignment).mockResolvedValue({
        role: { key: 'faculty', displayName: 'Faculty' },
      } as any);

      vi.mocked(mockRepo.findLectureById).mockResolvedValue({
        id: 'lec-1',
        facultyUserId: 'faculty-other', // Belongs to different faculty!
        status: 'SCHEDULED',
      } as any);

      await expect(
        service.submitAttendance('faculty-1', 'lec-1', {
          records: [{ semesterEnrollmentId: 'se-1', status: 'PRESENT' }],
        }),
      ).rejects.toThrow('Access denied: You are not the assigned faculty member for this lecture.');
    });

    it('rejects attendance submission for a cancelled lecture', async () => {
      vi.mocked(mockRepo.findFacultyRoleAssignment).mockResolvedValue({
        role: { key: 'faculty', displayName: 'Faculty' },
      } as any);

      vi.mocked(mockRepo.findLectureById).mockResolvedValue({
        id: 'lec-1',
        facultyUserId: 'faculty-1',
        status: 'CANCELLED',
      } as any);

      await expect(
        service.submitAttendance('faculty-1', 'lec-1', {
          records: [{ semesterEnrollmentId: 'se-1', status: 'PRESENT' }],
        }),
      ).rejects.toThrow('Cannot mark attendance for a cancelled lecture');
    });

    it('rejects attendance submission for student not in eligible enrollments', async () => {
      vi.mocked(mockRepo.findFacultyRoleAssignment).mockResolvedValue({
        role: { key: 'faculty', displayName: 'Faculty' },
      } as any);

      vi.mocked(mockRepo.findLectureById).mockResolvedValue({
        id: 'lec-1',
        facultyUserId: 'faculty-1',
        status: 'SCHEDULED',
        semesterCatalogId: 'sem-1',
        academicYearId: 'ay-1',
      } as any);

      vi.mocked(mockRepo.findEligibleStudentsForLecture).mockResolvedValue([
        { id: 'se-valid-1' },
      ] as any);

      await expect(
        service.submitAttendance('faculty-1', 'lec-1', {
          records: [{ semesterEnrollmentId: 'se-attacker-injected', status: 'PRESENT' }],
        }),
      ).rejects.toThrow('is not eligible for this lecture');
    });
  });

  describe('Queries & Mappings', () => {
    it('returns faculty assignments correctly mapped', async () => {
      vi.mocked(mockRepo.findFacultyRoleAssignment).mockResolvedValue({
        role: { key: 'faculty', displayName: 'Faculty' },
      } as any);

      vi.mocked(mockRepo.findFacultyAssignments).mockResolvedValue([
        {
          id: 'fa-1',
          subjectOfferingId: 'so-1',
          subjectComponentId: 'sc-1',
          subjectOffering: {
            subject: {
              id: 'subj-1',
              code: 'CS101',
              name: 'Intro to CS',
              isElective: false,
              semesterCatalog: {
                id: 'scat-1',
                number: 1,
                curriculumVersion: {
                  program: {
                    id: 'prog-1',
                    name: 'B.Tech IT',
                    code: 'IT',
                    department: { id: 'dept-1', name: 'Information Tech', code: 'IT' },
                  },
                },
              },
            },
            academicYear: { id: 'ay-1', label: '2026-2027' },
          },
          subjectComponent: {
            id: 'sc-1',
            type: 'THEORY',
            credits: 3,
            hoursPerWeek: 3,
          },
          timetableEntries: [{ id: 'tt-1' }],
          _count: { lectures: 5 },
        },
      ] as any);

      const res = await service.getAssignments('faculty-1');
      expect(res).toHaveLength(1);
      expect(res[0]?.subject.code).toBe('CS101');
      expect(res[0]?.weeklySlotsCount).toBe(1);
      expect(res[0]?.totalLecturesCount).toBe(5);
    });

    it('returns faculty timetable correctly mapped and formatted', async () => {
      vi.mocked(mockRepo.findFacultyRoleAssignment).mockResolvedValue({
        role: { key: 'faculty', displayName: 'Faculty' },
      } as any);

      const startTime = new Date('2026-01-01T09:30:00Z');
      const endTime = new Date('2026-01-01T10:30:00Z');

      vi.mocked(mockRepo.findFacultyTimetable).mockResolvedValue([
        {
          id: 'tt-1',
          dayOfWeek: 'MONDAY',
          startTime,
          endTime,
          room: { id: 'room-1', name: 'Lab 101', type: 'LABORATORY', capacity: 30 },
          subjectOffering: {
            subject: { id: 's-1', code: 'CS101', name: 'Intro to CS' },
          },
          subjectComponent: { id: 'sc-1', type: 'PRACTICAL' },
          semesterCatalog: { id: 'scat-1', number: 1 },
          academicYear: { id: 'ay-1', label: '2026-2027' },
          facultyAssignmentId: 'fa-1',
        },
      ] as any);

      const res = await service.getTimetable('faculty-1');
      expect(res).toHaveLength(1);
      expect(res[0]?.startTime).toBe('09:30');
      expect(res[0]?.endTime).toBe('10:30');
      expect(res[0]?.room.name).toBe('Lab 101');
    });

    it('returns lecture roster with metrics and student statuses', async () => {
      vi.mocked(mockRepo.findFacultyRoleAssignment).mockResolvedValue({
        role: { key: 'faculty', displayName: 'Faculty' },
      } as any);

      vi.mocked(mockRepo.findLectureById).mockResolvedValue({
        id: 'lec-1',
        facultyUserId: 'faculty-1',
        scheduledDate: new Date('2026-09-26T00:00:00Z'),
        startTime: new Date('2026-09-26T10:00:00Z'),
        endTime: new Date('2026-09-26T11:00:00Z'),
        status: 'SCHEDULED',
        subjectOffering: {
          subject: { id: 's-1', code: 'CS101', name: 'Intro to CS' },
        },
        subjectComponent: { id: 'sc-1', type: 'THEORY' },
        room: { id: 'r-1', name: 'Room 201', type: 'LECTURE_HALL' },
        semesterCatalog: { id: 'cat-1', number: 1 },
        academicYear: { id: 'ay-1', label: '2026-2027' },
        facultyAssignmentId: 'fa-1',
        attendanceSession: {
          id: 'as-1',
          status: 'OPEN',
          takenByUserId: 'faculty-1',
          lockedAt: null,
          records: [
            { id: 'ar-1', semesterEnrollmentId: 'se-1', status: 'PRESENT' },
            { id: 'ar-2', semesterEnrollmentId: 'se-2', status: 'ABSENT' },
          ],
        },
      } as any);

      vi.mocked(mockRepo.findEligibleStudentsForLecture).mockResolvedValue([
        {
          id: 'se-1',
          studentEnrollment: {
            id: 'ste-1',
            rollNumber: 'IT001',
            user: { firstName: 'Alice', lastName: 'A', email: 'alice@hvpm.edu', avatarUrl: null },
          },
        },
        {
          id: 'se-2',
          studentEnrollment: {
            id: 'ste-2',
            rollNumber: 'IT002',
            user: { firstName: 'Bob', lastName: 'B', email: 'bob@hvpm.edu', avatarUrl: null },
          },
        },
      ] as any);

      const roster = await service.getLectureRoster('faculty-1', 'lec-1');
      expect(roster.students).toHaveLength(2);
      expect(roster.metrics.totalEnrolled).toBe(2);
      expect(roster.metrics.presentCount).toBe(1);
      expect(roster.metrics.absentCount).toBe(1);
      expect(roster.metrics.markedCount).toBe(2);
    });

    it('calculates attendance summary correctly', async () => {
      vi.mocked(mockRepo.findFacultyRoleAssignment).mockResolvedValue({
        role: { key: 'faculty', displayName: 'Faculty' },
      } as any);

      vi.mocked(mockRepo.findFacultyLectures).mockResolvedValue([
        {
          id: 'lec-1',
          status: 'COMPLETED',
          subjectOffering: {
            subject: { id: 's-1', code: 'CS101', name: 'Intro to CS' },
          },
          attendanceSession: {
            status: 'LOCKED',
            records: [{ status: 'PRESENT' }, { status: 'PRESENT' }, { status: 'ABSENT' }],
          },
        },
      ] as any);

      const summary = await service.getAttendanceSummary('faculty-1');
      expect(summary.totalLectures).toBe(1);
      expect(summary.completedLectures).toBe(1);
      expect(summary.sessionsRecorded).toBe(1);
      expect(summary.sessionsLocked).toBe(1);
      expect(summary.overallAttendancePercentage).toBe(66.7);
    });

    it('returns faculty lectures mapped correctly with filters', async () => {
      vi.mocked(mockRepo.findFacultyRoleAssignment).mockResolvedValue({
        role: { key: 'faculty', displayName: 'Faculty' },
      } as any);

      vi.mocked(mockRepo.findFacultyLectures).mockResolvedValue([
        {
          id: 'lec-1',
          scheduledDate: new Date('2026-09-26T00:00:00Z'),
          startTime: new Date('2026-09-26T10:00:00Z'),
          endTime: new Date('2026-09-26T11:00:00Z'),
          status: 'SCHEDULED',
          subjectOffering: {
            subject: { id: 's-1', code: 'CS101', name: 'Intro to CS' },
          },
          subjectComponent: { id: 'sc-1', type: 'THEORY' },
          room: { id: 'r-1', name: 'Room 201', type: 'LECTURE_HALL' },
          semesterCatalog: { id: 'cat-1', number: 1 },
          academicYear: { id: 'ay-1', label: '2026-2027' },
          facultyAssignmentId: 'fa-1',
          attendanceSession: null,
        },
      ] as any);

      const lectures = await service.getLectures('faculty-1', { date: '2026-09-26' });
      expect(lectures).toHaveLength(1);
      expect(lectures[0]?.scheduledDate).toBe('2026-09-26');
      expect(lectures[0]?.status).toBe('SCHEDULED');
      expect(lectures[0]?.attendanceSession).toBeNull();
    });

    it('throws 404 if user profile is missing', async () => {
      vi.mocked(mockRepo.findFacultyRoleAssignment).mockResolvedValue({
        role: { key: 'faculty', displayName: 'Faculty' },
        scopeType: 'COLLEGE',
      } as any);
      vi.mocked(mockRepo.findUserWithProfile).mockResolvedValue(null);

      await expect(service.getProfile('faculty-missing')).rejects.toThrow('User record not found');
    });

    it('submits attendance successfully and creates session with optional lock', async () => {
      vi.mocked(mockRepo.findFacultyRoleAssignment).mockResolvedValue({
        role: { key: 'faculty', displayName: 'Faculty' },
      } as any);

      vi.mocked(mockRepo.findLectureById).mockResolvedValue({
        id: 'lec-1',
        facultyUserId: 'faculty-1',
        status: 'SCHEDULED',
        scheduledDate: new Date('2026-09-26T00:00:00Z'),
        startTime: new Date('2026-09-26T10:00:00Z'),
        endTime: new Date('2026-09-26T11:00:00Z'),
        semesterCatalogId: 'sem-1',
        academicYearId: 'ay-1',
        subjectOffering: {
          subject: { id: 's-1', code: 'CS101', name: 'Intro to CS' },
        },
        subjectComponent: { id: 'sc-1', type: 'THEORY' },
        room: { id: 'r-1', name: 'Room 201', type: 'LECTURE_HALL' },
        semesterCatalog: { id: 'cat-1', number: 1 },
        academicYear: { id: 'ay-1', label: '2026-2027' },
        facultyAssignmentId: 'fa-1',
        attendanceSession: {
          id: 'as-1',
          status: 'LOCKED',
          takenByUserId: 'faculty-1',
          lockedAt: new Date().toISOString(),
          records: [{ id: 'rec-1', semesterEnrollmentId: 'se-1', status: 'PRESENT' }],
        },
      } as any);

      vi.mocked(mockRepo.findEligibleStudentsForLecture).mockResolvedValue([
        {
          id: 'se-1',
          studentEnrollment: {
            id: 'ste-1',
            rollNumber: 'IT001',
            user: { firstName: 'Alice', lastName: 'A', email: 'alice@hvpm.edu', avatarUrl: null },
          },
        },
      ] as any);

      vi.mocked(mockRepo.findAttendanceSessionByLectureIdTx).mockResolvedValue(null);
      vi.mocked(mockRepo.createAttendanceSessionTx).mockResolvedValue({ id: 'as-1' } as any);
      vi.mocked(mockRepo.upsertAttendanceRecordTx).mockResolvedValue({} as any);
      vi.mocked(mockRepo.lockAttendanceSessionTx).mockResolvedValue({} as any);

      const result = await service.submitAttendance('faculty-1', 'lec-1', {
        records: [{ semesterEnrollmentId: 'se-1', status: 'PRESENT' }],
        lockSession: true,
      });

      expect(result.metrics.presentCount).toBe(1);
      expect(mockRepo.createAttendanceSessionTx).toHaveBeenCalled();
      expect(mockRepo.upsertAttendanceRecordTx).toHaveBeenCalled();
      expect(mockRepo.lockAttendanceSessionTx).toHaveBeenCalled();
    });

    it('throws conflict error if session is already locked when attempting submission', async () => {
      vi.mocked(mockRepo.findFacultyRoleAssignment).mockResolvedValue({
        role: { key: 'faculty', displayName: 'Faculty' },
      } as any);

      vi.mocked(mockRepo.findLectureById).mockResolvedValue({
        id: 'lec-1',
        facultyUserId: 'faculty-1',
        status: 'SCHEDULED',
        semesterCatalogId: 'sem-1',
        academicYearId: 'ay-1',
      } as any);

      vi.mocked(mockRepo.findEligibleStudentsForLecture).mockResolvedValue([{ id: 'se-1' }] as any);

      vi.mocked(mockRepo.findAttendanceSessionByLectureIdTx).mockResolvedValue({
        id: 'as-1',
        status: 'LOCKED',
      } as any);

      await expect(
        service.submitAttendance('faculty-1', 'lec-1', {
          records: [{ semesterEnrollmentId: 'se-1', status: 'PRESENT' }],
        }),
      ).rejects.toThrow('This attendance session is locked and cannot be modified');
    });
  });
});
