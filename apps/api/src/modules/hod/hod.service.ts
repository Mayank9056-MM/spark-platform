import type { DayOfWeek } from '@spark/database/client';

import { ApiError } from '../../common/errors/ApiError.js';
import { ErrorCode } from '../../common/errors/ErrorCodes.js';
import { facultyAssignmentService } from '../faculty-assignments/facultyAssignment.service.js';
import { timetableService } from '../timetables/timetable.service.js';

import type { HodRepository } from './hod.repository.js';
import { hodRepository } from './hod.repository.js';
import type {
  CreateDepartmentFacultyAssignmentInput,
  CreateDepartmentTimetableInput,
  HodAttendanceSummaryDTO,
  HodCourseOfferingDTO,
  HodFacultyMemberDTO,
  HodOverviewDTO,
  HodProfileDTO,
  HodPromotionBatchDTO,
  HodTimetableEntryDTO,
  HodTimetableSchedulingOptionsDTO,
  ListHodStudentsFilters,
  ListHodStudentsResult,
} from './hod.types.js';

function formatTime(d: Date | string): string {
  if (typeof d === 'string') return d.slice(11, 16);
  return d.toISOString().slice(11, 16);
}

export class HodService {
  constructor(private readonly repo: HodRepository = hodRepository) {}

  /**
   * Authoritatively resolves the HOD's active role assignment and assigned department scope.
   * Never relies on client-supplied department IDs.
   */
  async getAuthorizedDepartmentScope(userId: string) {
    const roleAssignment = await this.repo.findHodRoleAssignment(userId);

    if (!roleAssignment) {
      return {
        isHod: false,
        isAssociated: false,
        roleAssignment: null,
        role: {
          key: 'hod',
          displayName: 'Head of Department',
        },
        department: null,
        departmentId: null,
        message: 'No active Head of Department role assignment found.',
      };
    }

    if (roleAssignment.scopeType !== 'DEPARTMENT' || !roleAssignment.scopeId) {
      return {
        isHod: true,
        isAssociated: false,
        roleAssignment,
        role: {
          key: roleAssignment.role?.key ?? 'hod',
          displayName: roleAssignment.role?.displayName ?? 'Head of Department',
        },
        department: null,
        departmentId: null,
        message:
          'Your HOD account is not currently associated with a department. Please contact an administrator.',
      };
    }

    const department = await this.repo.findDepartmentById(roleAssignment.scopeId);
    if (!department) {
      return {
        isHod: true,
        isAssociated: false,
        roleAssignment,
        role: {
          key: roleAssignment.role?.key ?? 'hod',
          displayName: roleAssignment.role?.displayName ?? 'Head of Department',
        },
        department: null,
        departmentId: null,
        message:
          'The department assigned to your HOD account could not be found or is inactive. Please contact an administrator.',
      };
    }

    return {
      isHod: true,
      isAssociated: true,
      roleAssignment,
      role: {
        key: roleAssignment.role?.key ?? 'hod',
        displayName: roleAssignment.role?.displayName ?? 'Head of Department',
      },
      department,
      departmentId: department.id,
      message: null,
    };
  }

  /**
   * Asserts that the authenticated user is an HOD with an active, valid department scope.
   * Throws 403 Forbidden with ErrorCode.FORBIDDEN_SCOPE if unassociated.
   */
  async getDepartmentScopeOrThrow(userId: string) {
    const scope = await this.getAuthorizedDepartmentScope(userId);

    if (!scope.isHod || !scope.isAssociated || !scope.departmentId || !scope.department) {
      throw ApiError.forbidden(
        scope.message ??
          'Your HOD account is not currently associated with a department. Please contact an administrator.',
        ErrorCode.FORBIDDEN_SCOPE,
      );
    }

    return {
      department: scope.department,
      departmentId: scope.departmentId,
    };
  }

  async getProfile(userId: string): Promise<HodProfileDTO> {
    const user = await this.repo.findUserWithProfile(userId);
    if (!user) {
      throw ApiError.notFound('User record not found');
    }

    const scope = await this.getAuthorizedDepartmentScope(userId);
    const activeYear = await this.repo.findActiveAcademicYear();

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
      department: scope.department
        ? {
            id: scope.department.id,
            name: scope.department.name,
            code: scope.department.code,
          }
        : null,
      role: scope.role,
      isAssociated: scope.isAssociated,
      activeAcademicYear: activeYear
        ? {
            id: activeYear.id,
            label: activeYear.label,
            startDate: activeYear.startDate.toISOString().split('T')[0]!,
            endDate: activeYear.endDate.toISOString().split('T')[0]!,
            isActive: activeYear.isActive,
          }
        : null,
      message: scope.message,
    };
  }

  async getOverview(userId: string): Promise<HodOverviewDTO> {
    const { department, departmentId } = await this.getDepartmentScopeOrThrow(userId);
    const activeYear = await this.repo.findActiveAcademicYear();

    if (!activeYear) {
      throw ApiError.notFound('No active academic year found for institution');
    }

    const overviewData = await this.repo.findDepartmentOverview(departmentId, activeYear.id);

    return {
      department: {
        id: department.id,
        name: department.name,
        code: department.code,
        status: 'ACTIVE',
      },
      academicYear: {
        id: activeYear.id,
        label: activeYear.label,
        startDate: activeYear.startDate.toISOString().split('T')[0]!,
        endDate: activeYear.endDate.toISOString().split('T')[0]!,
        isActive: activeYear.isActive,
      },
      metrics: {
        totalPrograms: overviewData.totalPrograms,
        totalFaculty: overviewData.totalFaculty,
        totalStudents: overviewData.totalStudents,
        activeSubjects: overviewData.totalActiveSubjects,
        totalActiveSubjects: overviewData.totalActiveSubjects,
        todayClassesCount: overviewData.todayLectures,
        todayLectures: overviewData.todayLectures,
        attendanceRate: overviewData.attendanceRate,
        pendingPromotions: overviewData.pendingPromotions,
      },
      programs: overviewData.programs ?? [],
      recentLectures: overviewData.recentLectures ?? [],
    };
  }

  async getFaculty(userId: string): Promise<HodFacultyMemberDTO[]> {
    const { departmentId } = await this.getDepartmentScopeOrThrow(userId);
    const activeYear = await this.repo.findActiveAcademicYear();

    return this.repo.findDepartmentFaculty(departmentId, activeYear?.id);
  }

  async getCourseOfferings(userId: string): Promise<HodCourseOfferingDTO[]> {
    const { departmentId } = await this.getDepartmentScopeOrThrow(userId);
    const activeYear = await this.repo.findActiveAcademicYear();

    return this.repo.findDepartmentCourseOfferings(departmentId, activeYear?.id);
  }

  async getStudents(
    userId: string,
    filters: ListHodStudentsFilters,
  ): Promise<ListHodStudentsResult> {
    const { departmentId } = await this.getDepartmentScopeOrThrow(userId);
    return this.repo.findDepartmentStudents(departmentId, filters);
  }

  async getTimetable(
    userId: string,
    query?: { dayOfWeek?: DayOfWeek | undefined; programId?: string | undefined },
  ): Promise<HodTimetableEntryDTO[]> {
    const { departmentId } = await this.getDepartmentScopeOrThrow(userId);
    const activeYear = await this.repo.findActiveAcademicYear();

    const entries = await this.repo.findDepartmentTimetable(
      departmentId,
      activeYear?.id,
      query?.dayOfWeek,
      query?.programId,
    );

    return entries.map((entry) => ({
      id: entry.id,
      dayOfWeek: entry.dayOfWeek,
      startTime: formatTime(entry.timeSlot.startTime),
      endTime: formatTime(entry.timeSlot.endTime),
      room: {
        id: entry.room.id,
        name: entry.room.name,
        type: entry.room.type,
      },
      subject: {
        id: entry.facultyAssignment.subjectOffering.subject.id,
        code: entry.facultyAssignment.subjectOffering.subject.code,
        name: entry.facultyAssignment.subjectOffering.subject.name,
      },
      componentType: entry.facultyAssignment.subjectComponent.type,
      program: {
        id: entry.facultyAssignment.subjectOffering.subject.semesterCatalog.curriculumVersion
          .program.id,
        name: entry.facultyAssignment.subjectOffering.subject.semesterCatalog.curriculumVersion
          .program.name,
        code: entry.facultyAssignment.subjectOffering.subject.semesterCatalog.curriculumVersion
          .program.code,
      },
      semesterNumber: entry.facultyAssignment.subjectOffering.subject.semesterCatalog.number,
      faculty: {
        id: entry.facultyAssignment.faculty.id,
        firstName: entry.facultyAssignment.faculty.firstName,
        lastName: entry.facultyAssignment.faculty.lastName,
        name: `${entry.facultyAssignment.faculty.firstName} ${entry.facultyAssignment.faculty.lastName}`,
      },
    }));
  }

  async getAttendance(userId: string): Promise<HodAttendanceSummaryDTO> {
    const { departmentId } = await this.getDepartmentScopeOrThrow(userId);
    const activeYear = await this.repo.findActiveAcademicYear();

    return this.repo.findDepartmentAttendanceSummary(departmentId, activeYear?.id);
  }

  async getPromotions(userId: string): Promise<HodPromotionBatchDTO[]> {
    const { departmentId } = await this.getDepartmentScopeOrThrow(userId);

    return this.repo.findDepartmentPromotions(departmentId);
  }

  /**
   * Allows an HOD to create a faculty assignment within their department.
   * Enforces that both the subject offering and faculty belong to the HOD's department.
   */
  async createFacultyAssignment(
    actorUserId: string,
    input: CreateDepartmentFacultyAssignmentInput,
  ) {
    const { departmentId } = await this.getDepartmentScopeOrThrow(actorUserId);

    // 1. Verify subject offering belongs to a program in this department
    const offering = await this.repo.findSubjectOfferingById(input.subjectOfferingId);
    if (!offering) {
      throw ApiError.notFound('Subject offering not found');
    }

    const offeringDeptId = offering.subject.semesterCatalog.curriculumVersion.program.departmentId;
    if (offeringDeptId !== departmentId) {
      throw ApiError.forbidden(
        'You cannot assign faculty to subjects outside your department',
        ErrorCode.FORBIDDEN_SCOPE,
      );
    }

    // 2. Verify faculty member is assigned to this department
    const facultyRole = await this.repo.findFacultyMemberInDept(input.facultyUserId, departmentId);
    if (!facultyRole) {
      throw ApiError.forbidden(
        'The specified faculty member does not belong to your department',
        ErrorCode.FORBIDDEN_SCOPE,
      );
    }

    // 3. Delegate to domain service
    return facultyAssignmentService.createFacultyAssignment(actorUserId, input);
  }

  /**
   * Retrieves available faculty assignments, rooms, and time slots for class scheduling.
   */
  async getTimetableOptions(userId: string): Promise<HodTimetableSchedulingOptionsDTO> {
    const { departmentId } = await this.getDepartmentScopeOrThrow(userId);
    const activeYear = await this.repo.findActiveAcademicYear();
    return this.repo.findSchedulingOptions(departmentId, activeYear?.id);
  }

  /**
   * Allows an HOD to schedule a timetable slot for a department faculty assignment.
   */
  async createTimetableEntry(actorUserId: string, input: CreateDepartmentTimetableInput) {
    const { departmentId } = await this.getDepartmentScopeOrThrow(actorUserId);

    // Verify assignment belongs to department if repository method available
    const assignment = await this.repo.findFacultyAssignmentById(input.facultyAssignmentId);
    if (assignment) {
      const offeringDeptId =
        assignment.subjectOffering.subject.semesterCatalog.curriculumVersion.program.departmentId;
      if (offeringDeptId !== departmentId) {
        throw ApiError.forbidden(
          'You cannot schedule timetable entries for subjects outside your department',
          ErrorCode.FORBIDDEN_SCOPE,
        );
      }
    }

    // Delegate to existing timetableService
    return timetableService.createTimetable(actorUserId, {
      facultyAssignmentId: input.facultyAssignmentId,
      roomId: input.roomId,
      timeSlotId: input.timeSlotId,
      effectiveFrom: input.effectiveFrom,
    });
  }
}

export const hodService = new HodService();
