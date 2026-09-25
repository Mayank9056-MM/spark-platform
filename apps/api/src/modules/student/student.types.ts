// apps/api/src/modules/student/student.types.ts

export interface StudentProfileDTO {
  readonly id: string;
  readonly userId: string;
  readonly rollNumber: string;
  readonly admissionDate: string;
  readonly status: string;
  readonly user: {
    readonly id: string;
    readonly firstName: string;
    readonly middleName: string | null;
    readonly lastName: string;
    readonly email: string;
    readonly phone: string | null;
    readonly avatarUrl: string | null;
  };
  readonly program: {
    readonly id: string;
    readonly name: string;
    readonly code: string;
    readonly durationYears: number;
    readonly totalSemesters: number;
  };
  readonly department: {
    readonly id: string;
    readonly name: string;
    readonly code: string;
  };
  readonly curriculumVersion: {
    readonly id: string;
    readonly label: string;
    readonly status: string;
  };
  readonly admission: {
    readonly id: string;
    readonly admissionNumber: string;
    readonly admissionDate: string;
    readonly admissionType: string;
    readonly quota: string;
  };
  readonly currentSemester: {
    readonly id: string;
    readonly number: number;
    readonly status: string;
    readonly academicYearLabel: string;
    readonly academicYearId: string;
  } | null;
}

export interface StudentAcademicsDTO {
  readonly program: {
    readonly id: string;
    readonly name: string;
    readonly code: string;
    readonly durationYears: number;
    readonly totalSemesters: number;
  };
  readonly department: {
    readonly id: string;
    readonly name: string;
    readonly code: string;
  };
  readonly curriculumVersion: {
    readonly id: string;
    readonly label: string;
    readonly status: string;
  };
  readonly currentSemester: {
    readonly id: string;
    readonly number: number;
    readonly academicYearLabel: string;
    readonly status: string;
  } | null;
  readonly allSemesters: {
    readonly number: number;
    readonly catalogId: string;
    readonly totalSubjects: number;
    readonly totalCredits: number;
    readonly isCurrent: boolean;
  }[];
}

export interface StudentSubjectComponentDTO {
  readonly id: string;
  readonly type: string;
  readonly credits: number;
  readonly hoursPerWeek: number;
}

export interface StudentSubjectDTO {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly isElective: boolean;
  readonly electiveGroupName: string | null;
  readonly credits: number;
  readonly components: StudentSubjectComponentDTO[];
}

export interface AttendanceRecordItemDTO {
  readonly id: string;
  readonly date: string;
  readonly subjectCode: string;
  readonly subjectName: string;
  readonly componentType: string;
  readonly status: 'PRESENT' | 'ABSENT' | 'EXCUSED' | 'LATE';
}

export interface SubjectAttendanceDTO {
  readonly subjectId: string;
  readonly subjectCode: string;
  readonly subjectName: string;
  readonly totalSessions: number;
  readonly presentSessions: number;
  readonly absentSessions: number;
  readonly percentage: number;
}

export interface StudentAttendanceSummaryDTO {
  readonly overall: {
    readonly totalSessions: number;
    readonly presentSessions: number;
    readonly absentSessions: number;
    readonly percentage: number;
  };
  readonly bySubject: SubjectAttendanceDTO[];
  readonly recentRecords: AttendanceRecordItemDTO[];
}

export interface StudentTimetableEntryDTO {
  readonly id: string;
  readonly dayOfWeek: string;
  readonly startTime: string;
  readonly endTime: string;
  readonly subjectCode: string;
  readonly subjectName: string;
  readonly componentType: string;
  readonly roomName: string;
  readonly facultyName: string;
}

export interface StudentProgressDTO {
  readonly enrollmentHistory: {
    readonly id: string;
    readonly semesterNumber: number;
    readonly academicYearLabel: string;
    readonly attemptNumber: number;
    readonly status: string;
    readonly startedAt: string;
  }[];
  readonly promotionDecisions: {
    readonly id: string;
    readonly decision: string;
    readonly fromSemesterNumber: number;
    readonly toSemesterNumber: number | null;
    readonly remarks: string | null;
    readonly decidedAt: string;
  }[];
}
