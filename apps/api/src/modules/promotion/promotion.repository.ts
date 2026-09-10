// apps/api/src/modules/promotion/promotion.repository.ts

import type {
  Prisma,
  PrismaClient,
  PromotionBatch,
  PromotionDecision,
} from '@spark/database/client';

import { prisma } from '../../lib/prisma.js';

import type {
  ListPromotionBatchesFilters,
  ListPromotionBatchesOptions,
  ListPromotionDecisionsFilters,
  ListPromotionDecisionsOptions,
  PromotionOutcome,
} from './promotion.types.js';

/**
 * As with StudentEnrollmentRepository/SemesterEnrollmentRepository,
 * mutating methods take an explicit Prisma transaction client rather than
 * closing over the module-level `prisma` singleton, so the service can
 * compose a promotion mutation (batch creation, decision creation,
 * finalization) with its audit-log write — and, for finalization,
 * SemesterEnrollment/StudentEnrollment writes owned by other repositories
 * — inside one `prisma.$transaction(...)`. Read-only list/lookup methods
 * use the singleton by default; a `*Tx` counterpart exists only where a
 * documented workflow must read a row inside the SAME transaction that
 * later writes based on it.
 *
 * Returns Prisma models only, never DTOs — promotion.mapper.ts is not
 * imported here. This repository owns PromotionBatch/PromotionDecision
 * persistence only; it never writes to SemesterEnrollment,
 * StudentEnrollment, or audit tables, even though PromotionDecision
 * references the first two by id.
 */
type Db = PrismaClient | Prisma.TransactionClient;

export interface PromotionBatchListQueryResult {
  readonly promotionBatches: PromotionBatch[];
  readonly total: number;
}

export interface PromotionDecisionListQueryResult {
  readonly promotionDecisions: PromotionDecision[];
  readonly total: number;
}

/**
 * Deliberately NOT the domain CreatePromotionBatchInput (which excludes
 * initiatedByUserId — the actor comes from req.user, not the client).
 * The service resolves the actor before calling this repository.
 * `status`/`finalizedAt` are omitted — the schema's `@default(DRAFT)`
 * and nullable-with-no-default columns apply untouched.
 */
export interface CreatePromotionBatchPersistenceInput {
  readonly semesterCatalogId: string;
  readonly academicYearId: string;
  readonly initiatedByUserId: string;
}

/**
 * Deliberately NOT the domain CreatePromotionDecisionInput (which
 * excludes promotionBatchId, decidedByUserId, and toSemesterEnrollmentId
 * — route context, actor context, and business-derived, respectively).
 * The service resolves all three before calling this repository.
 * `remarks`/`toSemesterEnrollmentId` are `string | null`, not optional —
 * the service is expected to have already resolved "omitted" vs.
 * "explicitly absent" into a concrete null. `decidedAt` is omitted; the
 * schema's `@default(now())` applies.
 */
export interface CreatePromotionDecisionPersistenceInput {
  readonly promotionBatchId: string;
  readonly studentEnrollmentId: string;
  readonly fromSemesterEnrollmentId: string;
  readonly toSemesterEnrollmentId: string | null;
  readonly outcome: PromotionOutcome;
  readonly remarks: string | null;
  readonly decidedByUserId: string;
}

/**
 * No update()/delete() — PromotionBatch is lifecycle-controlled
 * (DRAFT -> FINALIZED only, via finalize()) rather than a generic CRUD
 * resource; semesterCatalogId/academicYearId/initiatedByUserId are fixed
 * at creation.
 */
export class PromotionBatchRepository {
  async findById(id: string): Promise<PromotionBatch | null> {
    return prisma.promotionBatch.findUnique({ where: { id } });
  }

  async findByIdTx(tx: Db, id: string): Promise<PromotionBatch | null> {
    return tx.promotionBatch.findUnique({ where: { id } });
  }

  async create(tx: Db, input: CreatePromotionBatchPersistenceInput): Promise<PromotionBatch> {
    return tx.promotionBatch.create({
      data: {
        semesterCatalogId: input.semesterCatalogId,
        academicYearId: input.academicYearId,
        initiatedByUserId: input.initiatedByUserId,
      },
    });
  }

  /**
   * Atomic conditional transition: only flips a row still DRAFT, mirroring
   * StudentEnrollmentRepository.cancel()/.withdraw() and
   * AdmissionRepository.cancel()'s identical guarded-updateMany shape.
   * `updateMany` (not `update`) is required because `update`'s `where`
   * only accepts unique fields and cannot express "and status is still
   * DRAFT" as a precondition. `null` means either the id doesn't exist or
   * the batch was not DRAFT at the moment of this statement — the caller
   * is expected to have already read the row (e.g. via findByIdTx) within
   * the same transaction if it needs to distinguish those cases for a
   * specific error message.
   */
  async finalize(tx: Db, id: string, finalizedAt: Date): Promise<PromotionBatch | null> {
    const { count } = await tx.promotionBatch.updateMany({
      where: { id, status: 'DRAFT' },
      data: { status: 'FINALIZED', finalizedAt },
    });
    if (count === 0) {
      return null;
    }
    return tx.promotionBatch.findUniqueOrThrow({ where: { id } });
  }

  /**
   * No `search` filter — PromotionBatch has no own string field, matching
   * ListPromotionBatchesFilters's identical reasoning. `orderBy` is built
   * as an explicit two-branch array (not indexed by a raw string) with a
   * secondary `{ id: sortOrder }` tiebreaker, mirroring
   * SemesterEnrollmentRepository.list()'s identical determinism pattern —
   * required here in particular because `finalizedAt` is null for every
   * DRAFT batch, so many rows can otherwise share the same sort value.
   */
  async list(
    filters: ListPromotionBatchesFilters,
    options: ListPromotionBatchesOptions,
  ): Promise<PromotionBatchListQueryResult> {
    const where: Prisma.PromotionBatchWhereInput = {
      ...(filters.semesterCatalogId !== undefined && {
        semesterCatalogId: filters.semesterCatalogId,
      }),
      ...(filters.academicYearId !== undefined && { academicYearId: filters.academicYearId }),
      ...(filters.status !== undefined && { status: filters.status }),
    };

    const orderBy: Prisma.PromotionBatchOrderByWithRelationInput[] =
      options.sortBy === 'finalizedAt'
        ? [{ finalizedAt: options.sortOrder }, { id: options.sortOrder }]
        : [{ createdAt: options.sortOrder }, { id: options.sortOrder }];

    const [promotionBatches, total] = await Promise.all([
      prisma.promotionBatch.findMany({
        where,
        orderBy,
        skip: (options.page - 1) * options.limit,
        take: options.limit,
      }),
      prisma.promotionBatch.count({ where }),
    ]);

    return { promotionBatches, total };
  }
}

/**
 * No update()/delete() at all — PromotionDecision is append-only/
 * immutable once created (the schema's own comment notes the app's
 * runtime DB role has UPDATE revoked on this table — see this method's
 * own doc comment on attachTargetSemesterEnrollment for the current,
 * honest status of that enforcement).
 */
export class PromotionDecisionRepository {
  async findById(id: string): Promise<PromotionDecision | null> {
    return prisma.promotionDecision.findUnique({ where: { id } });
  }

  async findByIdTx(tx: Db, id: string): Promise<PromotionDecision | null> {
    return tx.promotionDecision.findUnique({ where: { id } });
  }

  /**
   * Uses the compound unique selector for
   * `@@unique([promotionBatchId, studentEnrollmentId])` rather than
   * findFirst — semantically precise and index-friendly, per the
   * established convention of preferring findUnique wherever the schema
   * guarantees uniqueness.
   */
  async findByBatchAndStudent(
    promotionBatchId: string,
    studentEnrollmentId: string,
  ): Promise<PromotionDecision | null> {
    return prisma.promotionDecision.findUnique({
      where: { promotionBatchId_studentEnrollmentId: { promotionBatchId, studentEnrollmentId } },
    });
  }

  /**
   * Transaction-scoped counterpart, for the decision-creation workflow's
   * "no decision already exists for this student in this batch" check —
   * read inside the same transaction that later calls create().
   */
  async findByBatchAndStudentTx(
    tx: Db,
    promotionBatchId: string,
    studentEnrollmentId: string,
  ): Promise<PromotionDecision | null> {
    return tx.promotionDecision.findUnique({
      where: { promotionBatchId_studentEnrollmentId: { promotionBatchId, studentEnrollmentId } },
    });
  }

  /** fromSemesterEnrollmentId is @unique — a SemesterEnrollment can be the source of at most one decision. */
  async findByFromSemesterEnrollmentId(
    fromSemesterEnrollmentId: string,
  ): Promise<PromotionDecision | null> {
    return prisma.promotionDecision.findUnique({ where: { fromSemesterEnrollmentId } });
  }

  /**
   * Transaction-scoped counterpart, for the decision-creation workflow's
   * "this source semester enrollment hasn't already produced a decision"
   * check — read inside the same transaction that later calls create().
   */
  async findByFromSemesterEnrollmentIdTx(
    tx: Db,
    fromSemesterEnrollmentId: string,
  ): Promise<PromotionDecision | null> {
    return tx.promotionDecision.findUnique({ where: { fromSemesterEnrollmentId } });
  }

  /**
   * Returns EVERY decision for this batch — deliberately NOT paginated.
   * Promotion finalization must validate and mutate the complete
   * decision set as one atomic unit; using the paginated `list()` below
   * for that purpose risks silently finalizing only the first page.
   * Transaction-scoped only (no non-tx counterpart) — this method exists
   * specifically to be read consistently alongside the mutations
   * finalization performs in the same transaction. Ordered by `id` for
   * deterministic processing order, matching
   * PromotionService.finalizePromotionBatch's stable mutation-phase
   * ordering.
   */
  async findAllByBatchIdTx(tx: Db, promotionBatchId: string): Promise<PromotionDecision[]> {
    return tx.promotionDecision.findMany({
      where: { promotionBatchId },
      orderBy: { id: 'asc' },
    });
  }

  async create(tx: Db, input: CreatePromotionDecisionPersistenceInput): Promise<PromotionDecision> {
    return tx.promotionDecision.create({
      data: {
        promotionBatchId: input.promotionBatchId,
        studentEnrollmentId: input.studentEnrollmentId,
        fromSemesterEnrollmentId: input.fromSemesterEnrollmentId,
        toSemesterEnrollmentId: input.toSemesterEnrollmentId,
        outcome: input.outcome,
        remarks: input.remarks,
        decidedByUserId: input.decidedByUserId,
      },
    });
  }

  /**
   * The ONLY permitted mutation on an otherwise-immutable PromotionDecision:
   * `NULL -> target SemesterEnrollment id`, exactly once, during promotion
   * finalization. This is deliberately NOT a generic `update()` — the
   * guard `toSemesterEnrollmentId: null` in the `where` clause (not just
   * `id`) means a second attachment attempt (target A -> target B, or any
   * attempt against an already-linked decision) matches zero rows and
   * returns `null`, mirroring `PromotionBatchRepository.finalize`'s
   * identical guarded-updateMany shape for the DRAFT -> FINALIZED
   * transition. `updateMany`, not `update`, because `update`'s `where`
   * only accepts unique fields and cannot express "and
   * toSemesterEnrollmentId is still null" as a precondition.
   *
   * HONEST NOTE ON DB-LEVEL ENFORCEMENT: this model's own schema comment
   * states the app's runtime DB role has UPDATE revoked on this table.
   * As with AuditLog's identical documented situation, that role
   * separation is NOT YET CONFIGURED in this deployment (single dev
   * role) — so this `updateMany` works today. Once that separation is
   * actually applied in a future migration, this exact method will need
   * either a scoped GRANT for this one controlled path or an equivalent
   * mechanism (e.g. a SECURITY DEFINER function) — it is not solved by
   * this change and should not be assumed solved.
   */
  async attachTargetSemesterEnrollment(
    tx: Db,
    decisionId: string,
    toSemesterEnrollmentId: string,
  ): Promise<PromotionDecision | null> {
    const { count } = await tx.promotionDecision.updateMany({
      where: { id: decisionId, toSemesterEnrollmentId: null },
      data: { toSemesterEnrollmentId },
    });
    if (count === 0) {
      return null;
    }
    return tx.promotionDecision.findUniqueOrThrow({ where: { id: decisionId } });
  }

  /**
   * No `search` filter — PromotionDecision has no own string field.
   * `orderBy` mirrors PromotionBatchRepository.list()'s array + `id`
   * tiebreaker shape; `decidedAt`/`createdAt` are both non-nullable here,
   * so this is purely for tiebreaking identical timestamps, not null
   * positioning.
   */
  async list(
    filters: ListPromotionDecisionsFilters,
    options: ListPromotionDecisionsOptions,
  ): Promise<PromotionDecisionListQueryResult> {
    const where: Prisma.PromotionDecisionWhereInput = {
      ...(filters.promotionBatchId !== undefined && { promotionBatchId: filters.promotionBatchId }),
      ...(filters.studentEnrollmentId !== undefined && {
        studentEnrollmentId: filters.studentEnrollmentId,
      }),
      ...(filters.outcome !== undefined && { outcome: filters.outcome }),
    };

    const orderBy: Prisma.PromotionDecisionOrderByWithRelationInput[] =
      options.sortBy === 'decidedAt'
        ? [{ decidedAt: options.sortOrder }, { id: options.sortOrder }]
        : [{ createdAt: options.sortOrder }, { id: options.sortOrder }];

    const [promotionDecisions, total] = await Promise.all([
      prisma.promotionDecision.findMany({
        where,
        orderBy,
        skip: (options.page - 1) * options.limit,
        take: options.limit,
      }),
      prisma.promotionDecision.count({ where }),
    ]);

    return { promotionDecisions, total };
  }
}

export const promotionBatchRepository = new PromotionBatchRepository();
export const promotionDecisionRepository = new PromotionDecisionRepository();
