// apps/api/src/modules/academic/curricula/curriculum.service.ts

import type { Prisma } from '@spark/database/client';

import { ApiError } from '../../../common/errors/ApiError.js';
import { ErrorCode } from '../../../common/errors/ErrorCodes.js';
import { curriculumLogger } from '../../../lib/logger.js';
import { prisma } from '../../../lib/prisma.js';
import { recordAuditTx } from '../../audit/audit.service.js';
import { programRepository } from '../programs/program.repository.js';

import { toCurriculumVersionDTO, toCurriculumVersionDTOList } from './curriculum.mapper.js';
import { curriculumVersionRepository } from './curriculum.repository.js';
import type {
  CreateCurriculumVersionInput,
  CurriculumVersionDTO,
  CurriculumVersionId,
  ListCurriculumVersionsFilters,
  ListCurriculumVersionsOptions,
  ListCurriculumVersionsResult,
  UpdateCurriculumVersionInput,
} from './curriculum.types.js';

import { AuditEntityType } from '@/modules/audit/audit.types.js';

/**
 * CurriculumVersion lifecycle (hardening pass):
 *
 *   DRAFT --activate--> ACTIVE --retire--> RETIRED
 *
 * One-way only. DRAFT->RETIRED, ACTIVE->DRAFT, RETIRED->(anything), and
 * repeating the current state are all illegal. `activateCurriculumVersion`
 * and `retireCurriculumVersion` are the ONLY methods that may change
 * `status` — `updateCurriculumVersion` (generic PATCH) additionally
 * refuses to run at all once the version has left DRAFT, since `label`
 * (its only remaining mutable field) must not be freely editable on an
 * ACTIVE or RETIRED version. `UpdateCurriculumVersionInput` has no
 * `status` field, so there is no field-level path into this bypass
 * either — this is enforced at both the type layer and here.
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
   * Updates `label` only (see UpdateCurriculumVersionInput's own note).
   * Refuses to run at all once the version has left DRAFT — this is
   * the "generic update cannot bypass the lifecycle" guard the hardening
   * task requires. Existence check, status check, `oldValue` snapshot,
   * and the update all read the SAME transactionally-consistent row via
   * `findByIdTx`, matching every sibling service's identical reasoning.
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

  async deleteCurriculumVersion(actorUserId: string, id: CurriculumVersionId): Promise<void> {
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const existing = await curriculumVersionRepository.findByIdTx(tx, id);
      if (!existing) {
        throw ApiError.notFound('Curriculum version not found', ErrorCode.RECORD_NOT_FOUND);
      }

      await curriculumVersionRepository.delete(tx, id);

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
   * DRAFT -> ACTIVE. Rejects any other current status. Mutation + audit
   * commit atomically via `updateStatus` + `recordAuditTx` in one
   * transaction, matching AcademicYearService.activateAcademicYear's
   * identical shape for its own single-row state transition.
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

      const result = await curriculumVersionRepository.updateStatus(tx, id, 'ACTIVE');

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

  /** ACTIVE -> RETIRED. Rejects any other current status. Same shape as activateCurriculumVersion. */
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

      const result = await curriculumVersionRepository.updateStatus(tx, id, 'RETIRED');

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
