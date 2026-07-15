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
  ORGANIZATION = 'Organization',
}

export interface RecordAuditInput {
  organizationId: string | null;
  actorUserId: string | null;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  oldValue?: Prisma.InputJsonValue | null;
  newValue?: Prisma.InputJsonValue | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}
