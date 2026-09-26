import { z } from 'zod';

export const hodProfileSchema = z.object({
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
  role: z
    .object({
      key: z.string(),
      displayName: z.string(),
    })
    .default({
      key: 'hod',
      displayName: 'Head of Department',
    }),
  activeAcademicYear: z
    .object({
      id: z.string(),
      label: z.string(),
      startDate: z.string(),
      endDate: z.string(),
    })
    .nullable(),
  isAssociated: z.boolean(),
  message: z.string().nullable().optional(),
});
export type HodProfile = z.infer<typeof hodProfileSchema>;

export const hodOverviewSchema = z.object({
  department: z.object({
    id: z.string(),
    name: z.string(),
    code: z.string(),
    status: z.string(),
  }),
  metrics: z.object({
    totalPrograms: z.number(),
    totalFaculty: z.number(),
    totalStudents: z.number(),
    activeSubjects: z.number(),
    todayClassesCount: z.number(),
    attendanceRate: z.number(),
  }),
  programs: z.array(
    z.object({
      id: z.string(),
      code: z.string(),
      name: z.string(),
      durationYears: z.number(),
      curriculumCount: z.number(),
    }),
  ),
  recentLectures: z.array(
    z.object({
      id: z.string(),
      date: z.string(),
      startTime: z.string(),
      endTime: z.string(),
      status: z.string(),
      subjectCode: z.string(),
      subjectName: z.string(),
      facultyName: z.string(),
      roomName: z.string(),
    }),
  ),
});
export type HodOverview = z.infer<typeof hodOverviewSchema>;

export const hodFacultyMemberSchema = z.object({
  userId: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string(),
  avatarUrl: z.string().nullable(),
  designation: z.string(),
  roleKey: z.string(),
  assignmentCount: z.number(),
  assignedSubjects: z.array(
    z.object({
      subjectCode: z.string(),
      subjectName: z.string(),
      componentType: z.string(),
      programCode: z.string(),
    }),
  ),
});
export type HodFacultyMember = z.infer<typeof hodFacultyMemberSchema>;

export const hodStudentSchema = z.object({
  id: z.string(),
  rollNumber: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string(),
  avatarUrl: z.string().nullable(),
  program: z.object({
    id: z.string(),
    code: z.string(),
    name: z.string(),
  }),
  currentSemester: z.number().nullable(),
  status: z.string(),
  admissionDate: z.string(),
});
export type HodStudent = z.infer<typeof hodStudentSchema>;

export const hodStudentsListSchema = z.object({
  students: z.array(hodStudentSchema),
  page: z.number(),
  limit: z.number(),
  totalPages: z.number(),
});
export type HodStudentsList = z.infer<typeof hodStudentsListSchema>;

export const hodTimetableEntrySchema = z.object({
  id: z.string(),
  dayOfWeek: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  room: z.object({
    id: z.string(),
    name: z.string(),
    type: z.string(),
  }),
  subject: z.object({
    id: z.string(),
    code: z.string(),
    name: z.string(),
  }),
  componentType: z.string(),
  program: z.object({
    id: z.string(),
    code: z.string(),
    name: z.string(),
  }),
  faculty: z.object({
    id: z.string(),
    firstName: z.string(),
    lastName: z.string(),
  }),
});
export type HodTimetableEntry = z.infer<typeof hodTimetableEntrySchema>;

export const hodAttendanceSummarySchema = z.object({
  overallAttendanceRate: z.number(),
  totalSessionsRecorded: z.number(),
  lowAttendanceWarningCount: z.number(),
  recentSessions: z.array(
    z.object({
      id: z.string(),
      date: z.string(),
      subjectCode: z.string(),
      subjectName: z.string(),
      facultyName: z.string(),
      presentCount: z.number(),
      totalCount: z.number(),
      percentage: z.number(),
    }),
  ),
});
export type HodAttendanceSummary = z.infer<typeof hodAttendanceSummarySchema>;

export const hodPromotionBatchSchema = z.object({
  id: z.string(),
  academicYear: z.object({
    id: z.string(),
    label: z.string(),
  }),
  program: z.object({
    id: z.string(),
    code: z.string(),
    name: z.string(),
  }),
  fromSemester: z.number(),
  toSemester: z.number(),
  totalStudents: z.number(),
  promotedCount: z.number(),
  detainedCount: z.number(),
  promotedAt: z.string(),
});
export type HodPromotionBatch = z.infer<typeof hodPromotionBatchSchema>;

export const hodCourseOfferingComponentSchema = z.object({
  id: z.string(),
  type: z.string(),
  credits: z.number(),
  hoursPerWeek: z.number(),
  isAssigned: z.boolean(),
  assignedFaculty: z
    .object({
      id: z.string(),
      firstName: z.string(),
      lastName: z.string(),
      name: z.string(),
      email: z.string(),
    })
    .nullable(),
});
export type HodCourseOfferingComponent = z.infer<typeof hodCourseOfferingComponentSchema>;

export const hodCourseOfferingSchema = z.object({
  id: z.string(),
  academicYear: z.object({
    id: z.string(),
    label: z.string(),
  }),
  subject: z.object({
    id: z.string(),
    code: z.string(),
    name: z.string(),
    isElective: z.boolean(),
  }),
  program: z.object({
    id: z.string(),
    code: z.string(),
    name: z.string(),
  }),
  semesterNumber: z.number(),
  components: z.array(hodCourseOfferingComponentSchema),
});
export type HodCourseOffering = z.infer<typeof hodCourseOfferingSchema>;

export const createHodFacultyAssignmentSchema = z.object({
  subjectOfferingId: z.string().uuid(),
  subjectComponentId: z.string().uuid(),
  facultyUserId: z.string().uuid(),
});
export type CreateHodFacultyAssignmentInput = z.infer<typeof createHodFacultyAssignmentSchema>;

export const createHodTimetableEntrySchema = z.object({
  facultyAssignmentId: z.string().uuid(),
  roomId: z.string().uuid(),
  timeSlotId: z.string().uuid(),
  dayOfWeek: z.enum(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY']).optional(),
  effectiveFrom: z.string(),
  effectiveTo: z.string().nullable().optional(),
});
export type CreateHodTimetableEntryInput = z.infer<typeof createHodTimetableEntrySchema>;

export const hodTimetableSchedulingOptionsSchema = z.object({
  facultyAssignments: z.array(
    z.object({
      id: z.string(),
      faculty: z.object({
        id: z.string(),
        firstName: z.string(),
        lastName: z.string(),
        name: z.string(),
        email: z.string(),
      }),
      subject: z.object({
        id: z.string(),
        code: z.string(),
        name: z.string(),
      }),
      component: z.object({
        id: z.string(),
        type: z.string(),
        hoursPerWeek: z.number(),
      }),
      program: z.object({
        id: z.string(),
        code: z.string(),
        name: z.string(),
      }),
      semesterNumber: z.number(),
    }),
  ),
  rooms: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      type: z.string(),
      capacity: z.number(),
    }),
  ),
  timeSlots: z.array(
    z.object({
      id: z.string(),
      dayOfWeek: z.enum(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY']),
      startTime: z.string(),
      endTime: z.string(),
      label: z.string(),
    }),
  ),
});
export type HodTimetableSchedulingOptions = z.infer<typeof hodTimetableSchedulingOptionsSchema>;
