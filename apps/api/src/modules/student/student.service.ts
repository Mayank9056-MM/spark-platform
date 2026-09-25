// apps/api/src/modules/student/student.service.ts

import { ApiError } from '../../common/errors/ApiError.js';
import { ErrorCode } from '../../common/errors/ErrorCodes.js';

import { studentRepository, type StudentRepository } from './student.repository.js';
import type {
  AttendanceRecordItemDTO,
  StudentAcademicsDTO,
  StudentAttendanceSummaryDTO,
  StudentProfileDTO,
  StudentProgressDTO,
  StudentSubjectDTO,
  StudentTimetableEntryDTO,
  SubjectAttendanceDTO,
} from './student.types.js';
import type { UpdateStudentProfileBody } from './student.validation.js';

function formatTimeOnly(time: Date): string {
  const hours = time.getUTCHours().toString().padStart(2, '0');
  const minutes = time.getUTCMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

export class StudentService {
  constructor(private readonly repo: StudentRepository = studentRepository) {}

  private async getEnrollmentOrThrow(userId: string) {
    const enrollment = await this.repo.findActiveEnrollmentByUserId(userId);
    if (!enrollment) {
      throw ApiError.notFound(
        'No active student enrollment found for this user account',
        ErrorCode.RECORD_NOT_FOUND,
      );
    }
    return enrollment;
  }

  async getProfile(userId: string): Promise<StudentProfileDTO> {
    const enrollment = await this.getEnrollmentOrThrow(userId);

    const activeSemester =
      enrollment.semesterEnrollments.find((s) => s.status === 'IN_PROGRESS') ??
      enrollment.semesterEnrollments[0] ??
      null;

    return {
      id: enrollment.id,
      userId: enrollment.userId,
      rollNumber: enrollment.rollNumber,
      admissionDate: enrollment.admissionDate.toISOString(),
      status: enrollment.status,
      user: {
        id: enrollment.user.id,
        firstName: enrollment.user.firstName,
        middleName: enrollment.user.middleName,
        lastName: enrollment.user.lastName,
        email: enrollment.user.email,
        phone: null,
        avatarUrl: enrollment.user.avatarUrl,
      },
      program: {
        id: enrollment.program.id,
        name: enrollment.program.name,
        code: enrollment.program.code,
        durationYears: enrollment.program.durationYears,
        totalSemesters: enrollment.program.totalSemesters,
      },
      department: {
        id: enrollment.program.department.id,
        name: enrollment.program.department.name,
        code: enrollment.program.department.code,
      },
      curriculumVersion: {
        id: enrollment.curriculumVersion.id,
        label: enrollment.curriculumVersion.label,
        status: enrollment.curriculumVersion.status,
      },
      admission: {
        id: enrollment.admission.id,
        admissionNumber: enrollment.admission.admissionNumber,
        admissionDate: enrollment.admission.admissionDate.toISOString(),
        admissionType: enrollment.admission.admissionType,
        quota: enrollment.admission.quota,
      },
      currentSemester: activeSemester
        ? {
            id: activeSemester.id,
            number: activeSemester.semesterCatalog.number,
            status: activeSemester.status,
            academicYearLabel: activeSemester.academicYear.label,
            academicYearId: activeSemester.academicYearId,
          }
        : null,
    };
  }

  async updateProfile(
    userId: string,
    _input: UpdateStudentProfileBody,
  ): Promise<StudentProfileDTO> {
    await this.getEnrollmentOrThrow(userId);
    return this.getProfile(userId);
  }

  async getAcademics(userId: string): Promise<StudentAcademicsDTO> {
    const enrollment = await this.getEnrollmentOrThrow(userId);

    const activeSemester =
      enrollment.semesterEnrollments.find((s) => s.status === 'IN_PROGRESS') ??
      enrollment.semesterEnrollments[0] ??
      null;

    const allCatalogs = await this.repo.findSemesterCatalogsByCurriculumVersionId(
      enrollment.curriculumVersionId,
    );

    const allSemesters = allCatalogs.map((cat) => {
      const totalCredits = cat.subjects.reduce((sum, subj) => {
        const subjCredits = subj.components.reduce((cSum, comp) => cSum + comp.credits, 0);
        return sum + subjCredits;
      }, 0);

      return {
        number: cat.number,
        catalogId: cat.id,
        totalSubjects: cat.subjects.length,
        totalCredits,
        isCurrent: activeSemester?.semesterCatalogId === cat.id,
      };
    });

    return {
      program: {
        id: enrollment.program.id,
        name: enrollment.program.name,
        code: enrollment.program.code,
        durationYears: enrollment.program.durationYears,
        totalSemesters: enrollment.program.totalSemesters,
      },
      department: {
        id: enrollment.program.department.id,
        name: enrollment.program.department.name,
        code: enrollment.program.department.code,
      },
      curriculumVersion: {
        id: enrollment.curriculumVersion.id,
        label: enrollment.curriculumVersion.label,
        status: enrollment.curriculumVersion.status,
      },
      currentSemester: activeSemester
        ? {
            id: activeSemester.id,
            number: activeSemester.semesterCatalog.number,
            academicYearLabel: activeSemester.academicYear.label,
            status: activeSemester.status,
          }
        : null,
      allSemesters,
    };
  }

  async getSubjects(userId: string): Promise<StudentSubjectDTO[]> {
    const enrollment = await this.getEnrollmentOrThrow(userId);

    const activeSemester =
      enrollment.semesterEnrollments.find((s) => s.status === 'IN_PROGRESS') ??
      enrollment.semesterEnrollments[0];

    if (!activeSemester) {
      return [];
    }

    const subjects = await this.repo.findSubjectsBySemesterCatalogId(
      activeSemester.semesterCatalogId,
    );

    return subjects.map((subj) => {
      const credits = subj.components.reduce((sum, c) => sum + c.credits, 0);
      return {
        id: subj.id,
        code: subj.code,
        name: subj.name,
        isElective: subj.isElective,
        electiveGroupName: subj.electiveGroup?.name ?? null,
        credits,
        components: subj.components.map((c) => ({
          id: c.id,
          type: c.type,
          credits: c.credits,
          hoursPerWeek: c.hoursPerWeek,
        })),
      };
    });
  }

  async getAttendance(userId: string): Promise<StudentAttendanceSummaryDTO> {
    const enrollment = await this.getEnrollmentOrThrow(userId);

    const activeSemester =
      enrollment.semesterEnrollments.find((s) => s.status === 'IN_PROGRESS') ??
      enrollment.semesterEnrollments[0];

    if (!activeSemester) {
      return {
        overall: {
          totalSessions: 0,
          presentSessions: 0,
          absentSessions: 0,
          percentage: 0,
        },
        bySubject: [],
        recentRecords: [],
      };
    }

    const records = await this.repo.findAttendanceRecordsBySemesterEnrollmentId(activeSemester.id);

    const totalSessions = records.length;
    let presentSessions = 0;
    let absentSessions = 0;

    const subjectMap = new Map<
      string,
      {
        subjectId: string;
        subjectCode: string;
        subjectName: string;
        total: number;
        present: number;
        absent: number;
      }
    >();

    for (const record of records) {
      const isPresent = record.status === 'PRESENT' || record.status === 'LATE';
      if (isPresent) {
        presentSessions += 1;
      } else {
        absentSessions += 1;
      }

      const subj = record.attendanceSession.lecture.subjectOffering.subject;
      let subjStats = subjectMap.get(subj.id);
      if (!subjStats) {
        subjStats = {
          subjectId: subj.id,
          subjectCode: subj.code,
          subjectName: subj.name,
          total: 0,
          present: 0,
          absent: 0,
        };
        subjectMap.set(subj.id, subjStats);
      }

      subjStats.total += 1;
      if (isPresent) {
        subjStats.present += 1;
      } else {
        subjStats.absent += 1;
      }
    }

    const overallPercentage =
      totalSessions > 0 ? Math.round((presentSessions / totalSessions) * 1000) / 10 : 0;

    const bySubject: SubjectAttendanceDTO[] = Array.from(subjectMap.values()).map((s) => ({
      subjectId: s.subjectId,
      subjectCode: s.subjectCode,
      subjectName: s.subjectName,
      totalSessions: s.total,
      presentSessions: s.present,
      absentSessions: s.absent,
      percentage: s.total > 0 ? Math.round((s.present / s.total) * 1000) / 10 : 0,
    }));

    const recentRecords: AttendanceRecordItemDTO[] = records.slice(0, 20).map((r) => ({
      id: r.id,
      date: r.attendanceSession.lecture.scheduledDate.toISOString().split('T')[0] ?? '',
      subjectCode: r.attendanceSession.lecture.subjectOffering.subject.code,
      subjectName: r.attendanceSession.lecture.subjectOffering.subject.name,
      componentType: r.attendanceSession.lecture.subjectComponent.type,
      status: r.status,
    }));

    return {
      overall: {
        totalSessions,
        presentSessions,
        absentSessions,
        percentage: overallPercentage,
      },
      bySubject,
      recentRecords,
    };
  }

  async getTimetable(userId: string): Promise<StudentTimetableEntryDTO[]> {
    const enrollment = await this.getEnrollmentOrThrow(userId);

    const activeSemester =
      enrollment.semesterEnrollments.find((s) => s.status === 'IN_PROGRESS') ??
      enrollment.semesterEnrollments[0];

    if (!activeSemester) {
      return [];
    }

    const entries = await this.repo.findTimetableEntries(
      activeSemester.semesterCatalogId,
      activeSemester.academicYearId,
    );

    return entries.map((entry) => ({
      id: entry.id,
      dayOfWeek: entry.dayOfWeek,
      startTime: formatTimeOnly(entry.startTime),
      endTime: formatTimeOnly(entry.endTime),
      subjectCode: entry.subjectOffering.subject.code,
      subjectName: entry.subjectOffering.subject.name,
      componentType: entry.subjectComponent.type,
      roomName: entry.room.name,
      facultyName: `${entry.facultyAssignment.faculty.firstName} ${entry.facultyAssignment.faculty.lastName}`,
    }));
  }

  async getProgress(userId: string): Promise<StudentProgressDTO> {
    const enrollment = await this.getEnrollmentOrThrow(userId);

    const { semesterEnrollments, promotionDecisions } = await this.repo.findProgressHistory(
      enrollment.id,
    );

    return {
      enrollmentHistory: semesterEnrollments.map((se) => ({
        id: se.id,
        semesterNumber: se.semesterCatalog.number,
        academicYearLabel: se.academicYear.label,
        attemptNumber: se.attemptNumber,
        status: se.status,
        startedAt: se.createdAt.toISOString(),
      })),
      promotionDecisions: promotionDecisions.map((pd) => ({
        id: pd.id,
        decision: pd.outcome,
        fromSemesterNumber: pd.fromSemesterEnrollment.semesterCatalog.number,
        toSemesterNumber: pd.toSemesterEnrollment?.semesterCatalog.number ?? null,
        remarks: pd.remarks,
        decidedAt: pd.decidedAt.toISOString(),
      })),
    };
  }
}

export const studentService = new StudentService();
