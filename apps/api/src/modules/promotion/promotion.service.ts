// apps/api/src/modules/promotion/promotion.service.ts

import type {
  AcademicYear,
  Prisma,
  PromotionBatch,
  PromotionDecision,
  SemesterEnrollment,
} from '@spark/database/client';

import { ApiError } from '../../common/errors/ApiError.js';
import { ErrorCode } from '../../common/errors/ErrorCodes.js';
import { promotionLogger } from '../../lib/logger.js';
import { prisma } from '../../lib/prisma.js';
import { semesterCatalogRepository } from '../academic/SemesterCatalog/semester.repository.js';
import { academicYearRepository } from '../academic-years/academic-year.repository.js';
import { recordAuditTx } from '../audit/audit.service.js';
import { AuditEntityType } from '../audit/audit.types.js';
import { semesterEnrollmentRepository } from '../semester-enrollments/semesterEnrollment.repository.js';
import { studentEnrollmentRepository } from '../student-enrollments/studentEnrollment.repository.js';

import {
  toPromotionBatchDTO,
  toPromotionBatchDTOList,
  toPromotionDecisionDTO,
  toPromotionDecisionDTOList,
} from './promotion.mapper.js';
import { promotionBatchRepository, promotionDecisionRepository } from './promotion.repository.js';
import type {
  CreatePromotionBatchInput,
  CreatePromotionDecisionInput,
  ListPromotionBatchesFilters,
  ListPromotionBatchesOptions,
  ListPromotionBatchesResult,
  ListPromotionDecisionsFilters,
  ListPromotionDecisionsOptions,
  ListPromotionDecisionsResult,
  PromotionBatchDTO,
  PromotionBatchId,
  PromotionDecisionDTO,
  PromotionDecisionId,
} from './promotion.types.js';

/**
 * Business-logic layer for the Promotion domain — opening a
 * PromotionBatch for one (semesterCatalogId, academicYearId) pair,
 * recording immutable PromotionDecisions against it while it is DRAFT,
 * and finalizing the batch so each decision's outcome is applied as a
 * SemesterEnrollment/StudentEnrollment lifecycle transition.
 *
 * ── WHY toSemesterEnrollmentId IS NULL AT CREATION, POPULATED AT
 *    FINALIZATION ─────────────────────────────────────────────────────
 * Creating a PromotionDecision records an INTENDED institutional outcome;
 * it does not itself mutate any SemesterEnrollment/StudentEnrollment row.
 * `toSemesterEnrollmentId` is always persisted as `null` at creation. The
 * target enrollment (for PROMOTE/REPEAT) is created only during
 * finalization, then linked back via
 * `promotionDecisionRepository.attachTargetSemesterEnrollment` — a
 * narrowly-scoped, guarded `NULL -> id` operation, never a generic
 * update. This is the ONLY field mutation a PromotionDecision ever
 * undergoes; everything else about a decision is fixed at creation.
 *
 * ── FINALIZATION: ONE TRANSACTION, VALIDATE-THEN-MUTATE ───────────────
 * `finalizePromotionBatch` loads the batch and its COMPLETE decision set
 * (`findAllByBatchIdTx` — never the paginated `list()`) inside one
 * `prisma.$transaction`, validates every decision (Phase A), resolves the
 * derived facts every PROMOTE/REPEAT decision needs (next SemesterCatalog,
 * target AcademicYear), and only then applies mutations in a deterministic
 * order (Phase B: sorted by decision id). If any decision fails validation,
 * nothing in the batch is mutated. If any mutation fails, the whole
 * transaction rolls back — there is no state where a target enrollment
 * exists but its decision was never linked, or where some students in a
 * batch were promoted while others were not yet processed.
 *
 * ── WHY PROMOTE's NEXT SEMESTER IS RESOLVED ONCE, NOT PER-DECISION ─────
 * Every decision's source SemesterEnrollment is validated (in Phase A) to
 * share the batch's OWN semesterCatalogId — a PromotionBatch is one
 * process for one specific curriculum semester. So "the next semester"
 * is a single fact about the batch, resolved once via
 * `SemesterCatalogRepository.findByCurriculumVersionAndNumberTx(tx,
 * curriculumVersionId, number + 1)` — an already-existing, schema-backed
 * lookup — never `currentNumber + 1` assumed without confirming a row
 * exists at that number.
 *
 * ── WHY THE TARGET ACADEMIC YEAR IS THE ACTIVE ONE ─────────────────────
 * schema.prisma's AcademicYear model carries no "next year" relationship
 * — no ordering field, no sibling FK to derive succession from. The only
 * schema-supported concept for "which term does new academic activity
 * belong to" is `AcademicYear.isActive` (see academic-year.service.ts's
 * own doc comment: "Makes id the college's current AcademicYear"). PROMOTE
 * and REPEAT targets therefore use `academicYearRepository.findActiveTx`,
 * and finalization fails cleanly if no year is currently active rather
 * than guessing at date arithmetic. This is a real product assumption,
 * not a schema fact — flagged for confirmation in the accompanying report.
 *
 * ── DB-LEVEL IMMUTABILITY CAVEAT (HONESTLY DOCUMENTED, NOT HIDDEN) ─────
 * PromotionDecision's own schema comment states the app's runtime DB role
 * has UPDATE revoked on this table. As AuditLog's identical schema
 * comment admits for itself, that role separation is not yet configured
 * in this deployment (single dev role) — so
 * `attachTargetSemesterEnrollment`'s `updateMany` succeeds today. This is
 * not silently assumed; see that method's own doc comment in
 * promotion.repository.ts.
 */
export class PromotionService {
  /**
   * Opens a DRAFT PromotionBatch for a (semesterCatalogId,
   * academicYearId) pair. Existence checks run before the transaction —
   * mirroring AdmissionService.createAdmission — because nothing here
   * needs a transactionally-consistent read of SemesterCatalog/
   * AcademicYear; the transaction exists only to make the batch insert
   * and its audit row succeed or fail together. No semantic
   * cross-validation is performed beyond existence: schema.prisma gives
   * SemesterCatalog and AcademicYear no relation to each other, so there
   * is no "compatible combination" fact to check beyond both rows
   * existing. No uniqueness rule on (semesterCatalogId, academicYearId)
   * is enforced — the schema indexes that pair but does not make it
   * `@@unique`, so multiple batches for the same pair are structurally
   * permitted.
   */
  async createPromotionBatch(
    actorUserId: string,
    input: CreatePromotionBatchInput,
  ): Promise<PromotionBatchDTO> {
    const semesterCatalog = await semesterCatalogRepository.findById(input.semesterCatalogId);
    if (!semesterCatalog) {
      throw ApiError.notFound('Semester catalog not found', ErrorCode.RECORD_NOT_FOUND);
    }

    const academicYear = await academicYearRepository.findById(input.academicYearId);
    if (!academicYear) {
      throw ApiError.notFound('Academic year not found', ErrorCode.RECORD_NOT_FOUND);
    }

    const created = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const batch = await promotionBatchRepository.create(tx, {
        semesterCatalogId: input.semesterCatalogId,
        academicYearId: input.academicYearId,
        initiatedByUserId: actorUserId,
      });

      await recordAuditTx(tx, {
        actorUserId,
        action: 'CREATE',
        entityType: AuditEntityType.PROMOTION_BATCH,
        entityId: batch.id,
        newValue: {
          id: batch.id,
          semesterCatalogId: batch.semesterCatalogId,
          academicYearId: batch.academicYearId,
          initiatedByUserId: batch.initiatedByUserId,
          status: batch.status,
        },
      });

      return batch;
    });

    promotionLogger.info('Promotion batch created', {
      actorUserId,
      promotionBatchId: created.id,
      semesterCatalogId: created.semesterCatalogId,
      academicYearId: created.academicYearId,
    });

    return toPromotionBatchDTO(created);
  }

  /** Not audited — routine read. */
  async getPromotionBatchById(id: PromotionBatchId): Promise<PromotionBatchDTO> {
    const batch = await promotionBatchRepository.findById(id);
    if (!batch) {
      throw ApiError.notFound('Promotion batch not found', ErrorCode.RECORD_NOT_FOUND);
    }
    return toPromotionBatchDTO(batch);
  }

  /** Not audited — routine read. Thin pass-through; the repository owns filtering/pagination/sorting. */
  async listPromotionBatches(
    filters: ListPromotionBatchesFilters,
    options: ListPromotionBatchesOptions,
  ): Promise<ListPromotionBatchesResult> {
    const result = await promotionBatchRepository.list(filters, options);
    return {
      promotionBatches: toPromotionBatchDTOList(result.promotionBatches),
      total: result.total,
    };
  }

  /**
   * Records a PromotionDecision against a DRAFT batch. Everything —
   * batch/student/source lookups, the duplicate pre-checks, and the
   * insert — runs inside one transaction using *Tx repository methods,
   * mirroring SemesterEnrollmentService.createSemesterEnrollment: the
   * duplicate pre-checks below are only a fast-path for a friendlier
   * error, not the final concurrency guarantee — @@unique([
   * promotionBatchId, studentEnrollmentId]) and the @unique
   * fromSemesterEnrollmentId column remain authoritative, and a losing
   * concurrent insert surfaces as P2002 via the centralized Prisma error
   * mapper, uncaught here. `toSemesterEnrollmentId` is always persisted
   * as `null` — see class doc comment.
   */
  async createPromotionDecision(
    actorUserId: string,
    batchId: PromotionBatchId,
    input: CreatePromotionDecisionInput,
  ): Promise<PromotionDecisionDTO> {
    const created = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const batch = await promotionBatchRepository.findByIdTx(tx, batchId);
      if (!batch) {
        throw ApiError.notFound('Promotion batch not found', ErrorCode.RECORD_NOT_FOUND);
      }
      if (batch.status !== 'DRAFT') {
        throw ApiError.conflict(
          'Promotion decisions can only be recorded against a draft promotion batch',
        );
      }

      const studentEnrollment = await studentEnrollmentRepository.findByIdTx(
        tx,
        input.studentEnrollmentId,
      );
      if (!studentEnrollment) {
        throw ApiError.notFound('Student enrollment not found', ErrorCode.RECORD_NOT_FOUND);
      }

      const sourceEnrollment = await semesterEnrollmentRepository.findByIdTx(
        tx,
        input.fromSemesterEnrollmentId,
      );
      if (!sourceEnrollment) {
        throw ApiError.notFound('Source semester enrollment not found', ErrorCode.RECORD_NOT_FOUND);
      }

      if (sourceEnrollment.studentEnrollmentId !== input.studentEnrollmentId) {
        throw ApiError.unprocessable(
          'The source semester enrollment does not belong to this student enrollment',
          ErrorCode.ACADEMIC_HIERARCHY_MISMATCH,
        );
      }

      // The source must belong to the SAME curriculum semester and the
      // SAME academic year the batch was opened for — a PromotionBatch
      // is scoped to exactly one (semesterCatalogId, academicYearId)
      // pair (see this class's doc comment).
      if (
        sourceEnrollment.semesterCatalogId !== batch.semesterCatalogId ||
        sourceEnrollment.academicYearId !== batch.academicYearId
      ) {
        throw ApiError.unprocessable(
          'The source semester enrollment does not belong to this promotion batch\u2019s semester/academic year context',
          ErrorCode.ACADEMIC_HIERARCHY_MISMATCH,
        );
      }

      if (sourceEnrollment.status !== 'IN_PROGRESS') {
        throw ApiError.conflict(
          'Only an in-progress semester enrollment can be recorded in a promotion decision',
        );
      }

      const existingForStudent = await promotionDecisionRepository.findByBatchAndStudentTx(
        tx,
        batchId,
        input.studentEnrollmentId,
      );
      if (existingForStudent) {
        throw ApiError.conflict(
          'A promotion decision already exists for this student in this batch',
          ErrorCode.DUPLICATE_ENTRY,
        );
      }

      const existingForSource = await promotionDecisionRepository.findByFromSemesterEnrollmentIdTx(
        tx,
        input.fromSemesterEnrollmentId,
      );
      if (existingForSource) {
        throw ApiError.conflict(
          'This semester enrollment has already been processed by another promotion decision',
          ErrorCode.DUPLICATE_ENTRY,
        );
      }

      // exactOptionalPropertyTypes: normalize the omittable API-level
      // `remarks?: string` to the persistence contract's `string | null`.
      const remarks = input.remarks ?? null;

      const decision = await promotionDecisionRepository.create(tx, {
        promotionBatchId: batchId,
        studentEnrollmentId: input.studentEnrollmentId,
        fromSemesterEnrollmentId: input.fromSemesterEnrollmentId,
        // Resolved only during finalization — see class doc comment.
        toSemesterEnrollmentId: null,
        outcome: input.outcome,
        remarks,
        decidedByUserId: actorUserId,
      });

      await recordAuditTx(tx, {
        actorUserId,
        action: 'CREATE',
        entityType: AuditEntityType.PROMOTION_DECISION,
        entityId: decision.id,
        newValue: {
          id: decision.id,
          promotionBatchId: decision.promotionBatchId,
          studentEnrollmentId: decision.studentEnrollmentId,
          fromSemesterEnrollmentId: decision.fromSemesterEnrollmentId,
          outcome: decision.outcome,
          remarks: decision.remarks,
          decidedByUserId: decision.decidedByUserId,
        },
      });

      return decision;
    });

    promotionLogger.info('Promotion decision created', {
      actorUserId,
      promotionDecisionId: created.id,
      promotionBatchId: created.promotionBatchId,
      studentEnrollmentId: created.studentEnrollmentId,
      outcome: created.outcome,
    });

    return toPromotionDecisionDTO(created);
  }

  /** Not audited — routine read. */
  async getPromotionDecisionById(id: PromotionDecisionId): Promise<PromotionDecisionDTO> {
    const decision = await promotionDecisionRepository.findById(id);
    if (!decision) {
      throw ApiError.notFound('Promotion decision not found', ErrorCode.RECORD_NOT_FOUND);
    }
    return toPromotionDecisionDTO(decision);
  }

  /** Not audited — routine read. Thin pass-through; the repository owns filtering/pagination/sorting. */
  async listPromotionDecisions(
    filters: ListPromotionDecisionsFilters,
    options: ListPromotionDecisionsOptions,
  ): Promise<ListPromotionDecisionsResult> {
    const result = await promotionDecisionRepository.list(filters, options);
    return {
      promotionDecisions: toPromotionDecisionDTOList(result.promotionDecisions),
      total: result.total,
    };
  }

  /**
   * Finalizes a DRAFT PromotionBatch: applies every one of its decisions
   * as a SemesterEnrollment (and, for DISCONTINUE/GRADUATE, StudentEnrollment)
   * lifecycle transition, links each PROMOTE/REPEAT decision to its newly
   * created target enrollment, and flips the batch to FINALIZED — all in
   * one transaction. See class doc comment for the overall design.
   */
  async finalizePromotionBatch(
    actorUserId: string,
    id: PromotionBatchId,
  ): Promise<PromotionBatchDTO> {
    const finalized = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const batch = await promotionBatchRepository.findByIdTx(tx, id);
      if (!batch) {
        throw ApiError.notFound('Promotion batch not found', ErrorCode.RECORD_NOT_FOUND);
      }
      if (batch.status !== 'DRAFT') {
        throw ApiError.conflict('This promotion batch has already been finalized');
      }

      const decisions = await promotionDecisionRepository.findAllByBatchIdTx(tx, id);
      if (decisions.length === 0) {
        throw ApiError.unprocessable(
          'A promotion batch with no decisions cannot be finalized',
          ErrorCode.VALIDATION_ERROR,
        );
      }

      // ---- Phase A: validate every decision, load its source ----
      const sourceByDecisionId = new Map<string, SemesterEnrollment>();
      let hasPromoteOrRepeat = false;
      let hasPromote = false;

      for (const decision of decisions) {
        if (decision.toSemesterEnrollmentId !== null) {
          // Should be unreachable for a still-DRAFT batch — every
          // attachment happens inside this same method, and this method
          // guards the batch to DRAFT above. Guarded defensively anyway.
          throw ApiError.conflict(
            `Promotion decision ${decision.id} already has a target semester enrollment attached`,
          );
        }

        const source = await semesterEnrollmentRepository.findByIdTx(
          tx,
          decision.fromSemesterEnrollmentId,
        );
        if (!source) {
          throw ApiError.notFound(
            `Source semester enrollment not found for promotion decision ${decision.id}`,
            ErrorCode.RECORD_NOT_FOUND,
          );
        }
        if (source.studentEnrollmentId !== decision.studentEnrollmentId) {
          throw ApiError.unprocessable(
            `Promotion decision ${decision.id}\u2019s source semester enrollment does not belong to its student enrollment`,
            ErrorCode.ACADEMIC_HIERARCHY_MISMATCH,
          );
        }
        if (
          source.semesterCatalogId !== batch.semesterCatalogId ||
          source.academicYearId !== batch.academicYearId
        ) {
          throw ApiError.unprocessable(
            `Promotion decision ${decision.id}\u2019s source semester enrollment does not belong to this batch\u2019s semester/academic year context`,
            ErrorCode.ACADEMIC_HIERARCHY_MISMATCH,
          );
        }
        if (source.status !== 'IN_PROGRESS') {
          throw ApiError.conflict(
            `Promotion decision ${decision.id}\u2019s source semester enrollment is no longer in progress`,
          );
        }

        sourceByDecisionId.set(decision.id, source);
        if (decision.outcome === 'PROMOTE' || decision.outcome === 'REPEAT') {
          hasPromoteOrRepeat = true;
        }
        if (decision.outcome === 'PROMOTE') {
          hasPromote = true;
        }
      }

      // ---- Resolve shared derived targets once for the whole batch ----
      // Every decision's source shares the batch's own semesterCatalogId
      // (validated above), so PROMOTE's "next semester" is one fact about
      // the batch, not one fact per decision.
      let nextSemesterCatalogId: string | undefined;
      if (hasPromote) {
        const currentCatalog = await semesterCatalogRepository.findByIdTx(
          tx,
          batch.semesterCatalogId,
        );
        if (!currentCatalog) {
          throw ApiError.notFound(
            'Semester catalog not found for this promotion batch',
            ErrorCode.RECORD_NOT_FOUND,
          );
        }
        const nextCatalog = await semesterCatalogRepository.findByCurriculumVersionAndNumberTx(
          tx,
          currentCatalog.curriculumVersionId,
          currentCatalog.number + 1,
        );
        if (!nextCatalog) {
          throw ApiError.unprocessable(
            'This batch includes a PROMOTE decision but no next semester exists in the curriculum for this semester catalog. Use GRADUATE for a final-semester batch instead.',
            ErrorCode.ACADEMIC_HIERARCHY_MISMATCH,
          );
        }
        nextSemesterCatalogId = nextCatalog.id;
      }

      // See class doc comment ("WHY THE TARGET ACADEMIC YEAR IS THE
      // ACTIVE ONE") for why this is `findActiveTx`, not date arithmetic.
      let targetAcademicYear: AcademicYear | null = null;
      if (hasPromoteOrRepeat) {
        targetAcademicYear = await academicYearRepository.findActiveTx(tx);
        if (!targetAcademicYear) {
          throw ApiError.unprocessable(
            'No active academic year is set; cannot determine which academic year new semester enrollments belong to',
            ErrorCode.VALIDATION_ERROR,
          );
        }
      }

      // ---- Phase B: apply mutations in deterministic order ----
      const orderedDecisions = [...decisions].sort((a, b) => a.id.localeCompare(b.id));
      for (const decision of orderedDecisions) {
        const source = sourceByDecisionId.get(decision.id);
        if (!source) {
          // Cannot happen — every decision above either populated this
          // map or threw before Phase B is ever reached.
          throw ApiError.internal('Unresolved promotion decision source', ErrorCode.INTERNAL_ERROR);
        }
        await this.applyPromotionDecision(
          tx,
          actorUserId,
          batch,
          decision,
          source,
          nextSemesterCatalogId,
          targetAcademicYear,
        );
      }

      const finalizedBatch = await promotionBatchRepository.finalize(tx, id, new Date());
      if (!finalizedBatch) {
        // Should be unreachable: this same transaction already confirmed
        // DRAFT status above, and Postgres blocks a concurrent UPDATE on
        // this row until this transaction commits or rolls back — no
        // other transaction can flip this batch's status out from under
        // us mid-transaction. Guarded defensively anyway, matching this
        // repository method's own documented null-handling contract.
        throw ApiError.conflict('This promotion batch was concurrently finalized');
      }

      await recordAuditTx(tx, {
        actorUserId,
        action: 'UPDATE',
        entityType: AuditEntityType.PROMOTION_BATCH,
        entityId: finalizedBatch.id,
        oldValue: { status: 'DRAFT' },
        newValue: {
          status: finalizedBatch.status,
          finalizedAt: finalizedBatch.finalizedAt ? finalizedBatch.finalizedAt.toISOString() : null,
          decisionCount: decisions.length,
        },
      });

      return finalizedBatch;
    });

    promotionLogger.info('Promotion batch finalized', {
      actorUserId,
      promotionBatchId: finalized.id,
    });

    return toPromotionBatchDTO(finalized);
  }

  /**
   * Dispatches one decision's finalization effect. `switch` with no
   * `default` over the Prisma-generated `PromotionOutcome` enum gives
   * compile-time exhaustiveness — a future sixth outcome value fails
   * this file to compile rather than silently falling through.
   */
  private async applyPromotionDecision(
    tx: Prisma.TransactionClient,
    actorUserId: string,
    batch: PromotionBatch,
    decision: PromotionDecision,
    source: SemesterEnrollment,
    nextSemesterCatalogId: string | undefined,
    targetAcademicYear: AcademicYear | null,
  ): Promise<void> {
    switch (decision.outcome) {
      case 'PROMOTE':
        await this.applyPromote(
          tx,
          actorUserId,
          decision,
          source,
          nextSemesterCatalogId,
          targetAcademicYear,
        );
        return;
      case 'REPEAT':
        await this.applyRepeat(tx, actorUserId, decision, source, targetAcademicYear);
        return;
      case 'WITHDRAW':
        await this.applyWithdraw(tx, actorUserId, decision, source);
        return;
      case 'DISCONTINUE':
        await this.applyDiscontinue(tx, actorUserId, batch, decision, source);
        return;
      case 'GRADUATE':
        await this.applyGraduate(tx, actorUserId, batch, decision, source);
        return;
      default: {
        const exhaustive: never = decision.outcome;
        throw ApiError.internal(
          `Unhandled promotion outcome: ${String(exhaustive)}`,
          ErrorCode.INTERNAL_ERROR,
        );
      }
    }
  }

  /**
   * PROMOTE: create the target SemesterEnrollment in the next semester
   * catalog / active academic year, mark the source PROMOTED, attach the
   * target to the decision. `getNextAttemptNumberTx` is reused as-is —
   * no duplicated MAX+1 logic — even though a fresh PROMOTE target is
   * almost always attempt 1.
   */
  private async applyPromote(
    tx: Prisma.TransactionClient,
    actorUserId: string,
    decision: PromotionDecision,
    source: SemesterEnrollment,
    nextSemesterCatalogId: string | undefined,
    targetAcademicYear: AcademicYear | null,
  ): Promise<void> {
    if (nextSemesterCatalogId === undefined || !targetAcademicYear) {
      // Guaranteed resolved by finalizePromotionBatch before Phase B for
      // every batch containing a PROMOTE decision.
      throw ApiError.internal(
        `Missing resolved PROMOTE target for promotion decision ${decision.id}`,
        ErrorCode.INTERNAL_ERROR,
      );
    }

    const attemptNumber = await semesterEnrollmentRepository.getNextAttemptNumberTx(
      tx,
      decision.studentEnrollmentId,
      nextSemesterCatalogId,
    );
    const target = await semesterEnrollmentRepository.create(tx, {
      studentEnrollmentId: decision.studentEnrollmentId,
      semesterCatalogId: nextSemesterCatalogId,
      academicYearId: targetAcademicYear.id,
      attemptNumber,
    });

    const promotedSource = await semesterEnrollmentRepository.markPromoted(tx, source.id);
    if (!promotedSource) {
      throw ApiError.conflict(
        `Source semester enrollment for promotion decision ${decision.id} changed concurrently`,
      );
    }

    const attached = await promotionDecisionRepository.attachTargetSemesterEnrollment(
      tx,
      decision.id,
      target.id,
    );
    if (!attached) {
      throw ApiError.conflict(
        `Promotion decision ${decision.id} already has a target semester enrollment attached`,
      );
    }

    await recordAuditTx(tx, {
      actorUserId,
      action: 'UPDATE',
      entityType: AuditEntityType.PROMOTION_DECISION,
      entityId: decision.id,
      oldValue: { toSemesterEnrollmentId: null, sourceStatus: 'IN_PROGRESS' },
      newValue: {
        toSemesterEnrollmentId: target.id,
        sourceStatus: 'PROMOTED',
        targetSemesterCatalogId: nextSemesterCatalogId,
        targetAcademicYearId: targetAcademicYear.id,
      },
    });
  }

  /**
   * REPEAT: create a new attempt at the SAME semester catalog via
   * `getNextAttemptNumberTx` (never duplicated MAX+1 logic), mark the
   * source REPEATED, attach the target to the decision.
   */
  private async applyRepeat(
    tx: Prisma.TransactionClient,
    actorUserId: string,
    decision: PromotionDecision,
    source: SemesterEnrollment,
    targetAcademicYear: AcademicYear | null,
  ): Promise<void> {
    if (!targetAcademicYear) {
      throw ApiError.internal(
        `Missing resolved REPEAT target academic year for promotion decision ${decision.id}`,
        ErrorCode.INTERNAL_ERROR,
      );
    }

    const attemptNumber = await semesterEnrollmentRepository.getNextAttemptNumberTx(
      tx,
      decision.studentEnrollmentId,
      source.semesterCatalogId,
    );
    const target = await semesterEnrollmentRepository.create(tx, {
      studentEnrollmentId: decision.studentEnrollmentId,
      semesterCatalogId: source.semesterCatalogId,
      academicYearId: targetAcademicYear.id,
      attemptNumber,
    });

    const repeatedSource = await semesterEnrollmentRepository.markRepeated(tx, source.id);
    if (!repeatedSource) {
      throw ApiError.conflict(
        `Source semester enrollment for promotion decision ${decision.id} changed concurrently`,
      );
    }

    const attached = await promotionDecisionRepository.attachTargetSemesterEnrollment(
      tx,
      decision.id,
      target.id,
    );
    if (!attached) {
      throw ApiError.conflict(
        `Promotion decision ${decision.id} already has a target semester enrollment attached`,
      );
    }

    await recordAuditTx(tx, {
      actorUserId,
      action: 'UPDATE',
      entityType: AuditEntityType.PROMOTION_DECISION,
      entityId: decision.id,
      oldValue: { toSemesterEnrollmentId: null, sourceStatus: 'IN_PROGRESS' },
      newValue: {
        toSemesterEnrollmentId: target.id,
        sourceStatus: 'REPEATED',
        attemptNumber,
        targetAcademicYearId: targetAcademicYear.id,
      },
    });
  }

  /** WITHDRAW: source -> WITHDRAWN. No target enrollment; toSemesterEnrollmentId stays null. */
  private async applyWithdraw(
    tx: Prisma.TransactionClient,
    actorUserId: string,
    decision: PromotionDecision,
    source: SemesterEnrollment,
  ): Promise<void> {
    const withdrawnSource = await semesterEnrollmentRepository.markWithdrawn(tx, source.id);
    if (!withdrawnSource) {
      throw ApiError.conflict(
        `Source semester enrollment for promotion decision ${decision.id} changed concurrently`,
      );
    }

    await recordAuditTx(tx, {
      actorUserId,
      action: 'UPDATE',
      entityType: AuditEntityType.PROMOTION_DECISION,
      entityId: decision.id,
      oldValue: { sourceStatus: 'IN_PROGRESS' },
      newValue: { sourceStatus: 'WITHDRAWN' },
    });
  }

  /**
   * DISCONTINUE: source -> DISCONTINUED, and (since the domain supports
   * it) StudentEnrollment -> DISCONTINUED via the repository's own
   * narrowly-scoped guarded transition. No target enrollment.
   */
  private async applyDiscontinue(
    tx: Prisma.TransactionClient,
    actorUserId: string,
    batch: PromotionBatch,
    decision: PromotionDecision,
    source: SemesterEnrollment,
  ): Promise<void> {
    const discontinuedSource = await semesterEnrollmentRepository.markDiscontinued(tx, source.id);
    if (!discontinuedSource) {
      throw ApiError.conflict(
        `Source semester enrollment for promotion decision ${decision.id} changed concurrently`,
      );
    }

    const studentEnrollment = await studentEnrollmentRepository.discontinue(
      tx,
      decision.studentEnrollmentId,
      `Discontinued via promotion decision ${decision.id} (batch ${batch.id})`,
    );
    if (!studentEnrollment) {
      throw ApiError.conflict(
        `Student enrollment ${decision.studentEnrollmentId} is not active and could not be discontinued`,
        ErrorCode.STUDENT_ENROLLMENT_NOT_ACTIVE,
      );
    }

    await recordAuditTx(tx, {
      actorUserId,
      action: 'UPDATE',
      entityType: AuditEntityType.PROMOTION_DECISION,
      entityId: decision.id,
      oldValue: { sourceStatus: 'IN_PROGRESS', studentEnrollmentStatus: 'ACTIVE' },
      newValue: { sourceStatus: 'DISCONTINUED', studentEnrollmentStatus: studentEnrollment.status },
    });
  }

  /**
   * GRADUATE: source -> GRADUATED, and StudentEnrollment -> GRADUATED via
   * the repository's own narrowly-scoped guarded transition. No target
   * enrollment, no next semester created or considered.
   */
  private async applyGraduate(
    tx: Prisma.TransactionClient,
    actorUserId: string,
    batch: PromotionBatch,
    decision: PromotionDecision,
    source: SemesterEnrollment,
  ): Promise<void> {
    const graduatedSource = await semesterEnrollmentRepository.markGraduated(tx, source.id);
    if (!graduatedSource) {
      throw ApiError.conflict(
        `Source semester enrollment for promotion decision ${decision.id} changed concurrently`,
      );
    }

    const studentEnrollment = await studentEnrollmentRepository.graduate(
      tx,
      decision.studentEnrollmentId,
    );
    if (!studentEnrollment) {
      throw ApiError.conflict(
        `Student enrollment ${decision.studentEnrollmentId} is not active and could not be graduated`,
        ErrorCode.STUDENT_ENROLLMENT_NOT_ACTIVE,
      );
    }

    await recordAuditTx(tx, {
      actorUserId,
      action: 'UPDATE',
      entityType: AuditEntityType.PROMOTION_DECISION,
      entityId: decision.id,
      oldValue: { sourceStatus: 'IN_PROGRESS', studentEnrollmentStatus: 'ACTIVE' },
      newValue: { sourceStatus: 'GRADUATED', studentEnrollmentStatus: studentEnrollment.status },
    });
  }
}

export const promotionService = new PromotionService();
