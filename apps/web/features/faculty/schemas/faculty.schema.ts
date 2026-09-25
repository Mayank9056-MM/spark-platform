import { z } from 'zod';

export const facultyProfileSchema = z.object({
  user: z.object({
    id: z.string(),
    email: z.string().email(),
    firstName: z.string(),
    middleName: z.string().nullable(),
    lastName: z.string(),
    avatarUrl: z.string().nullable(),
    status: z.string(),
  }),
  department: z
    .object({
      id: z.string(),
      name: z.string(),
      code: z.string(),
    })
    .nullable(),
  role: z.object({
    key: z.string(),
    displayName: z.string(),
  }),
  activeAcademicYear: z
    .object({
      id: z.string(),
      label: z.string(),
      startDate: z.string(),
      endDate: z.string(),
    })
    .nullable(),
  workload: z.object({
    assignedSubjectsCount: z.number(),
    totalWeeklyHours: z.number(),
    todayLecturesCount: z.number(),
    upcomingLecturesCount: z.number(),
    completedLecturesCount: z.number(),
  }),
});
export type FacultyProfile = z.infer<typeof facultyProfileSchema>;

export const facultyAssignmentSchema = z.object({
  id: z.string(),
  subjectOfferingId: z.string(),
  subjectComponentId: z.string(),
  subject: z.object({
    id: z.string(),
    code: z.string(),
    name: z.string(),
    isElective: z.boolean(),
  }),
  component: z.object({
    id: z.string(),
    type: z.enum(['THEORY', 'PRACTICAL', 'TUTORIAL', 'PROJECT']),
    credits: z.number(),
    hoursPerWeek: z.number(),
  }),
  semesterCatalog: z.object({
    id: z.string(),
    number: z.number(),
  }),
  program: z.object({
    id: z.string(),
    name: z.string(),
    code: z.string(),
  }),
  department: z.object({
    id: z.string(),
    name: z.string(),
    code: z.string(),
  }),
  academicYear: z.object({
    id: z.string(),
    label: z.string(),
  }),
  weeklySlotsCount: z.number(),
  totalLecturesCount: z.number(),
});
export type FacultyAssignment = z.infer<typeof facultyAssignmentSchema>;

export const facultyTimetableEntrySchema = z.object({
  id: z.string(),
  dayOfWeek: z.enum(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY']),
  startTime: z.string(),
  endTime: z.string(),
  room: z.object({
    id: z.string(),
    name: z.string(),
    type: z.string(),
    capacity: z.number(),
  }),
  subject: z.object({
    id: z.string(),
    code: z.string(),
    name: z.string(),
  }),
  component: z.object({
    id: z.string(),
    type: z.enum(['THEORY', 'PRACTICAL', 'TUTORIAL', 'PROJECT']),
  }),
  semesterCatalog: z.object({
    id: z.string(),
    number: z.number(),
  }),
  academicYear: z.object({
    id: z.string(),
    label: z.string(),
  }),
  facultyAssignmentId: z.string(),
});
export type FacultyTimetableEntry = z.infer<typeof facultyTimetableEntrySchema>;

export const facultyAttendanceSessionSummarySchema = z.object({
  id: z.string(),
  status: z.enum(['OPEN', 'LOCKED']),
  takenByUserId: z.string(),
  lockedAt: z.string().nullable(),
  totalRecords: z.number(),
  presentCount: z.number(),
  absentCount: z.number(),
  lateCount: z.number(),
  excusedCount: z.number(),
});
export type FacultyAttendanceSessionSummary = z.infer<typeof facultyAttendanceSessionSummarySchema>;

export const facultyLectureSchema = z.object({
  id: z.string(),
  scheduledDate: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  status: z.enum(['SCHEDULED', 'COMPLETED', 'CANCELLED']),
  subject: z.object({
    id: z.string(),
    code: z.string(),
    name: z.string(),
  }),
  component: z.object({
    id: z.string(),
    type: z.enum(['THEORY', 'PRACTICAL', 'TUTORIAL', 'PROJECT']),
  }),
  room: z.object({
    id: z.string(),
    name: z.string(),
    type: z.string(),
  }),
  semesterCatalog: z.object({
    id: z.string(),
    number: z.number(),
  }),
  academicYear: z.object({
    id: z.string(),
    label: z.string(),
  }),
  facultyAssignmentId: z.string(),
  attendanceSession: facultyAttendanceSessionSummarySchema.nullable(),
});
export type FacultyLecture = z.infer<typeof facultyLectureSchema>;

export const attendanceStatusSchema = z.enum(['PRESENT', 'ABSENT', 'LATE', 'EXCUSED']);
export type AttendanceStatus = z.infer<typeof attendanceStatusSchema>;

export const facultyRosterStudentSchema = z.object({
  semesterEnrollmentId: z.string(),
  studentEnrollmentId: z.string(),
  rollNumber: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string(),
  avatarUrl: z.string().nullable(),
  attendanceStatus: attendanceStatusSchema.nullable(),
  attendanceRecordId: z.string().nullable(),
});
export type FacultyRosterStudent = z.infer<typeof facultyRosterStudentSchema>;

export const facultyLectureRosterSchema = z.object({
  lecture: facultyLectureSchema,
  students: z.array(facultyRosterStudentSchema),
  session: z
    .object({
      id: z.string(),
      status: z.enum(['OPEN', 'LOCKED']),
      lockedAt: z.string().nullable(),
    })
    .nullable(),
  metrics: z.object({
    totalEnrolled: z.number(),
    markedCount: z.number(),
    presentCount: z.number(),
    absentCount: z.number(),
    lateCount: z.number(),
    excusedCount: z.number(),
  }),
});
export type FacultyLectureRoster = z.infer<typeof facultyLectureRosterSchema>;

export const submitAttendanceInputSchema = z.object({
  records: z.array(
    z.object({
      semesterEnrollmentId: z.string(),
      status: z.enum(['PRESENT', 'ABSENT', 'LATE', 'EXCUSED']),
    }),
  ),
  lockSession: z.boolean().optional(),
});
export type SubmitAttendanceInput = z.infer<typeof submitAttendanceInputSchema>;

export const facultyAttendanceSummarySchema = z.object({
  totalLectures: z.number(),
  completedLectures: z.number(),
  scheduledLectures: z.number(),
  cancelledLectures: z.number(),
  sessionsRecorded: z.number(),
  sessionsLocked: z.number(),
  overallAttendancePercentage: z.number(),
  bySubject: z.array(
    z.object({
      subjectId: z.string(),
      subjectCode: z.string(),
      subjectName: z.string(),
      totalLectures: z.number(),
      completedLectures: z.number(),
      attendanceRate: z.number(),
    }),
  ),
});
export type FacultyAttendanceSummary = z.infer<typeof facultyAttendanceSummarySchema>;
