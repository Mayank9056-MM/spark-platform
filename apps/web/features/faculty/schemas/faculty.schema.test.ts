import { describe, expect, it } from 'vitest';

import {
  facultyAssignmentSchema,
  facultyProfileSchema,
  facultyTimetableEntrySchema,
  submitAttendanceInputSchema,
} from './faculty.schema';

describe('faculty.schema', () => {
  it('validates a valid faculty profile', () => {
    const validProfile = {
      user: {
        id: 'u-1',
        email: 'prof.smith@hvpm.edu',
        firstName: 'John',
        middleName: null,
        lastName: 'Smith',
        avatarUrl: null,
        status: 'ACTIVE',
      },
      department: {
        id: 'dept-1',
        name: 'Information Technology',
        code: 'IT',
      },
      role: {
        key: 'faculty',
        displayName: 'Faculty',
      },
      activeAcademicYear: {
        id: 'ay-1',
        label: '2026-2027',
        startDate: '2026-07-01T00:00:00.000Z',
        endDate: '2027-06-30T00:00:00.000Z',
      },
      workload: {
        assignedSubjectsCount: 2,
        totalWeeklyHours: 8,
        todayLecturesCount: 1,
        upcomingLecturesCount: 4,
        completedLecturesCount: 12,
      },
    };

    const parsed = facultyProfileSchema.safeParse(validProfile);
    expect(parsed.success).toBe(true);
  });

  it('validates faculty assignment schema', () => {
    const validAssignment = {
      id: 'fa-1',
      subjectOfferingId: 'so-1',
      subjectComponentId: 'sc-1',
      subject: {
        id: 's-1',
        code: 'IT301',
        name: 'Database Management Systems',
        isElective: false,
      },
      component: {
        id: 'sc-1',
        type: 'THEORY',
        credits: 4,
        hoursPerWeek: 4,
      },
      semesterCatalog: {
        id: 'cat-1',
        number: 3,
      },
      program: {
        id: 'prog-1',
        name: 'B.Tech IT',
        code: 'IT',
      },
      department: {
        id: 'dept-1',
        name: 'Information Technology',
        code: 'IT',
      },
      academicYear: {
        id: 'ay-1',
        label: '2026-2027',
      },
      weeklySlotsCount: 2,
      totalLecturesCount: 16,
    };

    const parsed = facultyAssignmentSchema.safeParse(validAssignment);
    expect(parsed.success).toBe(true);
  });

  it('validates timetable entry schema', () => {
    const validTimetable = {
      id: 'tt-1',
      dayOfWeek: 'MONDAY',
      startTime: '10:00',
      endTime: '11:00',
      room: {
        id: 'r-1',
        name: 'Room 302',
        type: 'LECTURE_HALL',
        capacity: 60,
      },
      subject: {
        id: 's-1',
        code: 'IT301',
        name: 'Database Management Systems',
      },
      component: {
        id: 'sc-1',
        type: 'THEORY',
      },
      semesterCatalog: {
        id: 'cat-1',
        number: 3,
      },
      academicYear: {
        id: 'ay-1',
        label: '2026-2027',
      },
      facultyAssignmentId: 'fa-1',
    };

    const parsed = facultyTimetableEntrySchema.safeParse(validTimetable);
    expect(parsed.success).toBe(true);
  });

  it('validates submit attendance input schema', () => {
    const validSubmit = {
      records: [
        { semesterEnrollmentId: 'se-1', status: 'PRESENT' },
        { semesterEnrollmentId: 'se-2', status: 'ABSENT' },
      ],
      lockSession: true,
    };

    const parsed = submitAttendanceInputSchema.safeParse(validSubmit);
    expect(parsed.success).toBe(true);
  });

  it('rejects invalid attendance status in submission', () => {
    const invalidSubmit = {
      records: [{ semesterEnrollmentId: 'se-1', status: 'UNKNOWN_STATUS' }],
    };

    const parsed = submitAttendanceInputSchema.safeParse(invalidSubmit);
    expect(parsed.success).toBe(false);
  });
});
