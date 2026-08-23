import type { Prisma } from '@spark/database';
import { getContext } from '@spark/shared/logger';

import { auditLogger } from '../../lib/logger.js';

import { auditRepository } from './audit.repository.js';
import type { RecordAuditInput } from './audit.types.js';

/**
 * Fills in requestId from the current AsyncLocalStorage log context when
 * the caller didn't supply one explicitly. Every module gets request
 * correlation for free (Phase 10's "requestId should be added and used
 * consistently") without having to thread getContext() through every call
 * site by hand.
 */
function withRequestId(input: RecordAuditInput): RecordAuditInput {
  if (input.requestId !== undefined) return input;
  return { ...input, requestId: getContext().requestId ?? null };
}

/**
 * Fire-and-forget by design — for LOW-CRITICALITY events only (routine
 * reads, non-security state changes). A failure writing the audit trail
 * here must never block or fail the business operation it's recording.
 * The failure is logged loudly instead, visible in monitoring even though
 * it doesn't propagate.
 *
 * Do NOT use this for security-sensitive/state-changing operations —
 * RoleAssignment changes, user deactivation, password events, promotion
 * finalization, attendance correction, organization setting changes. Those
 * MUST use recordTx() below so the business write and the audit write
 * succeed or fail together. This distinction is the actual policy asked
 * for in Phase 10/"Audit Failure Policy" — not a style preference.
 */
export async function recordAudit(input: RecordAuditInput): Promise<void> {
  const enriched = withRequestId(input);
  try {
    await auditRepository.create(enriched);
  } catch (err) {
    auditLogger.error('Failed to write audit log entry', {
      err,
      action: enriched.action,
      entityType: enriched.entityType,
      entityId: enriched.entityId,
    });
  }
}

/**
 * Transactional counterpart to recordAudit(). `tx` MUST be the same
 * Prisma.TransactionClient the caller is using for the business write(s) —
 * pass it straight from your `prisma.$transaction(async (tx) => { ... })`
 * callback. Because this runs inside that transaction, if the audit insert
 * fails, the whole transaction rolls back — the business operation does
 * NOT get to succeed with no audit trail, which is the entire point for
 * security-critical operations (Phase 10). Unlike recordAudit(), this
 * deliberately does NOT catch/swallow errors — a thrown error here MUST
 * propagate to abort the transaction.
 */
export async function recordAuditTx(
  tx: Prisma.TransactionClient,
  input: RecordAuditInput,
): Promise<void> {
  const enriched = withRequestId(input);
  await auditRepository.create(enriched, tx);
}
