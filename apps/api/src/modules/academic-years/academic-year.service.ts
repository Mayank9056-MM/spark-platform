// apps/api/src/modules/academic-years/academic-year.service.ts

import type { Prisma } from '@spark/database/client';

import { ApiError } from '../../common/errors/ApiError.js';
import { ErrorCode } from '../../common/errors/ErrorCodes.js';
import { academicYearLogger } from '../../lib/logger.js';
import { prisma } from '../../lib/prisma.js';
import { recordAuditTx } from '../audit/audit.service.js';
import { AuditEntityType } from '../audit/audit.types.js';

import { toAcademicYearDTO, toAcademicYearDTOList } from './academic-year.mapper.js';
import { academicYearRepository } from './academic-year.repository.js';
import type {
  AcademicYearDTO,
  AcademicYearId,
  CreateAcademicYearInput,
  ListAcademicYearsFilters,
  ListAcademicYearsOptions,
  ListAcademicYearsResult,
  UpdateAcademicYearInput,
} from './academic-year.types.js';

/**
 * Business-logic layer for the AcademicYear domain.
 *
 * This service owns:
 * - the startDate < endDate invariant, validated against the EFFECTIVE
 *   resulting state on both create and update (not just the changed field)
 * - label uniqueness messaging (fast-path only — @@unique([label]) is the
 *   final guarantee, surfaced as P2002 -> 409 by prisma-error.mapper.ts)
 * - the delete-eligibility rule: an AcademicYear may be physically deleted
 *   only when it is NOT active AND has no dependent records
 * - the one-active-year activation workflow (atomic deactivate-current /
 *   activate-target transition)
 * - transaction boundaries and audit coordination for every mutation
 * - DTO mapping
 *
 * This service does NOT: construct Prisma queries directly (that's
 * academic-year.repository.ts), make authorization decisions (RBAC
 * middleware, not here), perform HTTP validation (academic-year.
 * validation.ts), or introduce a soft-delete/status concept the schema
 * doesn't have.
 *
 * ── WHY ISACTIVE HAS NO PATH THROUGH updateAcademicYear ──────────────
 * `UpdateAcademicYearInput` (academic-year.types.ts) structurally excludes
 * `isActive`, and `academicYearRepository.update()` has no branch for it —
 * so this is enforced at two layers before this service even runs, not
 * just here. Activation is exposed as its own method,
 * `activateAcademicYear`, backed by the repository's narrowly-scoped
 * `updateActiveState`, never the generic `update`.
 *
 * ── DELETE RULE: "UNUSED" IS NOT "INACTIVE" ───────────────────────────
 * isActive=false does not mean deleted/archived/unusable — an inactive
 * year is ordinary historical data once anything references it. The only
 * two things that block a delete are (a) the year being the currently
 * active one, and (b) hasReferences() finding a dependent row across the
 * five referencing models. Neither condition implies the other, and both
 * are checked independently and unconditionally — see deleteAcademicYear.
 *
 * ── TRANSACTIONS ─────────────────────────────────────────────────────
 * create/update/delete/activate each run inside prisma.$transaction so the
 * mutation and its audit row commit or roll back together, matching
 * DepartmentService/ElectiveGroupService. get/list are plain repository
 * reads, never wrapped in a transaction. update/delete/activate all read
 * their target via findByIdTx INSIDE the transaction (never a pre-fetch
 * outside it), so the existence check, the audit oldValue snapshot, and
 * the mutation all observe one consistent row — same reasoning
 * DepartmentService documents for its own findByIdTx usage.
 *
 * ── ACTIVATION: WHY IT NEEDED A REPOSITORY EXTENSION ─────────────────
 * No sibling service in this codebase performs an atomic "flip A off,
 * flip B on" transition across two rows of the same table, so there was
 * no existing pattern to copy. The repository previously exposed only a
 * singleton-client findActive() and no isActive write path at all. Two
 * minimal, activation-only primitives were added: findActiveTx(tx) (a
 * transaction-aware active lookup — a pre-transaction findActive() read
 * would not see the transaction's own uncommitted state) and
 * updateActiveState(tx, id, isActive) (writes only isActive, deliberately
 * separate from the generic update() so ordinary PATCH stays structurally
 * incapable of activation). See academic-year.repository.ts.
 *
 * The database's `@@index([isActive])` is not a uniqueness constraint —
 * nothing at the schema level prevents two rows both being true. This
 * service provides at-most-one-active as an application/transaction-level
 * guarantee, not an absolute one: a concurrent transaction manually
 * setting isActive=true outside this service's activateAcademicYear path
 * is not something a transaction alone can prevent without a DB partial
 * unique index, which is out of scope here (see schema note below).
 *
 * ── AUDIT ─────────────────────────────────────────────────────────────
 * CREATE/UPDATE/DELETE/ACTIVATE all use recordAuditTx inside the same
 * transaction as their write, matching DepartmentService/
 * ElectiveGroupService's policy exactly. Reads are never audited.
 * Activation audits BOTH mutated rows when a currently-active year exists
 * (the deactivated year AND the newly-activated one) — an idempotent
 * no-op (target already active) writes no audit row at all, since nothing
 * was actually mutated.
 *
 * ── LOGGING ───────────────────────────────────────────────────────────
 * academicYearLogger emits one INFO log after each mutation's transaction
 * resolves successfully — never before, never on throw — carrying only
 * actorUserId/academicYearId, mirroring departmentLogger/
 * electiveGroupLogger. Routine reads are not logged.
 */
export class AcademicYearService {
  /**
   * Creates an AcademicYear. isActive is never accepted as input — the
   * database default (false) applies untouched; making a year current
   * happens only through activateAcademicYear.
   */
  async createAcademicYear(
    actorUserId: string,
    input: CreateAcademicYearInput,
  ): Promise<AcademicYearDTO> {
    const startDate = new Date(input.startDate);
    const endDate = new Date(input.endDate);
    if (startDate >= endDate) {
      throw ApiError.badRequest(
        'startDate must be strictly before endDate',
        ErrorCode.VALIDATION_ERROR,
      );
    }

    const labelTaken = await academicYearRepository.existsByLabel(input.label);
    if (labelTaken) {
      throw ApiError.conflict(
        'An academic year with this label already exists',
        ErrorCode.DUPLICATE_ENTRY,
      );
    }

    const academicYear = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const created = await academicYearRepository.create(tx, input);

      await recordAuditTx(tx, {
        actorUserId,
        action: 'CREATE',
        entityType: AuditEntityType.ACADEMIC_YEAR,
        entityId: created.id,
        newValue: {
          id: created.id,
          label: created.label,
          startDate: created.startDate.toISOString(),
          endDate: created.endDate.toISOString(),
          isActive: created.isActive,
        },
      });

      return created;
    });

    academicYearLogger.info('Academic year created', {
      actorUserId,
      academicYearId: academicYear.id,
    });

    return toAcademicYearDTO(academicYear);
  }

  /** Not audited — routine read. */
  async getAcademicYearById(id: AcademicYearId): Promise<AcademicYearDTO> {
    const academicYear = await academicYearRepository.findById(id);
    if (!academicYear) {
      throw ApiError.notFound('Academic year not found', ErrorCode.RECORD_NOT_FOUND);
    }
    return toAcademicYearDTO(academicYear);
  }

  /**
   * Not audited — routine read. Filtering/sorting/pagination all happen
   * in academicYearRepository.findMany.
   */
  async listAcademicYears(
    filters: ListAcademicYearsFilters,
    options: ListAcademicYearsOptions,
  ): Promise<ListAcademicYearsResult> {
    const result = await academicYearRepository.findMany(filters, options);
    return {
      academicYears: toAcademicYearDTOList(result.academicYears),
      total: result.total,
    };
  }

  /**
   * Updates label/startDate/endDate. isActive cannot change here — see
   * class-level note.
   *
   * The EFFECTIVE resulting state is validated, not just the field(s)
   * present in the patch: a PATCH of only `startDate` is checked against
   * the existing endDate, and vice versa.
   *
   * Label uniqueness is only checked when the label actually changes;
   * because @@unique([label]) means any row matching the NEW label cannot
   * be this row (its label is, by definition, still the OLD label at this
   * point), no additional self-exclusion is structurally required — the
   * `conflicting.id !== id` check below is kept anyway as an explicit,
   * defensive guard rather than relying on that reasoning implicitly.
   */
  async updateAcademicYear(
    actorUserId: string,
    id: AcademicYearId,
    input: UpdateAcademicYearInput,
  ): Promise<AcademicYearDTO> {
    const updated = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const existing = await academicYearRepository.findByIdTx(tx, id);
      if (!existing) {
        throw ApiError.notFound('Academic year not found', ErrorCode.RECORD_NOT_FOUND);
      }

      const effectiveStartDate =
        input.startDate !== undefined ? new Date(input.startDate) : existing.startDate;
      const effectiveEndDate =
        input.endDate !== undefined ? new Date(input.endDate) : existing.endDate;
      if (effectiveStartDate >= effectiveEndDate) {
        throw ApiError.badRequest(
          'startDate must be strictly before endDate',
          ErrorCode.VALIDATION_ERROR,
        );
      }

      if (input.label !== undefined && input.label !== existing.label) {
        const conflicting = await academicYearRepository.findByLabelTx(tx, input.label);
        if (conflicting && conflicting.id !== id) {
          throw ApiError.conflict(
            'An academic year with this label already exists',
            ErrorCode.DUPLICATE_ENTRY,
          );
        }
      }

      const result = await academicYearRepository.update(tx, id, input);

      await recordAuditTx(tx, {
        actorUserId,
        action: 'UPDATE',
        entityType: AuditEntityType.ACADEMIC_YEAR,
        entityId: existing.id,
        oldValue: {
          label: existing.label,
          startDate: existing.startDate.toISOString(),
          endDate: existing.endDate.toISOString(),
        },
        newValue: {
          label: result.label,
          startDate: result.startDate.toISOString(),
          endDate: result.endDate.toISOString(),
        },
      });

      return result;
    });

    academicYearLogger.info('Academic year updated', {
      actorUserId,
      academicYearId: updated.id,
    });

    return toAcademicYearDTO(updated);
  }

  /**
   * Deletes an AcademicYear. Hard delete — no soft-delete field exists on
   * this model.
   *
   * Two independent, unconditional checks, both inside the transaction
   * against the transactionally-loaded row:
   *   1. active  -> reject (ACADEMIC_YEAR_ACTIVE_PROTECTED), regardless
   *      of whether it's referenced.
   *   2. referenced -> reject (ACADEMIC_YEAR_HAS_REFERENCES), regardless
   *      of active state.
   * Only inactive + unused reaches the actual delete.
   *
   * hasReferences() is a business pre-check for a friendly error, not the
   * final guarantee — the five FKs (SemesterEnrollment, PromotionBatch,
   * SubjectOffering, Timetable, Lecture) all default to Restrict, so a
   * genuine race (a dependent row inserted between this check and the
   * DELETE) surfaces as P2003 and is handled by the existing centralized
   * Prisma error mapper, not duplicated here. This service does not
   * cascade-delete dependents and does not deactivate an active year on
   * its way to deletion — an active year is simply not eligible.
   */
  async deleteAcademicYear(actorUserId: string, id: AcademicYearId): Promise<void> {
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const existing = await academicYearRepository.findByIdTx(tx, id);
      if (!existing) {
        throw ApiError.notFound('Academic year not found', ErrorCode.RECORD_NOT_FOUND);
      }

      if (existing.isActive) {
        throw ApiError.conflict(
          'Cannot delete the active academic year.',
          ErrorCode.ACADEMIC_YEAR_ACTIVE_PROTECTED,
        );
      }

      const referenced = await academicYearRepository.hasReferences(tx, id);
      if (referenced) {
        throw ApiError.conflict(
          'Cannot delete an academic year that is already referenced by academic records.',
          ErrorCode.ACADEMIC_YEAR_HAS_REFERENCES,
        );
      }

      await academicYearRepository.delete(tx, id);

      await recordAuditTx(tx, {
        actorUserId,
        action: 'DELETE',
        entityType: AuditEntityType.ACADEMIC_YEAR,
        entityId: existing.id,
        oldValue: {
          id: existing.id,
          label: existing.label,
          startDate: existing.startDate.toISOString(),
          endDate: existing.endDate.toISOString(),
          isActive: existing.isActive,
        },
        newValue: null,
      });
    });

    academicYearLogger.info('Academic year deleted', {
      actorUserId,
      academicYearId: id,
    });
  }

  /**
   * Makes `id` the college's current AcademicYear, deactivating whichever
   * year is currently active (if any) in the same transaction.
   *
   * - Missing target -> NOT_FOUND.
   * - Target already active -> idempotent no-op: no writes, no audit row,
   *   the current row is simply returned.
   * - No currently-active year exists (e.g. initial setup) -> target is
   *   activated directly; nothing is deactivated.
   * - Otherwise -> the current active year is deactivated and the target
   *   is activated, both via updateActiveState, both inside this one
   *   transaction. There is no separate "deactivate" then "activate" pair
   *   of independent transactions — that would expose an intermediate
   *   committed state with zero or two active years.
   */
  async activateAcademicYear(actorUserId: string, id: AcademicYearId): Promise<AcademicYearDTO> {
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const target = await academicYearRepository.findByIdTx(tx, id);
      if (!target) {
        throw ApiError.notFound('Academic year not found', ErrorCode.RECORD_NOT_FOUND);
      }

      if (target.isActive) {
        return { active: target, deactivatedId: null as AcademicYearId | null };
      }

      const currentActive = await academicYearRepository.findActiveTx(tx);

      let deactivatedId: AcademicYearId | null = null;
      if (currentActive) {
        await academicYearRepository.updateActiveState(tx, currentActive.id, false);
        deactivatedId = currentActive.id;

        await recordAuditTx(tx, {
          actorUserId,
          action: 'UPDATE',
          entityType: AuditEntityType.ACADEMIC_YEAR,
          entityId: currentActive.id,
          oldValue: { isActive: true },
          newValue: { isActive: false },
        });
      }

      const activated = await academicYearRepository.updateActiveState(tx, id, true);

      await recordAuditTx(tx, {
        actorUserId,
        action: 'UPDATE',
        entityType: AuditEntityType.ACADEMIC_YEAR,
        entityId: activated.id,
        oldValue: { isActive: false },
        newValue: { isActive: true },
      });

      return { active: activated, deactivatedId };
    });

    academicYearLogger.info('Academic year activated', {
      actorUserId,
      academicYearId: result.active.id,
      deactivatedAcademicYearId: result.deactivatedId,
    });

    return toAcademicYearDTO(result.active);
  }
}

export const academicYearService = new AcademicYearService();
