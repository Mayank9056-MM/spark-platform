// apps/api/src/modules/academic/curricula/curriculum.service.ts

import type { Prisma } from '@spark/database/client';

import { ApiError } from '../../../common/errors/ApiError.js';
import { ErrorCode } from '../../../common/errors/ErrorCodes.js';
import { isForeignKeyViolation } from '../../../common/errors/prisma-error.mapper.js';
import { curriculumLogger } from '../../../lib/logger.js';
import { prisma } from '../../../lib/prisma.js';
import { recordAuditTx } from '../../audit/audit.service.js';
import { AuditEntityType } from '../../audit/audit.types.js';
import { programRepository } from '../programs/program.repository.js';

import {
  toCurriculumStructureDTO,
  toCurriculumVersionDTO,
  toCurriculumVersionDTOList,
} from './curriculum.mapper.js';
import { evaluateActivationReadiness, formatReadinessFailure } from './curriculum.readiness.js';
import { curriculumVersionRepository } from './curriculum.repository.js';
import type {
  CreateCurriculumVersionInput,
  CurriculumStructureDTO,
  CurriculumVersionDTO,
  CurriculumVersionId,
  ListCurriculumVersionsFilters,
  ListCurriculumVersionsOptions,
  ListCurriculumVersionsResult,
  UpdateCurriculumVersionInput,
} from './curriculum.types.js';

/**
 * CurriculumVersion lifecycle:
 *
 *   DRAFT --activate--> ACTIVE --retire--> RETIRED
 *
 * One-way. Invalid transitions are 409 CURRICULUM_VERSION_INVALID_TRANSITION.
 * Activation additionally requires structural readiness (see
 * curriculum.readiness.ts); a readiness failure is 422
 * CURRICULUM_VERSION_NOT_READY, deliberately distinct from an illegal
 * transition.
 *
 * Only DRAFT versions are editable or deletable. ACTIVE and RETIRED versions
 * are permanent institutional records: admissions/enrollments that reference
 * them stay valid, and structure changes require a new version. Several
 * ACTIVE versions per program may coexist (overlapping schemes are allowed).
 *
 * Concurrency: every status change is an atomic conditional UPDATE
 * (`transitionStatus`), so of two racing transitions exactly one succeeds.
 * Structure mutations elsewhere take a row lock on the DRAFT version
 * (curriculum.guard.ts); because activation flips the status FIRST and only
 * then reads the structure, it holds that same lock while validating, and
 * no structure edit can slip in between the readiness check and commit.
 */
export class CurriculumVersionService {
  async createCurriculumVersion(
    actorUserId: string,
    input: CreateCurriculumVersionInput,
  ): Promise<CurriculumVersionDTO> {
    const program = await programRepository.findById(input.programId);
    if (!program) {
      throw ApiError.notFound('Program not found', ErrorCode.RECORD_NOT_FOUND);
    }

    const labelTaken = await curriculumVersionRepository.existsByProgramAndLabel(
      input.programId,
      input.label,
    );
    if (labelTaken) {
      throw ApiError.conflict(
        'A curriculum version with this label already exists for this program',
        ErrorCode.DUPLICATE_ENTRY,
      );
    }

    const curriculumVersion = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const created = await curriculumVersionRepository.create(tx, input);

      await recordAuditTx(tx, {
        actorUserId,
        action: 'CREATE',
        entityType: AuditEntityType.CURRICULUM_VERSION,
        entityId: created.id,
        newValue: {
          id: created.id,
          programId: created.programId,
          label: created.label,
          status: created.status,
        },
      });

      return created;
    });

    curriculumLogger.info('Curriculum version created', {
      actorUserId,
      curriculumVersionId: curriculumVersion.id,
    });

    return toCurriculumVersionDTO(curriculumVersion);
  }

  async getCurriculumVersionById(id: CurriculumVersionId): Promise<CurriculumVersionDTO> {
    const curriculumVersion = await curriculumVersionRepository.findById(id);
    if (!curriculumVersion) {
      throw ApiError.notFound('Curriculum version not found', ErrorCode.RECORD_NOT_FOUND);
    }
    return toCurriculumVersionDTO(curriculumVersion);
  }

  /**
   * Administrative structure read. Not audited (routine read). Bounded
   * select via the repository — no whole-graph include, no per-row queries.
   */
  async getCurriculumVersionStructure(id: CurriculumVersionId): Promise<CurriculumStructureDTO> {
    const record = await curriculumVersionRepository.findStructureById(id);
    if (!record) {
      throw ApiError.notFound('Curriculum version not found', ErrorCode.RECORD_NOT_FOUND);
    }
    return toCurriculumStructureDTO(record);
  }

  async listCurriculumVersions(
    filters: ListCurriculumVersionsFilters,
    options: ListCurriculumVersionsOptions,
  ): Promise<ListCurriculumVersionsResult> {
    const result = await curriculumVersionRepository.findMany(filters, options);
    return {
      curriculumVersions: toCurriculumVersionDTOList(result.curriculumVersions),
      total: result.total,
    };
  }

  /**
   * Updates `label` only, and only while DRAFT. The DRAFT check is repeated
   * as a conditional row lock so a concurrent activation cannot commit
   * between the status read and the write.
   */
  async updateCurriculumVersion(
    actorUserId: string,
    id: CurriculumVersionId,
    input: UpdateCurriculumVersionInput,
  ): Promise<CurriculumVersionDTO> {
    const updated = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const existing = await curriculumVersionRepository.findByIdTx(tx, id);
      if (!existing) {
        throw ApiError.notFound('Curriculum version not found', ErrorCode.RECORD_NOT_FOUND);
      }

      if (existing.status !== 'DRAFT') {
        throw ApiError.conflict(
          'Only a draft curriculum version can be edited',
          ErrorCode.CURRICULUM_VERSION_INVALID_TRANSITION,
        );
      }

      const locked = await curriculumVersionRepository.lockDraftTx(tx, id);
      if (!locked) {
        throw ApiError.conflict(
          'Only a draft curriculum version can be edited',
          ErrorCode.CURRICULUM_VERSION_INVALID_TRANSITION,
        );
      }

      if (input.label !== undefined && input.label !== existing.label) {
        const conflicting = await curriculumVersionRepository.findByProgramAndLabelTx(
          tx,
          existing.programId,
          input.label,
        );
        if (conflicting && conflicting.id !== id) {
          throw ApiError.conflict(
            'A curriculum version with this label already exists for this program',
            ErrorCode.DUPLICATE_ENTRY,
          );
        }
      }

      const result = await curriculumVersionRepository.update(tx, id, input);

      await recordAuditTx(tx, {
        actorUserId,
        action: 'UPDATE',
        entityType: AuditEntityType.CURRICULUM_VERSION,
        entityId: existing.id,
        oldValue: { programId: existing.programId, label: existing.label, status: existing.status },
        newValue: { programId: result.programId, label: result.label, status: result.status },
      });

      return result;
    });

    curriculumLogger.info('Curriculum version updated', {
      actorUserId,
      curriculumVersionId: updated.id,
    });

    return toCurriculumVersionDTO(updated);
  }

  /**
   * Delete policy:
   *   DRAFT   -> deletable only if nothing references it (semesters,
   *              admissions, enrollments) -> else 409 HAS_REFERENCES
   *   ACTIVE  -> 409 INVALID_TRANSITION (retire it instead)
   *   RETIRED -> 409 INVALID_TRANSITION (permanent historical record)
   *
   * The lifecycle rule is enforced explicitly, not left to Postgres. The FK
   * (Restrict) remains the final backstop for a race: a P2003 from the
   * DELETE itself is translated here into the same domain conflict rather
   * than leaking the generic "references a record that does not exist"
   * mapping (which describes an insert/update, not a delete).
   */
  async deleteCurriculumVersion(actorUserId: string, id: CurriculumVersionId): Promise<void> {
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const existing = await curriculumVersionRepository.findByIdTx(tx, id);
      if (!existing) {
        throw ApiError.notFound('Curriculum version not found', ErrorCode.RECORD_NOT_FOUND);
      }

      if (existing.status === 'ACTIVE') {
        throw ApiError.conflict(
          'An active curriculum version cannot be deleted. Retire it instead.',
          ErrorCode.CURRICULUM_VERSION_INVALID_TRANSITION,
        );
      }
      if (existing.status === 'RETIRED') {
        throw ApiError.conflict(
          'A retired curriculum version is a permanent historical record and cannot be deleted',
          ErrorCode.CURRICULUM_VERSION_INVALID_TRANSITION,
        );
      }

      const referenced = await curriculumVersionRepository.hasDependentRecords(tx, id);
      if (referenced) {
        throw ApiError.conflict(
          'This curriculum version cannot be deleted because other records still reference it ' +
            '(semesters, admissions, or student enrollments)',
          ErrorCode.CURRICULUM_VERSION_HAS_REFERENCES,
        );
      }

      let deleted: boolean;
      try {
        deleted = await curriculumVersionRepository.deleteIfDraft(tx, id);
      } catch (error) {
        if (isForeignKeyViolation(error)) {
          throw ApiError.conflict(
            'This curriculum version cannot be deleted because another record still references it',
            ErrorCode.CURRICULUM_VERSION_HAS_REFERENCES,
          );
        }
        throw error;
      }

      if (!deleted) {
        // Lost a race: no longer DRAFT (activated) by the time of the DELETE.
        throw ApiError.conflict(
          'Only a draft curriculum version can be deleted',
          ErrorCode.CURRICULUM_VERSION_INVALID_TRANSITION,
        );
      }

      await recordAuditTx(tx, {
        actorUserId,
        action: 'DELETE',
        entityType: AuditEntityType.CURRICULUM_VERSION,
        entityId: existing.id,
        oldValue: {
          id: existing.id,
          programId: existing.programId,
          label: existing.label,
          status: existing.status,
        },
        newValue: null,
      });
    });

    curriculumLogger.info('Curriculum version deleted', { actorUserId, curriculumVersionId: id });
  }

  /**
   * DRAFT -> ACTIVE, gated by structural readiness.
   *
   * Order is deliberate:
   *   1. read + fast status check (clear 409 for the common mistake)
   *   2. atomic conditional flip DRAFT -> ACTIVE. This takes the row lock;
   *      a losing concurrent activation gets null -> 409.
   *   3. read the structure snapshot and evaluate readiness. Because the
   *      lock is already held, structure edits (which lock the same row
   *      while DRAFT) cannot interleave.
   *   4. readiness failure -> throw 422; the transaction rolls back and the
   *      version remains DRAFT. Nothing is audited.
   *   5. audit in the same transaction.
   */
  async activateCurriculumVersion(
    actorUserId: string,
    id: CurriculumVersionId,
  ): Promise<CurriculumVersionDTO> {
    const activated = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const existing = await curriculumVersionRepository.findByIdTx(tx, id);
      if (!existing) {
        throw ApiError.notFound('Curriculum version not found', ErrorCode.RECORD_NOT_FOUND);
      }
      if (existing.status !== 'DRAFT') {
        throw ApiError.conflict(
          'Only a draft curriculum version can be activated',
          ErrorCode.CURRICULUM_VERSION_INVALID_TRANSITION,
        );
      }

      const result = await curriculumVersionRepository.transitionStatus(tx, id, 'DRAFT', 'ACTIVE');
      if (!result) {
        throw ApiError.conflict(
          'Only a draft curriculum version can be activated',
          ErrorCode.CURRICULUM_VERSION_INVALID_TRANSITION,
        );
      }

      const snapshot = await curriculumVersionRepository.findActivationSnapshotTx(tx, id);
      if (!snapshot) {
        throw ApiError.notFound('Curriculum version not found', ErrorCode.RECORD_NOT_FOUND);
      }

      const violations = evaluateActivationReadiness(snapshot);
      if (violations.length > 0) {
        throw ApiError.unprocessable(
          formatReadinessFailure(violations),
          ErrorCode.CURRICULUM_VERSION_NOT_READY,
        );
      }

      await recordAuditTx(tx, {
        actorUserId,
        action: 'UPDATE',
        entityType: AuditEntityType.CURRICULUM_VERSION,
        entityId: existing.id,
        oldValue: { status: 'DRAFT' },
        newValue: { status: result.status },
      });

      return result;
    });

    curriculumLogger.info('Curriculum version activated', {
      actorUserId,
      curriculumVersionId: activated.id,
    });

    return toCurriculumVersionDTO(activated);
  }

  /**
   * ACTIVE -> RETIRED. Existing admissions and enrollments that reference the
   * version are untouched and remain valid; only NEW admissions are blocked.
   */
  async retireCurriculumVersion(
    actorUserId: string,
    id: CurriculumVersionId,
  ): Promise<CurriculumVersionDTO> {
    const retired = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const existing = await curriculumVersionRepository.findByIdTx(tx, id);
      if (!existing) {
        throw ApiError.notFound('Curriculum version not found', ErrorCode.RECORD_NOT_FOUND);
      }
      if (existing.status !== 'ACTIVE') {
        throw ApiError.conflict(
          'Only an active curriculum version can be retired',
          ErrorCode.CURRICULUM_VERSION_INVALID_TRANSITION,
        );
      }

      const result = await curriculumVersionRepository.transitionStatus(
        tx,
        id,
        'ACTIVE',
        'RETIRED',
      );
      if (!result) {
        throw ApiError.conflict(
          'Only an active curriculum version can be retired',
          ErrorCode.CURRICULUM_VERSION_INVALID_TRANSITION,
        );
      }

      await recordAuditTx(tx, {
        actorUserId,
        action: 'UPDATE',
        entityType: AuditEntityType.CURRICULUM_VERSION,
        entityId: existing.id,
        oldValue: { status: 'ACTIVE' },
        newValue: { status: result.status },
      });

      return result;
    });

    curriculumLogger.info('Curriculum version retired', {
      actorUserId,
      curriculumVersionId: retired.id,
    });

    return toCurriculumVersionDTO(retired);
  }
}

export const curriculumVersionService = new CurriculumVersionService();
