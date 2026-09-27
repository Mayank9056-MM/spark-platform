// apps/api/src/modules/hod/hod.types.ts

export interface HodProfileDTO {
  user: {
    id: string;
    email: string;
    firstName: string;
    middleName: string | null;
    lastName: string;
    avatarUrl: string | null;
    status: string;
  };
  department: {
    id: string;
    name: string;
    code: string;
  } | null;
  role: {
    key: string;
    displayName: string;
  };
  isAssociated: boolean;
  activeAcademicYear: {
    id: string;
    label: string;
    startDate: string;
    endDate: string;
    isActive: boolean;
  } | null;
  message: string | null;
}

export interface HodOverviewMetrics {
  totalPrograms: number;
  totalFaculty: number;
  totalStudents: number;
  activeSubjects: number;
  totalActiveSubjects: number;
  todayClassesCount: number;
  todayLectures: number;
  attendanceRate: number;
  pendingPromotions: number;
}

export interface HodOverviewDTO {
  department: {
    id: string;
    name: string;
    code: string;
    status: string;
  };
  academicYear: {
    id: string;
    label: string;
    startDate: string;
    endDate: string;
    isActive: boolean;
  };
  metrics: HodOverviewMetrics;
  programs: {
    id: string;
    code: string;
    name: string;
    durationYears: number;
    curriculumCount: number;
  }[];
  recentLectures: {
    id: string;
    date: string;
    startTime: string;
    endTime: string;
    status: string;
    subjectCode: string;
    subjectName: string;
    facultyName: string;
    roomName: string;
  }[];
}

export interface HodFacultyMemberDTO {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl: string | null;
  designation: string;
  roleKey: string;
  assignmentCount: number;
  assignedSubjects: {
    subjectCode: string;
    subjectName: string;
    componentType: string;
    programCode: string;
  }[];
}

export interface HodStudentDTO {
  id: string;
  rollNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl: string | null;
  program: {
    id: string;
    name: string;
    code: string;
  };
  currentSemester: number | null;
  status: string;
  admissionDate: string;
}

export interface ListHodStudentsFilters {
  programId?: string | undefined;
  status?: string | undefined;
  search?: string | undefined;
  page?: number | undefined;
  limit?: number | undefined;
}

export interface ListHodStudentsResult {
  students: HodStudentDTO[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface HodTimetableEntryDTO {
  id: string;
  dayOfWeek: 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY';
  startTime: string;
  endTime: string;
  room: {
    id: string;
    name: string;
    type: string;
  };
  subject: {
    id: string;
    code: string;
    name: string;
  };
  componentType: string;
  program: {
    id: string;
    name: string;
    code: string;
  };
  semesterNumber: number;
  faculty: {
    id: string;
    firstName: string;
    lastName: string;
    name?: string;
  };
}

export interface HodAttendanceSummaryDTO {
  overallAttendanceRate: number;
  overallAttendancePercentage: number;
  totalSessionsRecorded: number;
  totalSessions: number;
  lockedSessions: number;
  lowAttendanceWarningCount: number;
  subjectBreakdown: {
    subjectId: string;
    subjectCode: string;
    subjectName: string;
    totalSessions: number;
    attendancePercentage: number;
  }[];
  recentSessions: {
    id: string;
    date: string;
    lectureDate?: string;
    subjectCode: string;
    subjectName: string;
    facultyName: string;
    status?: string;
    presentCount: number;
    totalCount: number;
    totalStudents?: number;
    percentage: number;
  }[];
}

export interface HodPromotionBatchDTO {
  id: string;
  academicYear: {
    id: string;
    label: string;
  };
  program: {
    id: string;
    code: string;
    name: string;
  };
  fromSemester: number;
  toSemester: number;
  totalStudents: number;
  promotedCount: number;
  detainedCount: number;
  promotedAt: string;
  academicYearLabel?: string;
  semesterCatalogNumber?: number;
  programName?: string;
  programCode?: string;
  status?: string;
  createdAt?: string;
  totalDecisions?: number;
}

export interface CreateDepartmentFacultyAssignmentInput {
  subjectOfferingId: string;
  subjectComponentId: string;
  facultyUserId: string;
}

export interface CreateDepartmentTimetableInput {
  facultyAssignmentId: string;
  roomId: string;
  timeSlotId: string;
  dayOfWeek: 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY';
  effectiveFrom: string;
  effectiveTo?: string | null | undefined;
}

export interface HodCourseOfferingComponentDTO {
  id: string;
  type: string;
  credits: number;
  hoursPerWeek: number;
  isAssigned: boolean;
  assignedFaculty: {
    id: string;
    firstName: string;
    lastName: string;
    name: string;
    email: string;
  } | null;
}

export interface HodCourseOfferingDTO {
  id: string;
  academicYear: {
    id: string;
    label: string;
  };
  subject: {
    id: string;
    code: string;
    name: string;
    isElective: boolean;
  };
  program: {
    id: string;
    code: string;
    name: string;
  };
  semesterNumber: number;
  components: HodCourseOfferingComponentDTO[];
}

export interface HodTimetableSchedulingOptionsDTO {
  facultyAssignments: {
    id: string;
    faculty: {
      id: string;
      firstName: string;
      lastName: string;
      name: string;
      email: string;
    };
    subject: {
      id: string;
      code: string;
      name: string;
    };
    component: {
      id: string;
      type: string;
      hoursPerWeek: number;
    };
    program: {
      id: string;
      code: string;
      name: string;
    };
    semesterNumber: number;
  }[];
  rooms: {
    id: string;
    name: string;
    type: string;
    capacity: number;
  }[];
  timeSlots: {
    id: string;
    dayOfWeek: 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY';
    startTime: string;
    endTime: string;
    label: string;
  }[];
}
