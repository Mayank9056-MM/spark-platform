import { z } from 'zod';

export const studentProfileSchema = z.object({
  id: z.string(),
  userId: z.string(),
  rollNumber: z.string(),
  admissionDate: z.string(),
  status: z.string(),
  user: z.object({
    id: z.string(),
    firstName: z.string(),
    middleName: z.string().nullable(),
    lastName: z.string(),
    email: z.string().email(),
    phone: z.string().nullable(),
    avatarUrl: z.string().nullable(),
  }),
  program: z.object({
    id: z.string(),
    name: z.string(),
    code: z.string(),
    durationYears: z.number(),
    totalSemesters: z.number(),
  }),
  department: z.object({
    id: z.string(),
    name: z.string(),
    code: z.string(),
  }),
  curriculumVersion: z.object({
    id: z.string(),
    label: z.string(),
    status: z.string(),
  }),
  admission: z.object({
    id: z.string(),
    admissionNumber: z.string(),
    admissionDate: z.string(),
    admissionType: z.string(),
    quota: z.string(),
  }),
  currentSemester: z
    .object({
      id: z.string(),
      number: z.number(),
      status: z.string(),
      academicYearLabel: z.string(),
      academicYearId: z.string(),
    })
    .nullable(),
});
export type StudentProfile = z.infer<typeof studentProfileSchema>;

export const updateStudentProfileSchema = z.object({
  phone: z
    .string()
    .trim()
    .regex(/^\+?[1-9]\d{1,14}$/, 'Must be in valid E.164 phone format (e.g. +919876543210)')
    .nullable()
    .optional(),
});
export type UpdateStudentProfileInput = z.infer<typeof updateStudentProfileSchema>;

export const studentAcademicsSchema = z.object({
  program: z.object({
    id: z.string(),
    name: z.string(),
    code: z.string(),
    durationYears: z.number(),
    totalSemesters: z.number(),
  }),
  department: z.object({
    id: z.string(),
    name: z.string(),
    code: z.string(),
  }),
  curriculumVersion: z.object({
    id: z.string(),
    label: z.string(),
    status: z.string(),
  }),
  currentSemester: z
    .object({
      id: z.string(),
      number: z.number(),
      academicYearLabel: z.string(),
      status: z.string(),
    })
    .nullable(),
  allSemesters: z.array(
    z.object({
      number: z.number(),
      catalogId: z.string(),
      totalSubjects: z.number(),
      totalCredits: z.number(),
      isCurrent: z.boolean(),
    }),
  ),
});
export type StudentAcademics = z.infer<typeof studentAcademicsSchema>;

export const studentSubjectComponentSchema = z.object({
  id: z.string(),
  type: z.string(),
  credits: z.number(),
  hoursPerWeek: z.number(),
});
export type StudentSubjectComponent = z.infer<typeof studentSubjectComponentSchema>;

export const studentSubjectSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  isElective: z.boolean(),
  electiveGroupName: z.string().nullable(),
  credits: z.number(),
  components: z.array(studentSubjectComponentSchema),
});
export type StudentSubject = z.infer<typeof studentSubjectSchema>;

export const attendanceRecordItemSchema = z.object({
  id: z.string(),
  date: z.string(),
  subjectCode: z.string(),
  subjectName: z.string(),
  componentType: z.string(),
  status: z.enum(['PRESENT', 'ABSENT', 'EXCUSED', 'LATE']),
});
export type AttendanceRecordItem = z.infer<typeof attendanceRecordItemSchema>;

export const subjectAttendanceSchema = z.object({
  subjectId: z.string(),
  subjectCode: z.string(),
  subjectName: z.string(),
  totalSessions: z.number(),
  presentSessions: z.number(),
  absentSessions: z.number(),
  percentage: z.number(),
});
export type SubjectAttendance = z.infer<typeof subjectAttendanceSchema>;

export const studentAttendanceSummarySchema = z.object({
  overall: z.object({
    totalSessions: z.number(),
    presentSessions: z.number(),
    absentSessions: z.number(),
    percentage: z.number(),
  }),
  bySubject: z.array(subjectAttendanceSchema),
  recentRecords: z.array(attendanceRecordItemSchema),
});
export type StudentAttendanceSummary = z.infer<typeof studentAttendanceSummarySchema>;

export const studentTimetableEntrySchema = z.object({
  id: z.string(),
  dayOfWeek: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  subjectCode: z.string(),
  subjectName: z.string(),
  componentType: z.string(),
  roomName: z.string(),
  facultyName: z.string(),
});
export type StudentTimetableEntry = z.infer<typeof studentTimetableEntrySchema>;

export const studentEnrollmentHistoryItemSchema = z.object({
  id: z.string(),
  semesterNumber: z.number(),
  academicYearLabel: z.string(),
  attemptNumber: z.number(),
  status: z.string(),
  startedAt: z.string(),
});
export type StudentEnrollmentHistoryItem = z.infer<typeof studentEnrollmentHistoryItemSchema>;

export const studentPromotionDecisionItemSchema = z.object({
  id: z.string(),
  decision: z.string(),
  fromSemesterNumber: z.number(),
  toSemesterNumber: z.number().nullable(),
  remarks: z.string().nullable(),
  decidedAt: z.string(),
});
export type StudentPromotionDecisionItem = z.infer<typeof studentPromotionDecisionItemSchema>;

export const studentProgressSchema = z.object({
  enrollmentHistory: z.array(studentEnrollmentHistoryItemSchema),
  promotionDecisions: z.array(studentPromotionDecisionItemSchema),
});
export type StudentProgress = z.infer<typeof studentProgressSchema>;
