import { describe, expect, it } from 'vitest';

import {
  studentAcademicsSchema,
  studentAttendanceSummarySchema,
  studentProfileSchema,
  studentProgressSchema,
  studentSubjectSchema,
  studentTimetableEntrySchema,
  updateStudentProfileSchema,
} from './student.schema';

describe('Student Portal Schemas', () => {
  const validProfile = {
    id: 'e1fa5e6b-0b1a-4c2d-9867-27b2a95e2d67',
    userId: 'u1fa5e6b-0b1a-4c2d-9867-27b2a95e2d67',
    rollNumber: 'CS-2024-001',
    admissionDate: '2024-08-01T00:00:00.000Z',
    status: 'ACTIVE',
    user: {
      id: 'u1fa5e6b-0b1a-4c2d-9867-27b2a95e2d67',
      firstName: 'Rahul',
      middleName: 'S',
      lastName: 'Sharma',
      email: 'rahul.sharma@hvpm.ac.in',
      phone: '+919876543210',
      avatarUrl: null,
    },
    program: {
      id: 'p1fa5e6b-0b1a-4c2d-9867-27b2a95e2d67',
      name: 'Computer Science and Engineering',
      code: 'CSE',
      durationYears: 4,
      totalSemesters: 8,
    },
    department: {
      id: 'd1fa5e6b-0b1a-4c2d-9867-27b2a95e2d67',
      name: 'Department of Computer Science & Engineering',
      code: 'DCSE',
    },
    curriculumVersion: {
      id: 'c1fa5e6b-0b1a-4c2d-9867-27b2a95e2d67',
      label: '2024 Scheme',
      status: 'ACTIVE',
    },
    admission: {
      id: 'a1fa5e6b-0b1a-4c2d-9867-27b2a95e2d67',
      admissionNumber: 'ADM-2024-001',
      admissionDate: '2024-08-01T00:00:00.000Z',
      admissionType: 'REGULAR',
      quota: 'GENERAL',
    },
    currentSemester: {
      id: 's1fa5e6b-0b1a-4c2d-9867-27b2a95e2d67',
      number: 4,
      status: 'IN_PROGRESS',
      academicYearLabel: '2025-26',
      academicYearId: 'y1fa5e6b-0b1a-4c2d-9867-27b2a95e2d67',
    },
  };

  describe('studentProfileSchema', () => {
    it('successfully parses a valid student profile DTO', () => {
      const parsed = studentProfileSchema.parse(validProfile);
      expect(parsed.rollNumber).toBe('CS-2024-001');
      expect(parsed.user.firstName).toBe('Rahul');
      expect(parsed.currentSemester?.number).toBe(4);
    });

    it('allows currentSemester to be null for pending semester enrollments', () => {
      const parsed = studentProfileSchema.parse({
        ...validProfile,
        currentSemester: null,
      });
      expect(parsed.currentSemester).toBeNull();
    });

    it('rejects an invalid email format', () => {
      expect(() =>
        studentProfileSchema.parse({
          ...validProfile,
          user: {
            ...validProfile.user,
            email: 'not-an-email',
          },
        }),
      ).toThrow();
    });
  });

  describe('updateStudentProfileSchema', () => {
    it('accepts a valid E.164 phone number', () => {
      const result = updateStudentProfileSchema.parse({ phone: '+919876543210' });
      expect(result.phone).toBe('+919876543210');
    });

    it('accepts null or omitted phone number', () => {
      expect(updateStudentProfileSchema.parse({ phone: null }).phone).toBeNull();
      expect(updateStudentProfileSchema.parse({}).phone).toBeUndefined();
    });

    it('rejects an invalid phone format', () => {
      expect(() => updateStudentProfileSchema.parse({ phone: 'invalid-phone' })).toThrow();
    });
  });

  describe('studentAcademicsSchema', () => {
    it('successfully parses academic program and semester catalogs', () => {
      const academicsData = {
        program: validProfile.program,
        department: validProfile.department,
        curriculumVersion: validProfile.curriculumVersion,
        currentSemester: {
          id: 'sem-1',
          number: 4,
          academicYearLabel: '2025-26',
          status: 'IN_PROGRESS',
        },
        allSemesters: [
          {
            number: 1,
            catalogId: 'cat-1',
            totalSubjects: 5,
            totalCredits: 20,
            isCurrent: false,
          },
          {
            number: 4,
            catalogId: 'cat-4',
            totalSubjects: 6,
            totalCredits: 22,
            isCurrent: true,
          },
        ],
      };

      const parsed = studentAcademicsSchema.parse(academicsData);
      expect(parsed.allSemesters).toHaveLength(2);
      expect(parsed.allSemesters[1]?.isCurrent).toBe(true);
    });
  });

  describe('studentSubjectSchema', () => {
    it('parses a course with its theory and lab components', () => {
      const subject = {
        id: 'sub-1',
        code: 'CS401',
        name: 'Database Management Systems',
        isElective: false,
        electiveGroupName: null,
        credits: 4,
        components: [
          { id: 'comp-1', type: 'THEORY', credits: 3, hoursPerWeek: 3 },
          { id: 'comp-2', type: 'PRACTICAL', credits: 1, hoursPerWeek: 2 },
        ],
      };

      const parsed = studentSubjectSchema.parse(subject);
      expect(parsed.code).toBe('CS401');
      expect(parsed.components).toHaveLength(2);
    });
  });

  describe('studentAttendanceSummarySchema', () => {
    it('parses overall, subject-wise, and session records', () => {
      const data = {
        overall: {
          totalSessions: 100,
          presentSessions: 85,
          absentSessions: 15,
          percentage: 85,
        },
        bySubject: [
          {
            subjectId: 'sub-1',
            subjectCode: 'CS401',
            subjectName: 'DBMS',
            totalSessions: 30,
            presentSessions: 27,
            absentSessions: 3,
            percentage: 90,
          },
        ],
        recentRecords: [
          {
            id: 'rec-1',
            date: '2026-03-20',
            subjectCode: 'CS401',
            subjectName: 'DBMS',
            componentType: 'THEORY',
            status: 'PRESENT' as const,
          },
        ],
      };

      const parsed = studentAttendanceSummarySchema.parse(data);
      expect(parsed.overall.percentage).toBe(85);
      expect(parsed.recentRecords[0]?.status).toBe('PRESENT');
    });
  });

  describe('studentTimetableEntrySchema', () => {
    it('validates a timetable slot entry', () => {
      const entry = {
        id: 'tt-1',
        dayOfWeek: 'MONDAY',
        startTime: '10:00',
        endTime: '11:00',
        subjectCode: 'CS401',
        subjectName: 'DBMS',
        componentType: 'THEORY',
        roomName: 'Lab 204',
        facultyName: 'Dr. Jane Doe',
      };

      const parsed = studentTimetableEntrySchema.parse(entry);
      expect(parsed.dayOfWeek).toBe('MONDAY');
      expect(parsed.roomName).toBe('Lab 204');
    });
  });

  describe('studentProgressSchema', () => {
    it('validates enrollment history and board promotion decisions', () => {
      const progress = {
        enrollmentHistory: [
          {
            id: 'se-1',
            semesterNumber: 1,
            academicYearLabel: '2024-25',
            attemptNumber: 1,
            status: 'COMPLETED',
            startedAt: '2024-08-01T00:00:00.000Z',
          },
          {
            id: 'se-2',
            semesterNumber: 2,
            academicYearLabel: '2024-25',
            attemptNumber: 1,
            status: 'COMPLETED',
            startedAt: '2025-01-05T00:00:00.000Z',
          },
        ],
        promotionDecisions: [
          {
            id: 'pd-1',
            decision: 'PROMOTED',
            fromSemesterNumber: 2,
            toSemesterNumber: 3,
            remarks: 'All credits cleared.',
            decidedAt: '2025-06-15T00:00:00.000Z',
          },
        ],
      };

      const parsed = studentProgressSchema.parse(progress);
      expect(parsed.enrollmentHistory).toHaveLength(2);
      expect(parsed.promotionDecisions[0]?.decision).toBe('PROMOTED');
    });
  });
});
