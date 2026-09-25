import type { AuditLog, User } from '@spark/database/client';

import type { AuditLogActorDTO, AuditLogDTO } from './audit.types.js';

const SENSITIVE_KEYS = new Set([
  'password',
  'passwordhash',
  'token',
  'refreshtoken',
  'tokenhash',
  'secret',
  'apikey',
  'accesstoken',
]);

/**
 * Defensively sanitizes JSON values in audit snapshots so sensitive credentials
 * or token hashes never leak to the client even if inadvertently persisted in audit history.
 */
function sanitizeJsonValue(value: unknown): Record<string, unknown> | null {
  if (value === null || typeof value !== 'object') {
    return null;
  }

  if (Array.isArray(value)) {
    return { items: value.map((item) => sanitizeJsonValue(item)) };
  }

  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      result[key] = '[REDACTED]';
    } else if (val !== null && typeof val === 'object') {
      result[key] = sanitizeJsonValue(val);
    } else {
      result[key] = val;
    }
  }

  return result;
}

export type AuditLogRow = AuditLog & {
  actor?: Pick<User, 'id' | 'firstName' | 'lastName' | 'email' | 'avatarUrl'> | null;
};

export function toAuditLogActorDTO(
  actor: Pick<User, 'id' | 'firstName' | 'lastName' | 'email' | 'avatarUrl'> | null | undefined,
): AuditLogActorDTO | null {
  if (!actor) return null;
  return {
    id: actor.id,
    firstName: actor.firstName,
    lastName: actor.lastName,
    email: actor.email,
    avatarUrl: actor.avatarUrl,
  };
}

export function toAuditLogDTO(row: AuditLogRow): AuditLogDTO {
  return {
    id: row.id,
    actorUserId: row.actorUserId,
    actor: toAuditLogActorDTO(row.actor),
    action: row.action,
    entityType: row.entityType,
    entityId: row.entityId,
    oldValue: sanitizeJsonValue(row.oldValue),
    newValue: sanitizeJsonValue(row.newValue),
    requestId: row.requestId,
    ipAddress: row.ipAddress,
    userAgent: row.userAgent,
    createdAt: row.createdAt,
  };
}

export function toAuditLogDTOList(rows: AuditLogRow[]): AuditLogDTO[] {
  return rows.map(toAuditLogDTO);
}
