// apps/api/src/modules/faculty/faculty.service.ts

import type { AttendanceStatus, Prisma } from '@spark/database/client';

import { ApiError } from '../../common/errors/ApiError.js';
import { ErrorCode } from '../../common/errors/ErrorCodes.js';
import { prisma } from '../../lib/prisma.js';
import { recordAuditTx } from '../audit/audit.service.js';
import { AuditEntityType } from '../audit/audit.types.js';

import { facultyRepository, type FacultyRepository } from './faculty.repository.js';
import type {
  FacultyAssignmentDTO,
  FacultyAttendanceSessionSummaryDTO,
  FacultyAttendanceSummaryDTO,
  FacultyLectureDTO,
  FacultyLectureRosterDTO,
  FacultyProfileDTO,
  FacultyRosterStudentDTO,
  FacultyTimetableEntryDTO,
  ListFacultyLecturesFilters,
  SubmitAttendanceInput,
} from './faculty.types.js';

function formatTime(date: Date): string {
  const hours = date.getUTCHours().toString().padStart(2, '0');
  const minutes = date.getUTCMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]!;
}

export class FacultyService {
  constructor(private readonly repo: FacultyRepository = facultyRepository) {}

  private async getFacultyRoleAssignmentOrThrow(userId: string) {
    const roleAssignment = await this.repo.findFacultyRoleAssignment(userId);
    if (!roleAssignment) {
      throw ApiError.forbidden(
        'Access restricted: Your account does not have an active faculty assignment.',
        ErrorCode.INSUFFICIENT_ROLE,
      );
    }
    return roleAssignment;
  }

  async getProfile(userId: string): Promise<FacultyProfileDTO> {
    const roleAssignment = await this.getFacultyRoleAssignmentOrThrow(userId);
    const user = await this.repo.findUserWithProfile(userId);
    if (!user) {
      throw ApiError.notFound('User record not found', ErrorCode.RECORD_NOT_FOUND);
    }

    let department: { id: string; name: string; code: string } | null = null;
    if (roleAssignment.scopeType === 'DEPARTMENT' && roleAssignment.scopeId) {
      department = await this.repo.findDepartmentById(roleAssignment.scopeId);
    }

    const activeAcademicYear = await this.repo.findActiveAcademicYear();
    const assignments = await this.repo.findFacultyAssignments(userId);
    const lectures = await this.repo.findFacultyLectures(userId);

    const todayStr = formatDate(new Date());
    let todayLecturesCount = 0;
    let upcomingLecturesCount = 0;
    let completedLecturesCount = 0;

    for (const l of lectures) {
      const lectureDateStr = formatDate(l.scheduledDate);
      if (lectureDateStr === todayStr) {
        todayLecturesCount += 1;
      }
      if (l.status === 'SCHEDULED' && lectureDateStr >= todayStr) {
        upcomingLecturesCount += 1;
      }
      if (l.status === 'COMPLETED') {
        completedLecturesCount += 1;
      }
    }

    const uniqueSubjectIds = new Set(assignments.map((a) => a.subjectOffering.subject.id));
    const totalWeeklyHours = assignments.reduce(
      (sum, a) => sum + a.subjectComponent.hoursPerWeek,
      0,
    );

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        middleName: user.middleName,
        lastName: user.lastName,
        avatarUrl: user.avatarUrl,
        status: user.status,
      },
      department,
      role: {
        key: roleAssignment.role.key,
        displayName: roleAssignment.role.displayName,
      },
      activeAcademicYear: activeAcademicYear
        ? {
            id: activeAcademicYear.id,
            label: activeAcademicYear.label,
            startDate: activeAcademicYear.startDate.toISOString(),
            endDate: activeAcademicYear.endDate.toISOString(),
          }
        : null,
      workload: {
        assignedSubjectsCount: uniqueSubjectIds.size,
        totalWeeklyHours,
        todayLecturesCount,
        upcomingLecturesCount,
        completedLecturesCount,
      },
    };
  }

  async getAssignments(userId: string): Promise<FacultyAssignmentDTO[]> {
    await this.getFacultyRoleAssignmentOrThrow(userId);
    const assignments = await this.repo.findFacultyAssignments(userId);

    return assignments.map((a) => {
      const subject = a.subjectOffering.subject;
      const catalog = subject.semesterCatalog;
      const curriculum = catalog.curriculumVersion;
      const program = curriculum.program;
      const department = program.department;

      return {
        id: a.id,
        subjectOfferingId: a.subjectOfferingId,
        subjectComponentId: a.subjectComponentId,
        subject: {
          id: subject.id,
          code: subject.code,
          name: subject.name,
          isElective: subject.isElective,
        },
        component: {
          id: a.subjectComponent.id,
          type: a.subjectComponent.type,
          credits: a.subjectComponent.credits,
          hoursPerWeek: a.subjectComponent.hoursPerWeek,
        },
        semesterCatalog: {
          id: catalog.id,
          number: catalog.number,
        },
        program: {
          id: program.id,
          name: program.name,
          code: program.code,
        },
        department: {
          id: department.id,
          name: department.name,
          code: department.code,
        },
        academicYear: {
          id: a.subjectOffering.academicYear.id,
          label: a.subjectOffering.academicYear.label,
        },
        weeklySlotsCount: a.timetableEntries.length,
        totalLecturesCount: a._count.lectures,
      };
    });
  }

  async getTimetable(userId: string): Promise<FacultyTimetableEntryDTO[]> {
    await this.getFacultyRoleAssignmentOrThrow(userId);
    const timetables = await this.repo.findFacultyTimetable(userId);

    return timetables.map((t) => ({
      id: t.id,
      dayOfWeek: t.dayOfWeek,
      startTime: formatTime(t.startTime),
      endTime: formatTime(t.endTime),
      room: {
        id: t.room.id,
        name: t.room.name,
        type: t.room.type,
        capacity: t.room.capacity,
      },
      subject: {
        id: t.subjectOffering.subject.id,
        code: t.subjectOffering.subject.code,
        name: t.subjectOffering.subject.name,
      },
      component: {
        id: t.subjectComponent.id,
        type: t.subjectComponent.type,
      },
      semesterCatalog: {
        id: t.semesterCatalog.id,
        number: t.semesterCatalog.number,
      },
      academicYear: {
        id: t.academicYear.id,
        label: t.academicYear.label,
      },
      facultyAssignmentId: t.facultyAssignmentId,
    }));
  }

  async getLectures(
    userId: string,
    filters: ListFacultyLecturesFilters = {},
  ): Promise<FacultyLectureDTO[]> {
    await this.getFacultyRoleAssignmentOrThrow(userId);
    const lectures = await this.repo.findFacultyLectures(userId, filters);

    return lectures.map((l) => this.mapLectureToDTO(l));
  }

  private mapLectureToDTO(
    l: Awaited<ReturnType<FacultyRepository['findFacultyLectures']>>[number],
  ): FacultyLectureDTO {
    let attendanceSession: FacultyAttendanceSessionSummaryDTO | null = null;
    if (l.attendanceSession) {
      const records = l.attendanceSession.records;
      const presentCount = records.filter((r) => r.status === 'PRESENT').length;
      const absentCount = records.filter((r) => r.status === 'ABSENT').length;
      const lateCount = records.filter((r) => r.status === 'LATE').length;
      const excusedCount = records.filter((r) => r.status === 'EXCUSED').length;

      attendanceSession = {
        id: l.attendanceSession.id,
        status: l.attendanceSession.status,
        takenByUserId: l.attendanceSession.takenByUserId,
        lockedAt: l.attendanceSession.lockedAt
          ? l.attendanceSession.lockedAt instanceof Date
            ? l.attendanceSession.lockedAt.toISOString()
            : new Date(l.attendanceSession.lockedAt).toISOString()
          : null,
        totalRecords: records.length,
        presentCount,
        absentCount,
        lateCount,
        excusedCount,
      };
    }

    return {
      id: l.id,
      scheduledDate: formatDate(l.scheduledDate),
      startTime: formatTime(l.startTime),
      endTime: formatTime(l.endTime),
      status: l.status,
      subject: {
        id: l.subjectOffering.subject.id,
        code: l.subjectOffering.subject.code,
        name: l.subjectOffering.subject.name,
      },
      component: {
        id: l.subjectComponent.id,
        type: l.subjectComponent.type,
      },
      room: {
        id: l.room.id,
        name: l.room.name,
        type: l.room.type,
      },
      semesterCatalog: {
        id: l.semesterCatalog.id,
        number: l.semesterCatalog.number,
      },
      academicYear: {
        id: l.academicYear.id,
        label: l.academicYear.label,
      },
      facultyAssignmentId: l.facultyAssignmentId,
      attendanceSession,
    };
  }

  async getLectureRoster(userId: string, lectureId: string): Promise<FacultyLectureRosterDTO> {
    await this.getFacultyRoleAssignmentOrThrow(userId);

    const lecture = await this.repo.findLectureById(lectureId);
    if (!lecture) {
      throw ApiError.notFound('Lecture not found', ErrorCode.RECORD_NOT_FOUND);
    }

    // Strict IDOR / BOLA authorization check
    if (lecture.facultyUserId !== userId) {
      throw ApiError.forbidden(
        'Access denied: You are not the assigned faculty member for this lecture.',
        ErrorCode.INSUFFICIENT_ROLE,
      );
    }

    const eligibleStudents = await this.repo.findEligibleStudentsForLecture(
      lecture.semesterCatalogId,
      lecture.academicYearId,
    );

    const session = lecture.attendanceSession;
    const recordByEnrollmentId = new Map<string, { status: AttendanceStatus; id: string }>();

    if (session) {
      for (const rec of session.records) {
        recordByEnrollmentId.set(rec.semesterEnrollmentId, {
          status: rec.status,
          id: rec.id,
        });
      }
    }

    let markedCount = 0;
    let presentCount = 0;
    let absentCount = 0;
    let lateCount = 0;
    let excusedCount = 0;

    const students: FacultyRosterStudentDTO[] = eligibleStudents.map((enr) => {
      const existing = recordByEnrollmentId.get(enr.id);
      const attendanceStatus = existing ? existing.status : null;
      const attendanceRecordId = existing ? existing.id : null;

      if (attendanceStatus) {
        markedCount += 1;
        if (attendanceStatus === 'PRESENT') presentCount += 1;
        if (attendanceStatus === 'ABSENT') absentCount += 1;
        if (attendanceStatus === 'LATE') lateCount += 1;
        if (attendanceStatus === 'EXCUSED') excusedCount += 1;
      }

      return {
        semesterEnrollmentId: enr.id,
        studentEnrollmentId: enr.studentEnrollment.id,
        rollNumber: enr.studentEnrollment.rollNumber,
        firstName: enr.studentEnrollment.user.firstName,
        lastName: enr.studentEnrollment.user.lastName,
        email: enr.studentEnrollment.user.email,
        avatarUrl: enr.studentEnrollment.user.avatarUrl,
        attendanceStatus,
        attendanceRecordId,
      };
    });

    return {
      lecture: this.mapLectureToDTO(lecture),
      students,
      session: session
        ? {
            id: session.id,
            status: session.status,
            lockedAt: session.lockedAt
              ? session.lockedAt instanceof Date
                ? session.lockedAt.toISOString()
                : new Date(session.lockedAt).toISOString()
              : null,
          }
        : null,
      metrics: {
        totalEnrolled: eligibleStudents.length,
        markedCount,
        presentCount,
        absentCount,
        lateCount,
        excusedCount,
      },
    };
  }

  async submitAttendance(
    userId: string,
    lectureId: string,
    input: SubmitAttendanceInput,
  ): Promise<FacultyLectureRosterDTO> {
    await this.getFacultyRoleAssignmentOrThrow(userId);

    const lecture = await this.repo.findLectureById(lectureId);
    if (!lecture) {
      throw ApiError.notFound('Lecture not found', ErrorCode.RECORD_NOT_FOUND);
    }

    // Strict IDOR / BOLA authorization check
    if (lecture.facultyUserId !== userId) {
      throw ApiError.forbidden(
        'Access denied: You are not the assigned faculty member for this lecture.',
        ErrorCode.INSUFFICIENT_ROLE,
      );
    }

    if (lecture.status === 'CANCELLED') {
      throw ApiError.conflict('Cannot mark attendance for a cancelled lecture');
    }

    const eligibleEnrollments = await this.repo.findEligibleStudentsForLecture(
      lecture.semesterCatalogId,
      lecture.academicYearId,
    );
    const eligibleIdSet = new Set(eligibleEnrollments.map((e) => e.id));

    // Validate that all submitted records are for eligible students
    for (const record of input.records) {
      if (!eligibleIdSet.has(record.semesterEnrollmentId)) {
        throw ApiError.unprocessable(
          `Student enrollment ${record.semesterEnrollmentId} is not eligible for this lecture`,
          ErrorCode.ACADEMIC_HIERARCHY_MISMATCH,
        );
      }
    }

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      let session = await this.repo.findAttendanceSessionByLectureIdTx(tx, lectureId);

      if (!session) {
        session = await this.repo.createAttendanceSessionTx(tx, {
          lectureId,
          takenByUserId: userId,
        });
      } else if (session.status === 'LOCKED') {
        throw ApiError.conflict('This attendance session is locked and cannot be modified');
      }

      for (const rec of input.records) {
        await this.repo.upsertAttendanceRecordTx(tx, {
          attendanceSessionId: session!.id,
          semesterEnrollmentId: rec.semesterEnrollmentId,
          status: rec.status,
          markedByUserId: userId,
        });
      }

      if (input.lockSession) {
        await this.repo.lockAttendanceSessionTx(tx, session!.id);
      }

      await recordAuditTx(tx, {
        actorUserId: userId,
        action: 'UPDATE',
        entityType: AuditEntityType.ATTENDANCE,
        entityId: session!.id,
        newValue: {
          lectureId,
          recordsMarked: input.records.length,
          locked: input.lockSession ?? false,
        },
      });
    });

    return this.getLectureRoster(userId, lectureId);
  }

  async getAttendanceSummary(userId: string): Promise<FacultyAttendanceSummaryDTO> {
    await this.getFacultyRoleAssignmentOrThrow(userId);
    const lectures = await this.repo.findFacultyLectures(userId);

    const totalLectures = lectures.length;
    let completedLectures = 0;
    let scheduledLectures = 0;
    let cancelledLectures = 0;
    let sessionsRecorded = 0;
    let sessionsLocked = 0;

    let totalStudentInstances = 0;
    let presentStudentInstances = 0;

    const subjectStatsMap = new Map<
      string,
      {
        subjectId: string;
        subjectCode: string;
        subjectName: string;
        totalLectures: number;
        completedLectures: number;
        presentRecords: number;
        totalRecords: number;
      }
    >();

    for (const l of lectures) {
      if (l.status === 'COMPLETED') completedLectures += 1;
      if (l.status === 'SCHEDULED') scheduledLectures += 1;
      if (l.status === 'CANCELLED') cancelledLectures += 1;

      const subj = l.subjectOffering.subject;
      let stat = subjectStatsMap.get(subj.id);
      if (!stat) {
        stat = {
          subjectId: subj.id,
          subjectCode: subj.code,
          subjectName: subj.name,
          totalLectures: 0,
          completedLectures: 0,
          presentRecords: 0,
          totalRecords: 0,
        };
        subjectStatsMap.set(subj.id, stat);
      }

      stat.totalLectures += 1;
      if (l.status === 'COMPLETED') stat.completedLectures += 1;

      if (l.attendanceSession) {
        sessionsRecorded += 1;
        if (l.attendanceSession.status === 'LOCKED') {
          sessionsLocked += 1;
        }

        for (const r of l.attendanceSession.records) {
          totalStudentInstances += 1;
          stat.totalRecords += 1;
          if (r.status === 'PRESENT' || r.status === 'LATE') {
            presentStudentInstances += 1;
            stat.presentRecords += 1;
          }
        }
      }
    }

    const overallAttendancePercentage =
      totalStudentInstances > 0
        ? Math.round((presentStudentInstances / totalStudentInstances) * 1000) / 10
        : 0;

    const bySubject = Array.from(subjectStatsMap.values()).map((s) => ({
      subjectId: s.subjectId,
      subjectCode: s.subjectCode,
      subjectName: s.subjectName,
      totalLectures: s.totalLectures,
      completedLectures: s.completedLectures,
      attendanceRate:
        s.totalRecords > 0 ? Math.round((s.presentRecords / s.totalRecords) * 1000) / 10 : 0,
    }));

    return {
      totalLectures,
      completedLectures,
      scheduledLectures,
      cancelledLectures,
      sessionsRecorded,
      sessionsLocked,
      overallAttendancePercentage,
      bySubject,
    };
  }
}

export const facultyService = new FacultyService();
