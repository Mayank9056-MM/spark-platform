import { describe, expect, it } from 'vitest';

import {
  createHodFacultyAssignmentSchema,
  createHodTimetableEntrySchema,
  hodAttendanceSummarySchema,
  hodCourseOfferingSchema,
  hodFacultyMemberSchema,
  hodOverviewSchema,
  hodProfileSchema,
  hodPromotionBatchSchema,
  hodStudentsListSchema,
  hodTimetableEntrySchema,
} from './hod.schema';

describe('HOD Schemas', () => {
  it('validates a complete HOD profile', () => {
    const validProfile = {
      user: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'hod.cse@hvpm.ac.in',
        firstName: 'Jane',
        middleName: null,
        lastName: 'Doe',
        avatarUrl: null,
        status: 'ACTIVE',
      },
      department: {
        id: 'dept-1',
        name: 'Computer Science & Engineering',
        code: 'CSE',
      },
      role: {
        key: 'hod',
        displayName: 'Head of Department',
      },
      activeAcademicYear: {
        id: 'ay-2026',
        label: '2026-2027',
        startDate: '2026-07-01T00:00:00.000Z',
        endDate: '2027-06-30T00:00:00.000Z',
      },
      isAssociated: true,
    };

    expect(hodProfileSchema.safeParse(validProfile).success).toBe(true);
  });

  it('validates an unassociated HOD profile', () => {
    const unassociatedProfile = {
      user: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'hod.unassigned@hvpm.ac.in',
        firstName: 'John',
        middleName: 'M',
        lastName: 'Smith',
        avatarUrl: null,
        status: 'ACTIVE',
      },
      department: null,
      role: {
        key: 'hod',
        displayName: 'Head of Department',
      },
      activeAcademicYear: null,
      isAssociated: false,
    };

    expect(hodProfileSchema.safeParse(unassociatedProfile).success).toBe(true);
  });

  it('validates department overview with metrics', () => {
    const overview = {
      department: {
        id: 'dept-1',
        name: 'Computer Science & Engineering',
        code: 'CSE',
        status: 'ACTIVE',
      },
      metrics: {
        totalPrograms: 2,
        totalFaculty: 15,
        totalStudents: 320,
        activeSubjects: 24,
        todayClassesCount: 8,
        attendanceRate: 88,
      },
      programs: [
        {
          id: 'prog-1',
          code: 'BTECH_CSE',
          name: 'B.Tech in Computer Science and Engineering',
          durationYears: 4,
          curriculumCount: 1,
        },
      ],
      recentLectures: [
        {
          id: 'lec-1',
          date: '2026-09-26',
          startTime: '09:00',
          endTime: '10:00',
          status: 'SCHEDULED',
          subjectCode: 'CS301',
          subjectName: 'Operating Systems',
          facultyName: 'Dr. John Doe',
          roomName: 'LH-101',
        },
      ],
    };

    expect(hodOverviewSchema.safeParse(overview).success).toBe(true);
  });

  it('validates faculty member list and workload', () => {
    const faculty = {
      userId: 'user-1',
      firstName: 'Alan',
      lastName: 'Turing',
      email: 'alan@hvpm.ac.in',
      avatarUrl: null,
      designation: 'Assistant Professor',
      roleKey: 'faculty',
      assignmentCount: 2,
      assignedSubjects: [
        {
          subjectCode: 'CS101',
          subjectName: 'Programming Fundamentals',
          componentType: 'THEORY',
          programCode: 'BTECH_CSE',
        },
      ],
    };

    expect(hodFacultyMemberSchema.safeParse(faculty).success).toBe(true);
  });

  it('validates student roster response', () => {
    const studentsList = {
      students: [
        {
          id: 's-1',
          rollNumber: 'CSE-2026-001',
          firstName: 'Alice',
          lastName: 'Smith',
          email: 'alice@student.hvpm.ac.in',
          avatarUrl: null,
          program: {
            id: 'p-1',
            code: 'BTECH_CSE',
            name: 'B.Tech in Computer Science and Engineering',
          },
          currentSemester: 5,
          status: 'ENROLLED',
          admissionDate: '2024-08-01',
        },
      ],
      page: 1,
      limit: 20,
      totalPages: 1,
    };

    expect(hodStudentsListSchema.safeParse(studentsList).success).toBe(true);
  });

  it('validates timetable entry', () => {
    const timetableEntry = {
      id: 'tt-1',
      dayOfWeek: 'MONDAY',
      startTime: '10:00',
      endTime: '11:00',
      room: {
        id: 'r-1',
        name: 'Lab 1',
        type: 'LAB',
      },
      subject: {
        id: 'sub-1',
        code: 'CS302',
        name: 'Database Management Systems',
      },
      componentType: 'PRACTICAL',
      program: {
        id: 'p-1',
        code: 'BTECH_CSE',
        name: 'B.Tech CSE',
      },
      faculty: {
        id: 'f-1',
        firstName: 'Grace',
        lastName: 'Hopper',
      },
    };

    expect(hodTimetableEntrySchema.safeParse(timetableEntry).success).toBe(true);
  });

  it('validates attendance summary', () => {
    const attendance = {
      overallAttendanceRate: 85,
      totalSessionsRecorded: 140,
      lowAttendanceWarningCount: 2,
      recentSessions: [
        {
          id: 'sess-1',
          date: '2026-09-25',
          subjectCode: 'CS301',
          subjectName: 'Operating Systems',
          facultyName: 'Dr. John Doe',
          presentCount: 54,
          totalCount: 60,
          percentage: 90,
        },
      ],
    };

    expect(hodAttendanceSummarySchema.safeParse(attendance).success).toBe(true);
  });

  it('validates promotion batch schema', () => {
    const batch = {
      id: 'batch-1',
      academicYear: {
        id: 'ay-2025',
        label: '2025-2026',
      },
      program: {
        id: 'p-1',
        code: 'BTECH_CSE',
        name: 'B.Tech CSE',
      },
      fromSemester: 4,
      toSemester: 5,
      totalStudents: 60,
      promotedCount: 58,
      detainedCount: 2,
      promotedAt: '2026-06-15T10:00:00.000Z',
    };

    expect(hodPromotionBatchSchema.safeParse(batch).success).toBe(true);
  });

  it('validates creation inputs', () => {
    const validAssignment = {
      subjectOfferingId: '123e4567-e89b-12d3-a456-426614174000',
      subjectComponentId: '123e4567-e89b-12d3-a456-426614174001',
      facultyUserId: '123e4567-e89b-12d3-a456-426614174002',
    };
    expect(createHodFacultyAssignmentSchema.safeParse(validAssignment).success).toBe(true);

    const invalidAssignment = {
      subjectOfferingId: 'not-a-uuid',
      subjectComponentId: '123e4567-e89b-12d3-a456-426614174001',
      facultyUserId: '123e4567-e89b-12d3-a456-426614174002',
    };
    expect(createHodFacultyAssignmentSchema.safeParse(invalidAssignment).success).toBe(false);

    const validTimetable = {
      facultyAssignmentId: '123e4567-e89b-12d3-a456-426614174000',
      roomId: '123e4567-e89b-12d3-a456-426614174001',
      timeSlotId: '123e4567-e89b-12d3-a456-426614174002',
      effectiveFrom: '2026-09-01',
    };
    expect(createHodTimetableEntrySchema.safeParse(validTimetable).success).toBe(true);
  });

  it('validates course offering schema with components', () => {
    const offering = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      academicYear: {
        id: '123e4567-e89b-12d3-a456-426614174001',
        label: '2026-2027',
      },
      subject: {
        id: '123e4567-e89b-12d3-a456-426614174002',
        code: 'CS301',
        name: 'Data Structures and Algorithms',
        isElective: false,
      },
      program: {
        id: '123e4567-e89b-12d3-a456-426614174003',
        code: 'BTECH_CSE',
        name: 'B.Tech CSE',
      },
      semesterNumber: 3,
      components: [
        {
          id: '123e4567-e89b-12d3-a456-426614174004',
          type: 'THEORY',
          credits: 3,
          hoursPerWeek: 3,
          isAssigned: true,
          assignedFaculty: {
            id: '123e4567-e89b-12d3-a456-426614174005',
            firstName: 'Alan',
            lastName: 'Turing',
            name: 'Alan Turing',
            email: 'alan@hvpm.ac.in',
          },
        },
        {
          id: '123e4567-e89b-12d3-a456-426614174006',
          type: 'PRACTICAL',
          credits: 2,
          hoursPerWeek: 4,
          isAssigned: false,
          assignedFaculty: null,
        },
      ],
    };

    expect(hodCourseOfferingSchema.safeParse(offering).success).toBe(true);
  });
});
