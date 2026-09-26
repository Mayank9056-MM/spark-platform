// apps/api/src/modules/hod/hod.service.test.ts

/* eslint-disable @typescript-eslint/unbound-method, @typescript-eslint/no-unsafe-argument */
import { describe, expect, it, vi } from 'vitest';

import { facultyAssignmentService } from '../faculty-assignments/facultyAssignment.service.js';
import { timetableService } from '../timetables/timetable.service.js';

import { HodService } from './hod.service.js';

describe('HodService', () => {
  const mockRepo = {
    findHodRoleAssignment: vi.fn(),
    findUserWithProfile: vi.fn(),
    findDepartmentById: vi.fn(),
    findActiveAcademicYear: vi.fn(),
    findDepartmentOverview: vi.fn(),
    findDepartmentFaculty: vi.fn(),
    findDepartmentStudents: vi.fn(),
    findDepartmentTimetable: vi.fn(),
    findDepartmentAttendanceSummary: vi.fn(),
    findDepartmentPromotions: vi.fn(),
    findSubjectOfferingById: vi.fn(),
    findFacultyMemberInDept: vi.fn(),
    findDepartmentCourseOfferings: vi.fn(),
    findFacultyAssignmentById: vi.fn(),
    findSchedulingOptions: vi.fn(),
  };

  const service = new HodService(mockRepo);

  describe('getAuthorizedDepartmentScope & Safe Restricted State', () => {
    it('returns unassociated when user has no HOD role assignment', async () => {
      vi.mocked(mockRepo.findHodRoleAssignment).mockResolvedValue(null);

      const result = await service.getAuthorizedDepartmentScope('user-no-hod');
      expect(result.isHod).toBe(false);
      expect(result.isAssociated).toBe(false);
      expect(result.departmentId).toBeNull();
      expect(result.message).toContain('No active Head of Department role');
    });

    it('returns safe restricted state when HOD has no departmentId in scope', async () => {
      vi.mocked(mockRepo.findHodRoleAssignment).mockResolvedValue({
        id: 'ra-1',
        userId: 'user-hod',
        scopeType: 'COLLEGE',
        scopeId: null,
        role: { key: 'hod', displayName: 'Head of Department' },
      } as any);

      const result = await service.getAuthorizedDepartmentScope('user-hod');
      expect(result.isHod).toBe(true);
      expect(result.isAssociated).toBe(false);
      expect(result.departmentId).toBeNull();
      expect(result.message).toContain('not currently associated with a department');
    });

    it('returns safe restricted state when department row does not exist', async () => {
      vi.mocked(mockRepo.findHodRoleAssignment).mockResolvedValue({
        id: 'ra-1',
        userId: 'user-hod',
        scopeType: 'DEPARTMENT',
        scopeId: 'dept-missing',
        role: { key: 'hod', displayName: 'Head of Department' },
      } as any);
      vi.mocked(mockRepo.findDepartmentById).mockResolvedValue(null);

      const result = await service.getAuthorizedDepartmentScope('user-hod');
      expect(result.isHod).toBe(true);
      expect(result.isAssociated).toBe(false);
      expect(result.departmentId).toBeNull();
      expect(result.message).toContain('could not be found or is inactive');
    });

    it('returns associated department when HOD has valid department scope', async () => {
      vi.mocked(mockRepo.findHodRoleAssignment).mockResolvedValue({
        id: 'ra-1',
        userId: 'user-hod',
        scopeType: 'DEPARTMENT',
        scopeId: 'dept-it',
        role: { key: 'hod', displayName: 'Head of Department' },
      } as any);
      vi.mocked(mockRepo.findDepartmentById).mockResolvedValue({
        id: 'dept-it',
        name: 'Information Technology',
        code: 'IT',
      } as any);

      const result = await service.getAuthorizedDepartmentScope('user-hod');
      expect(result.isHod).toBe(true);
      expect(result.isAssociated).toBe(true);
      expect(result.departmentId).toBe('dept-it');
      expect(result.department?.name).toBe('Information Technology');
    });

    it('throws FORBIDDEN_SCOPE from getDepartmentScopeOrThrow when unassociated', async () => {
      vi.mocked(mockRepo.findHodRoleAssignment).mockResolvedValue({
        id: 'ra-1',
        userId: 'user-hod-unassociated',
        scopeType: 'DEPARTMENT',
        scopeId: null,
        role: { key: 'hod', displayName: 'Head of Department' },
      } as any);

      await expect(service.getDepartmentScopeOrThrow('user-hod-unassociated')).rejects.toThrow(
        'Your HOD account is not currently associated with a department',
      );
    });
  });

  describe('getProfile', () => {
    it('returns profile with associated department and active academic year', async () => {
      vi.mocked(mockRepo.findUserWithProfile).mockResolvedValue({
        id: 'user-hod',
        email: 'hod.it@hvpm.edu',
        firstName: 'Rajesh',
        middleName: 'M',
        lastName: 'Sharma',
        avatarUrl: null,
        status: 'ACTIVE',
      });

      vi.mocked(mockRepo.findHodRoleAssignment).mockResolvedValue({
        scopeType: 'DEPARTMENT',
        scopeId: 'dept-it',
        role: { key: 'hod', displayName: 'Head of Department' },
      } as any);

      vi.mocked(mockRepo.findDepartmentById).mockResolvedValue({
        id: 'dept-it',
        name: 'Information Technology',
        code: 'IT',
      } as any);

      vi.mocked(mockRepo.findActiveAcademicYear).mockResolvedValue({
        id: 'ay-1',
        label: '2026-2027',
        startDate: new Date('2026-06-01T00:00:00Z'),
        endDate: new Date('2027-05-31T00:00:00Z'),
        isActive: true,
      } as any);

      const profile = await service.getProfile('user-hod');
      expect(profile.user.email).toBe('hod.it@hvpm.edu');
      expect(profile.isAssociated).toBe(true);
      expect(profile.role.key).toBe('hod');
      expect(profile.role.displayName).toBe('Head of Department');
      expect(profile.department?.code).toBe('IT');
      expect(profile.activeAcademicYear?.label).toBe('2026-2027');
    });

    it('returns profile with safe unassociated message when no department assigned', async () => {
      vi.mocked(mockRepo.findUserWithProfile).mockResolvedValue({
        id: 'user-hod-unassigned',
        email: 'hod.unassigned@hvpm.edu',
        firstName: 'Anil',
        middleName: null,
        lastName: 'Verma',
        avatarUrl: null,
        status: 'ACTIVE',
      });

      vi.mocked(mockRepo.findHodRoleAssignment).mockResolvedValue({
        scopeType: 'DEPARTMENT',
        scopeId: null,
        role: { key: 'hod', displayName: 'Head of Department' },
      } as any);

      const profile = await service.getProfile('user-hod-unassigned');
      expect(profile.isAssociated).toBe(false);
      expect(profile.department).toBeNull();
      expect(profile.role.key).toBe('hod');
      expect(profile.message).toContain('not currently associated with a department');
    });

    it('throws not found if user record does not exist', async () => {
      vi.mocked(mockRepo.findUserWithProfile).mockResolvedValue(null);

      await expect(service.getProfile('missing-user')).rejects.toThrow('User record not found');
    });
  });

  describe('getOverview', () => {
    it('returns department metrics and academic context', async () => {
      vi.mocked(mockRepo.findHodRoleAssignment).mockResolvedValue({
        scopeType: 'DEPARTMENT',
        scopeId: 'dept-it',
        role: { key: 'hod' },
      } as any);

      vi.mocked(mockRepo.findDepartmentById).mockResolvedValue({
        id: 'dept-it',
        name: 'Information Technology',
        code: 'IT',
      } as any);

      vi.mocked(mockRepo.findActiveAcademicYear).mockResolvedValue({
        id: 'ay-1',
        label: '2026-2027',
        startDate: new Date('2026-06-01T00:00:00Z'),
        endDate: new Date('2027-05-31T00:00:00Z'),
        isActive: true,
      } as any);

      vi.mocked(mockRepo.findDepartmentOverview).mockResolvedValue({
        totalPrograms: 2,
        totalFaculty: 12,
        totalStudents: 240,
        totalActiveSubjects: 18,
        todayLectures: 6,
        attendanceRate: 85,
        pendingPromotions: 1,
      });

      const overview = await service.getOverview('user-hod');
      expect(overview.department.code).toBe('IT');
      expect(overview.metrics.totalPrograms).toBe(2);
      expect(overview.metrics.totalFaculty).toBe(12);
      expect(overview.metrics.totalStudents).toBe(240);
      expect(overview.metrics.attendanceRate).toBe(85);
    });

    it('throws not found if active academic year is missing', async () => {
      vi.mocked(mockRepo.findHodRoleAssignment).mockResolvedValue({
        scopeType: 'DEPARTMENT',
        scopeId: 'dept-it',
        role: { key: 'hod' },
      } as any);

      vi.mocked(mockRepo.findDepartmentById).mockResolvedValue({
        id: 'dept-it',
        name: 'Information Technology',
        code: 'IT',
      } as any);

      vi.mocked(mockRepo.findActiveAcademicYear).mockResolvedValue(null);

      await expect(service.getOverview('user-hod')).rejects.toThrow(
        'No active academic year found',
      );
    });
  });

  describe('getFaculty', () => {
    it('returns faculty members with workload belonging to the department', async () => {
      vi.mocked(mockRepo.findHodRoleAssignment).mockResolvedValue({
        scopeType: 'DEPARTMENT',
        scopeId: 'dept-it',
        role: { key: 'hod' },
      } as any);

      vi.mocked(mockRepo.findDepartmentById).mockResolvedValue({
        id: 'dept-it',
        name: 'Information Technology',
        code: 'IT',
      } as any);

      vi.mocked(mockRepo.findActiveAcademicYear).mockResolvedValue({
        id: 'ay-1',
      } as any);

      vi.mocked(mockRepo.findDepartmentFaculty).mockResolvedValue([
        {
          userId: 'fac-1',
          firstName: 'Suresh',
          lastName: 'Patil',
          email: 'suresh@hvpm.edu',
          avatarUrl: null,
          designation: 'Assistant Professor',
          roleKey: 'faculty',
          assignmentCount: 2,
          assignedSubjects: [
            {
              subjectCode: 'IT301',
              subjectName: 'DBMS',
              componentType: 'THEORY',
              programCode: 'BTECH-IT',
            },
          ],
        },
      ]);

      const faculty = await service.getFaculty('user-hod');
      expect(faculty).toHaveLength(1);
      expect(faculty[0]?.firstName).toBe('Suresh');
      expect(faculty[0]?.assignedSubjects[0]?.subjectCode).toBe('IT301');
    });
  });

  describe('getCourseOfferings', () => {
    it('returns course offerings belonging to the department with components', async () => {
      vi.mocked(mockRepo.findHodRoleAssignment).mockResolvedValue({
        scopeType: 'DEPARTMENT',
        scopeId: 'dept-it',
        role: { key: 'hod' },
      } as any);

      vi.mocked(mockRepo.findDepartmentById).mockResolvedValue({
        id: 'dept-it',
        name: 'Information Technology',
        code: 'IT',
      } as any);

      vi.mocked(mockRepo.findActiveAcademicYear).mockResolvedValue({
        id: 'ay-1',
      } as any);

      vi.mocked(mockRepo.findDepartmentCourseOfferings).mockResolvedValue([
        {
          id: 'offering-1',
          academicYear: { id: 'ay-1', label: '2026-2027' },
          subject: { id: 'sub-1', code: 'IT301', name: 'Database Systems', isElective: false },
          program: { id: 'prog-1', code: 'BTECH-IT', name: 'B.Tech IT' },
          semesterNumber: 3,
          components: [
            {
              id: 'comp-1',
              type: 'THEORY',
              credits: 3,
              hoursPerWeek: 3,
              isAssigned: false,
              assignedFaculty: null,
            },
          ],
        },
      ]);

      const offerings = await service.getCourseOfferings('user-hod');
      expect(offerings).toHaveLength(1);
      expect(offerings[0]?.id).toBe('offering-1');
      expect(offerings[0]?.subject.code).toBe('IT301');
      expect(offerings[0]?.components[0]?.type).toBe('THEORY');
      expect(offerings[0]?.components[0]?.isAssigned).toBe(false);
      expect(mockRepo.findDepartmentCourseOfferings).toHaveBeenCalledWith('dept-it', 'ay-1');
    });
  });

  describe('getStudents', () => {
    it('returns department students with pagination strictly scoped to department', async () => {
      vi.mocked(mockRepo.findHodRoleAssignment).mockResolvedValue({
        scopeType: 'DEPARTMENT',
        scopeId: 'dept-it',
        role: { key: 'hod' },
      } as any);

      vi.mocked(mockRepo.findDepartmentById).mockResolvedValue({
        id: 'dept-it',
        name: 'Information Technology',
        code: 'IT',
      } as any);

      vi.mocked(mockRepo.findDepartmentStudents).mockResolvedValue({
        total: 1,
        students: [
          {
            id: 'se-1',
            rollNumber: 'IT2024001',
            firstName: 'Aarav',
            lastName: 'Deshmukh',
            email: 'aarav@hvpm.edu',
            avatarUrl: null,
            program: { id: 'prog-1', name: 'B.Tech IT', code: 'BTECH-IT' },
            currentSemester: 3,
            status: 'ACTIVE',
            admissionDate: '2024-08-01',
          },
        ],
        page: 1,
        limit: 20,
        totalPages: 1,
      });

      const result = await service.getStudents('user-hod', { page: 1, limit: 20 });
      expect(result.students).toHaveLength(1);
      expect(result.students[0]?.rollNumber).toBe('IT2024001');
      expect(mockRepo.findDepartmentStudents).toHaveBeenCalledWith(
        'dept-it',
        expect.objectContaining({ page: 1, limit: 20 }),
      );
    });
  });

  describe('getTimetable', () => {
    it('returns timetable entries scoped to department programs', async () => {
      vi.mocked(mockRepo.findHodRoleAssignment).mockResolvedValue({
        scopeType: 'DEPARTMENT',
        scopeId: 'dept-it',
        role: { key: 'hod' },
      } as any);

      vi.mocked(mockRepo.findDepartmentById).mockResolvedValue({
        id: 'dept-it',
        name: 'Information Technology',
        code: 'IT',
      } as any);

      vi.mocked(mockRepo.findActiveAcademicYear).mockResolvedValue({ id: 'ay-1' } as any);

      vi.mocked(mockRepo.findDepartmentTimetable).mockResolvedValue([
        {
          id: 'tt-1',
          dayOfWeek: 'MONDAY',
          timeSlot: { startTime: '10:00', endTime: '11:00' },
          room: { id: 'r-1', name: 'Lab 1', type: 'LABORATORY' },
          facultyAssignment: {
            faculty: { id: 'f-1', firstName: 'Priya', lastName: 'Kale' },
            subjectComponent: { type: 'PRACTICAL' },
            subjectOffering: {
              subject: {
                id: 's-1',
                code: 'IT302',
                name: 'Data Structures Lab',
                semesterCatalog: {
                  number: 3,
                  curriculumVersion: {
                    program: { id: 'p-1', name: 'B.Tech IT', code: 'BTECH-IT' },
                  },
                },
              },
            },
          },
        } as any,
      ]);

      const timetable = await service.getTimetable('user-hod', { dayOfWeek: 'MONDAY' });
      expect(timetable).toHaveLength(1);
      expect(timetable[0]?.subject.code).toBe('IT302');
      expect(timetable[0]?.faculty.firstName).toBe('Priya');
      expect(timetable[0]?.faculty.lastName).toBe('Kale');
      expect(timetable[0]?.faculty.name).toBe('Priya Kale');
    });
  });

  describe('createFacultyAssignment - IDOR / BOLA Prevention', () => {
    it('denies faculty assignment if subject offering belongs to another department', async () => {
      vi.mocked(mockRepo.findHodRoleAssignment).mockResolvedValue({
        scopeType: 'DEPARTMENT',
        scopeId: 'dept-it',
        role: { key: 'hod' },
      } as any);

      vi.mocked(mockRepo.findDepartmentById).mockResolvedValue({
        id: 'dept-it',
        name: 'Information Technology',
        code: 'IT',
      } as any);

      // Subject offering belongs to dept-cse (different department!)
      vi.mocked(mockRepo.findSubjectOfferingById).mockResolvedValue({
        id: 'offering-cse',
        subject: {
          semesterCatalog: {
            curriculumVersion: {
              program: {
                departmentId: 'dept-cse',
              },
            },
          },
        },
      } as any);

      await expect(
        service.createFacultyAssignment('user-hod', {
          subjectOfferingId: 'offering-cse',
          subjectComponentId: 'comp-1',
          facultyUserId: 'fac-1',
        }),
      ).rejects.toThrow('You cannot assign faculty to subjects outside your department');
    });

    it('denies faculty assignment if faculty member does not belong to HOD department', async () => {
      vi.mocked(mockRepo.findHodRoleAssignment).mockResolvedValue({
        scopeType: 'DEPARTMENT',
        scopeId: 'dept-it',
        role: { key: 'hod' },
      } as any);

      vi.mocked(mockRepo.findDepartmentById).mockResolvedValue({
        id: 'dept-it',
        name: 'Information Technology',
        code: 'IT',
      } as any);

      // Subject offering belongs to dept-it
      vi.mocked(mockRepo.findSubjectOfferingById).mockResolvedValue({
        id: 'offering-it',
        subject: {
          semesterCatalog: {
            curriculumVersion: {
              program: {
                departmentId: 'dept-it',
              },
            },
          },
        },
      } as any);

      // Faculty member is NOT in dept-it
      vi.mocked(mockRepo.findFacultyMemberInDept).mockResolvedValue(null);

      await expect(
        service.createFacultyAssignment('user-hod', {
          subjectOfferingId: 'offering-it',
          subjectComponentId: 'comp-1',
          facultyUserId: 'fac-other-dept',
        }),
      ).rejects.toThrow('The specified faculty member does not belong to your department');
    });

    it('allows faculty assignment when subject and faculty both belong to HOD department', async () => {
      vi.mocked(mockRepo.findHodRoleAssignment).mockResolvedValue({
        scopeType: 'DEPARTMENT',
        scopeId: 'dept-it',
        role: { key: 'hod' },
      } as any);

      vi.mocked(mockRepo.findDepartmentById).mockResolvedValue({
        id: 'dept-it',
        name: 'Information Technology',
        code: 'IT',
      } as any);

      vi.mocked(mockRepo.findSubjectOfferingById).mockResolvedValue({
        id: 'offering-it',
        subject: {
          semesterCatalog: {
            curriculumVersion: {
              program: {
                departmentId: 'dept-it',
              },
            },
          },
        },
      } as any);

      vi.mocked(mockRepo.findFacultyMemberInDept).mockResolvedValue({
        id: 'ra-fac',
      } as any);

      vi.spyOn(facultyAssignmentService, 'createFacultyAssignment').mockResolvedValue({
        id: 'fa-new',
        subjectOfferingId: 'offering-it',
        subjectComponentId: 'comp-1',
        facultyUserId: 'fac-it-1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const result = await service.createFacultyAssignment('user-hod', {
        subjectOfferingId: 'offering-it',
        subjectComponentId: 'comp-1',
        facultyUserId: 'fac-it-1',
      });

      expect(result.id).toBe('fa-new');
      expect(facultyAssignmentService.createFacultyAssignment).toHaveBeenCalledWith(
        'user-hod',
        expect.objectContaining({
          subjectOfferingId: 'offering-it',
          subjectComponentId: 'comp-1',
          facultyUserId: 'fac-it-1',
        }),
      );
    });
  });

  describe('getTimetableOptions', () => {
    it('returns scheduling options scoped to department', async () => {
      vi.mocked(mockRepo.findHodRoleAssignment).mockResolvedValue({
        scopeType: 'DEPARTMENT',
        scopeId: 'dept-it',
        role: { key: 'hod' },
      } as any);

      vi.mocked(mockRepo.findDepartmentById).mockResolvedValue({
        id: 'dept-it',
        name: 'Information Technology',
        code: 'IT',
      } as any);

      vi.mocked(mockRepo.findActiveAcademicYear).mockResolvedValue({ id: 'ay-1' } as any);

      vi.mocked(mockRepo.findSchedulingOptions).mockResolvedValue({
        facultyAssignments: [
          {
            id: 'fa-1',
            faculty: { id: 'f-1', firstName: 'Priya', lastName: 'Kale', name: 'Priya Kale', email: 'p@hvpm.edu' },
            subject: { id: 's-1', code: 'IT301', name: 'Data Structures' },
            component: { id: 'c-1', type: 'THEORY', hoursPerWeek: 4 },
            program: { id: 'p-1', code: 'BTECH-IT', name: 'B.Tech IT' },
            semesterNumber: 3,
          },
        ],
        rooms: [{ id: 'r-1', name: 'LH-101', type: 'LECTURE_HALL', capacity: 60 }],
        timeSlots: [
          {
            id: 'ts-1',
            dayOfWeek: 'MONDAY',
            startTime: '09:00',
            endTime: '10:00',
            label: 'Monday 09:00 - 10:00',
          },
        ],
      });

      const options = await service.getTimetableOptions('user-hod');
      expect(options.facultyAssignments).toHaveLength(1);
      expect(options.rooms).toHaveLength(1);
      expect(options.timeSlots).toHaveLength(1);
      expect(mockRepo.findSchedulingOptions).toHaveBeenCalledWith('dept-it', 'ay-1');
    });
  });

  describe('createTimetableEntry', () => {
    it('denies timetable creation if faculty assignment belongs to another department', async () => {
      vi.mocked(mockRepo.findHodRoleAssignment).mockResolvedValue({
        scopeType: 'DEPARTMENT',
        scopeId: 'dept-it',
        role: { key: 'hod' },
      } as any);

      vi.mocked(mockRepo.findDepartmentById).mockResolvedValue({
        id: 'dept-it',
        name: 'Information Technology',
        code: 'IT',
      } as any);

      vi.mocked(mockRepo.findFacultyAssignmentById).mockResolvedValue({
        id: 'fa-other',
        subjectOffering: {
          subject: {
            semesterCatalog: {
              curriculumVersion: {
                program: {
                  departmentId: 'dept-mech',
                },
              },
            },
          },
        },
      } as any);

      await expect(
        service.createTimetableEntry('user-hod', {
          facultyAssignmentId: 'fa-other',
          roomId: 'r-1',
          timeSlotId: 'ts-1',
          dayOfWeek: 'MONDAY',
          effectiveFrom: '2026-06-01',
        }),
      ).rejects.toThrow('You cannot schedule timetable entries for subjects outside your department');
    });

    it('creates timetable entry via timetableService', async () => {
      vi.mocked(mockRepo.findHodRoleAssignment).mockResolvedValue({
        scopeType: 'DEPARTMENT',
        scopeId: 'dept-it',
        role: { key: 'hod' },
      } as any);

      vi.mocked(mockRepo.findDepartmentById).mockResolvedValue({
        id: 'dept-it',
        name: 'Information Technology',
        code: 'IT',
      } as any);

      vi.mocked(mockRepo.findFacultyAssignmentById).mockResolvedValue({
        id: 'fa-1',
        subjectOffering: {
          subject: {
            semesterCatalog: {
              curriculumVersion: {
                program: {
                  departmentId: 'dept-it',
                },
              },
            },
          },
        },
      } as any);

      vi.spyOn(timetableService, 'createTimetable').mockResolvedValue({
        id: 'tt-new',
      } as any);

      const result = await service.createTimetableEntry('user-hod', {
        facultyAssignmentId: 'fa-1',
        roomId: 'r-1',
        timeSlotId: 'ts-1',
        dayOfWeek: 'MONDAY',
        effectiveFrom: '2026-06-01',
      });

      expect(result.id).toBe('tt-new');
      expect(timetableService.createTimetable).toHaveBeenCalledWith(
        'user-hod',
        expect.objectContaining({
          facultyAssignmentId: 'fa-1',
          roomId: 'r-1',
          timeSlotId: 'ts-1',
          effectiveFrom: '2026-06-01',
        }),
      );
    });
  });

  describe('getAttendance', () => {
    it('returns department attendance summary', async () => {
      vi.mocked(mockRepo.findHodRoleAssignment).mockResolvedValue({
        scopeType: 'DEPARTMENT',
        scopeId: 'dept-it',
        role: { key: 'hod' },
      } as any);

      vi.mocked(mockRepo.findDepartmentById).mockResolvedValue({
        id: 'dept-it',
        name: 'Information Technology',
        code: 'IT',
      } as any);

      vi.mocked(mockRepo.findActiveAcademicYear).mockResolvedValue({ id: 'ay-1' } as any);

      vi.mocked(mockRepo.findDepartmentAttendanceSummary).mockResolvedValue({
        overallAttendancePercentage: 88,
        totalSessions: 12,
        lockedSessions: 10,
        subjectBreakdown: [],
        recentSessions: [],
      });

      const result = await service.getAttendance('user-hod');
      expect(result.overallAttendancePercentage).toBe(88);
      expect(result.totalSessions).toBe(12);
    });
  });

  describe('getPromotions', () => {
    it('returns department promotion batches', async () => {
      vi.mocked(mockRepo.findHodRoleAssignment).mockResolvedValue({
        scopeType: 'DEPARTMENT',
        scopeId: 'dept-it',
        role: { key: 'hod' },
      } as any);

      vi.mocked(mockRepo.findDepartmentById).mockResolvedValue({
        id: 'dept-it',
        name: 'Information Technology',
        code: 'IT',
      } as any);

      vi.mocked(mockRepo.findDepartmentPromotions).mockResolvedValue([
        {
          id: 'batch-1',
          academicYearLabel: '2026-2027',
          semesterCatalogNumber: 3,
          programName: 'B.Tech IT',
          programCode: 'BTECH-IT',
          status: 'DRAFT',
          createdAt: '2026-09-01',
          totalDecisions: 45,
        },
      ]);

      const result = await service.getPromotions('user-hod');
      expect(result).toHaveLength(1);
      expect(result[0]?.programCode).toBe('BTECH-IT');
    });
  });
});
