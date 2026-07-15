import type { AuditAction, Prisma } from '@spark/database';

export enum AuditEntityType {
  USER = 'USER',
  STUDENT = 'STUDENT',
  FACULTY = 'FACULTY',
  ATTENDANCE = 'ATTENDANCE',
  ASSIGNMENT = 'ASSIGNMENT',
  NOTICE = 'NOTICE',
  SESSION = 'SESSION',
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
