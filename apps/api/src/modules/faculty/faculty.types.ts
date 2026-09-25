// apps/api/src/modules/faculty/faculty.types.ts

import type {
  AttendanceSessionStatus,
  AttendanceStatus,
  DayOfWeek,
  LectureStatus,
  SubjectComponentType,
} from '@spark/database';

export interface FacultyProfileDTO {
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
  activeAcademicYear: {
    id: string;
    label: string;
    startDate: string;
    endDate: string;
  } | null;
  workload: {
    assignedSubjectsCount: number;
    totalWeeklyHours: number;
    todayLecturesCount: number;
    upcomingLecturesCount: number;
    completedLecturesCount: number;
  };
}

export interface FacultyAssignmentDTO {
  id: string;
  subjectOfferingId: string;
  subjectComponentId: string;
  subject: {
    id: string;
    code: string;
    name: string;
    isElective: boolean;
  };
  component: {
    id: string;
    type: SubjectComponentType;
    credits: number;
    hoursPerWeek: number;
  };
  semesterCatalog: {
    id: string;
    number: number;
  };
  program: {
    id: string;
    name: string;
    code: string;
  };
  department: {
    id: string;
    name: string;
    code: string;
  };
  academicYear: {
    id: string;
    label: string;
  };
  weeklySlotsCount: number;
  totalLecturesCount: number;
}

export interface FacultyTimetableEntryDTO {
  id: string;
  dayOfWeek: DayOfWeek;
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  room: {
    id: string;
    name: string;
    type: string;
    capacity: number;
  };
  subject: {
    id: string;
    code: string;
    name: string;
  };
  component: {
    id: string;
    type: SubjectComponentType;
  };
  semesterCatalog: {
    id: string;
    number: number;
  };
  academicYear: {
    id: string;
    label: string;
  };
  facultyAssignmentId: string;
}

export interface FacultyAttendanceSessionSummaryDTO {
  id: string;
  status: AttendanceSessionStatus;
  takenByUserId: string;
  lockedAt: string | null;
  totalRecords: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  excusedCount: number;
}

export interface FacultyLectureDTO {
  id: string;
  scheduledDate: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  status: LectureStatus;
  subject: {
    id: string;
    code: string;
    name: string;
  };
  component: {
    id: string;
    type: SubjectComponentType;
  };
  room: {
    id: string;
    name: string;
    type: string;
  };
  semesterCatalog: {
    id: string;
    number: number;
  };
  academicYear: {
    id: string;
    label: string;
  };
  facultyAssignmentId: string;
  attendanceSession: FacultyAttendanceSessionSummaryDTO | null;
}

export interface FacultyRosterStudentDTO {
  semesterEnrollmentId: string;
  studentEnrollmentId: string;
  rollNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl: string | null;
  attendanceStatus: AttendanceStatus | null;
  attendanceRecordId: string | null;
}

export interface FacultyLectureRosterDTO {
  lecture: FacultyLectureDTO;
  students: FacultyRosterStudentDTO[];
  session: {
    id: string;
    status: AttendanceSessionStatus;
    lockedAt: string | null;
  } | null;
  metrics: {
    totalEnrolled: number;
    markedCount: number;
    presentCount: number;
    absentCount: number;
    lateCount: number;
    excusedCount: number;
  };
}

export interface SubmitAttendanceRecordInput {
  semesterEnrollmentId: string;
  status: AttendanceStatus;
}

export interface SubmitAttendanceInput {
  records: SubmitAttendanceRecordInput[];
  lockSession?: boolean | undefined;
}

export interface ListFacultyLecturesFilters {
  date?: string | undefined;
  startDate?: string | undefined;
  endDate?: string | undefined;
  status?: LectureStatus | undefined;
}

export interface FacultyAttendanceSummaryDTO {
  totalLectures: number;
  completedLectures: number;
  scheduledLectures: number;
  cancelledLectures: number;
  sessionsRecorded: number;
  sessionsLocked: number;
  overallAttendancePercentage: number;
  bySubject: {
    subjectId: string;
    subjectCode: string;
    subjectName: string;
    totalLectures: number;
    completedLectures: number;
    attendanceRate: number;
  }[];
}
