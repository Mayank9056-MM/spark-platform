import type { AuditAction, Prisma } from '@spark/database';

export enum AuditEntityType {
  USER = 'User',
  STUDENT = 'Student',
  FACULTY = 'Faculty',
  ATTENDANCE = 'Attendance',
  ASSIGNMENT = 'Assignment',
  NOTICE = 'Notice',
  SESSION = 'Session',
  ROLE = 'Role',
  ROLE_ASSIGNMENT = 'RoleAssignment',
  PERMISSION = 'Permission',
  DEPARTMENT = 'Department',
  // Added for the Program domain (Department -> Program in the academic
  // hierarchy). Program's audit policy mirrors Department's exactly:
  // transactional CREATE/UPDATE/DELETE, no audit on routine reads. See
  // program.service.ts.
  PROGRAM = 'Program',
  CURRICULUM_VERSION = 'CURRICULUM_VERSION',
  SEMESTER_CATALOG = 'SemesterCatalog',
  SUBJECT = 'Subject',
  ELECTIVE_GROUP = 'ElectiveGroup',
  ACADEMIC_YEAR = 'AcademicYear',
  ADMISSION = 'Admission', // pre-existing gap — createAdmission already needed this
  STUDENT_ENROLLMENT = 'StudentEnrollment',
  SEMESTER_ENROLLMENT = 'SemesterEnrollment', // pre-existing gap — createSemesterEnrollment already needed this
  PROMOTION_BATCH = 'PromotionBatch',
  PROMOTION_DECISION = 'PromotionDecision',
  SUBJECT_OFFERING = 'SubjectOffering',
  TIMETABLE = 'Timetable',
  LECTURE = 'Lecture',
}

export interface RecordAuditInput {
  actorUserId: string | null;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  oldValue?: Prisma.InputJsonValue | null;
  newValue?: Prisma.InputJsonValue | null;
  /**
   * Correlates this audit row to the HTTP request that produced it. Optional
   * on the input type because record()/recordTx() below fill it in
   * automatically from the current AsyncLocalStorage log context when the
   * caller doesn't supply one explicitly — callers only need to pass it for
   * events recorded outside a request (a scheduled job, a migration script).
   */
  requestId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface AuditLogActorDTO {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl: string | null;
}

export interface AuditLogDTO {
  id: string;
  actorUserId: string | null;
  actor: AuditLogActorDTO | null;
  action: AuditAction;
  entityType: string;
  entityId: string;
  oldValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  requestId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
}

export interface ListAuditLogsFilters {
  actorUserId?: string | undefined;
  action?: AuditAction | undefined;
  entityType?: string | undefined;
  entityId?: string | undefined;
  dateFrom?: Date | undefined;
  dateTo?: Date | undefined;
  search?: string | undefined;
}

export interface ListAuditLogsOptions {
  page: number;
  limit: number;
  sortOrder?: 'asc' | 'desc' | undefined;
}

export interface ListAuditLogsResult {
  logs: AuditLogDTO[];
  total: number;
}
