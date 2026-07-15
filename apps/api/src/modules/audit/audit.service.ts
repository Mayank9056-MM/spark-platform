import { auditLogger } from '../../lib/logger.js';

import { auditRepository } from './audit.repository.js';
import type { RecordAuditInput } from './audit.types.js';

/**
 * Fire-and-forget by design: a failure writing the audit trail must never
 * block or fail the business operation it's recording — a login shouldn't
 * fail because the audit table had a hiccup. The failure is logged loudly
 * instead, so it's visible in monitoring even though it doesn't propagate.
 *
 * Revisit this if a compliance requirement ever demands audit writes be
 * transactional with the action itself (all-or-nothing) — not needed yet.
 */
export async function recordAudit(input: RecordAuditInput): Promise<void> {
  try {
    await auditRepository.create(input);
  } catch (err) {
    auditLogger.error('Failed to write audit log entry', {
      err,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
    });
  }
}
