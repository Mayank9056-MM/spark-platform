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
 * Service-level logs cover successful state-changing administrative
 * operations (create/update/delete) via `curriculumLogger`, emitted only
 * after each operation's transaction has resolved successfully. Audit
 * records (`recordAuditTx`) remain the authoritative business history —
 * these logs are operational visibility only and never duplicate
 * `oldValue`/`newValue`. Routine reads are not logged.
 */
export class CurriculumVersionService {
  /**
   * Creates a CurriculumVersion.
   *
   * Program existence is checked first — a CurriculumVersion cannot be
   * meaningfully created against a Program that doesn't exist, and this
   * yields a clean domain-level 404 rather than relying on the
   * database's foreign-key constraint (P2003) to surface as a generic
   * "references a record that does not exist" 400. Mirrors
   * ProgramService.createProgram's identical Department-existence check.
   *
   * `existsByProgramAndLabel` runs next — a fast-path check only, for a
   * friendlier conflict message, NOT the concurrency guarantee. Two
   * concurrent requests can both pass this check; the database's
   * `@@unique([programId, label])` constraint is what actually prevents
   * a duplicate, surfaced as a Prisma P2002 that the centralized Prisma
   * error mapper turns into a 409 — if that happens, the transaction
   * (create + audit) rolls back together, so no orphaned audit row is
   * ever written for a create that didn't actually happen.
   *
   * `status`, if omitted, is left for the database's `@default(DRAFT)`
   * to apply — `curriculumVersionRepository.create` already only writes
   * `status` when it is explicitly supplied.
   *
   * `newValue` includes `id` alongside the rest of the persisted fields,
   * matching DepartmentService.createDepartment/ProgramService
   * .createProgram's identical choice to make the create audit snapshot
   * self-contained, and is taken from the actual persisted row returned
   * by the repository, never reconstructed from `input`.
   */
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

  /**
   * Returns a CurriculumVersion by ID. Not audited — routine read. Never
   * queries Program — `CurriculumVersionDTO.programId` is already a
   * plain id, and a plain lookup has no reason to force-load the owning
   * Program.
   */
  async getCurriculumVersionById(id: CurriculumVersionId): Promise<CurriculumVersionDTO> {
    const curriculumVersion = await curriculumVersionRepository.findById(id);
    if (!curriculumVersion) {
      throw ApiError.notFound('Curriculum version not found', ErrorCode.RECORD_NOT_FOUND);
    }
    return toCurriculumVersionDTO(curriculumVersion);
  }

  /**
   * Lists curriculum versions using the filters/options supplied by the
   * caller. Not audited — routine read. Pagination, sorting, filtering
   * (search/programId/status) are all performed by
   * `curriculumVersionRepository.findMany` — this method does not
   * implement any of them itself, and never queries Program per result
   * row (no N+1).
   */
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
   * Updates the mutable `label` and `status` fields. `programId` cannot
   * be changed through this method — see the class-level doc comment.
   *
   * The existence check, the `oldValue` snapshot, the `(programId,
   * label)` conflict check, and the update all happen inside one
   * transaction via `findByIdTx` / `findByProgramAndLabelTx` — see the
   * class-level "WHY UPDATE/DELETE RE-READ INSIDE THE TRANSACTION" and
   * "(programId, label) UNIQUENESS ON UPDATE" notes. No status
   * transition legality check is performed — see the class-level
   * "LIFECYCLE (STATUS)" note; no such policy is established anywhere
   * in this repository.
   *
   * `oldValue`/`newValue` both include `programId` even though it cannot
   * change through this method — matching ProgramService.updateProgram's
   * identical choice to include its own immutable `departmentId` in both
   * snapshots, for audit-record context/completeness rather than to
   * imply mutability. Both are taken from actual persisted
   * CurriculumVersion state (the pre-update row and the post-update
   * result respectively) — `input` is never echoed directly.
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
        oldValue: {
          programId: existing.programId,
          label: existing.label,
          status: existing.status,
        },
        newValue: {
          programId: result.programId,
          label: result.label,
          status: result.status,
        },
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
   * Deletes a CurriculumVersion.
   *
   * Existence check, `oldValue` snapshot, and the delete all happen
   * inside one transaction via `findByIdTx` — same reasoning as
   * `updateCurriculumVersion`. If the CurriculumVersion still has
   * SemesterCatalog, StudentEnrollment, or Admission rows referencing it
   * (all required foreign keys with no cascade declared in
   * schema.prisma), Postgres rejects the deletion (P2003, mapped to 400
   * by prisma-error.mapper.ts) — that error propagates out of the
   * transaction callback, which rolls the whole transaction back: the
   * delete does not happen, no audit row is written, and the
   * CurriculumVersion remains intact. This service does not
   * cascade-delete any of that academic history, does not soft-delete,
   * and does not invent an archival/status-based deletion rule — nothing
   * in this repository establishes one, and none is assumed (see the
   * class-level "LIFECYCLE (STATUS)" note — the same "no evidence, no
   * rule" stance applies to deletion eligibility).
   */
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

    curriculumLogger.info('Curriculum version deleted', {
      actorUserId,
      curriculumVersionId: id,
    });
  }
}

export const curriculumVersionService = new CurriculumVersionService();
