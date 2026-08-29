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
  DEPARTMENT = 'Department',
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
