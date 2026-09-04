// apps/api/src/modules/admissions/admission.service.ts

import type { Prisma } from '@spark/database/client';

import { ApiError } from '../../common/errors/ApiError.js';
import { ErrorCode } from '../../common/errors/ErrorCodes.js';
import { admissionLogger } from '../../lib/logger.js';
import { prisma } from '../../lib/prisma.js';
import { curriculumVersionRepository } from '../academic/curricula/curriculum.repository.js';
import { programRepository } from '../academic/programs/program.repository.js';
import { semesterCatalogRepository } from '../academic/SemesterCatalog/semester.repository.js';
import { recordAuditTx } from '../audit/audit.service.js';
import { AuditEntityType } from '../audit/audit.types.js';
import { userRepository } from '../user/user.repository.js';

import { toAdmissionDTO, toAdmissionDTOList } from './admission.mapper.js';
import { admissionRepository } from './admission.repository.js';
import type {
  AdmissionDTO,
  AdmissionId,
  CreateAdmissionInput,
  ListAdmissionsFilters,
  ListAdmissionsOptions,
  ListAdmissionsResult,
  UpdateAdmissionInput,
} from './admission.types.js';

/**
 * Business-logic layer for the Admission domain.
 *
 * Admission is a permanent historical record: CONFIRMED -> CANCELLED is
 * the only transition, cancellation is irreversible, and there is no
 * delete operation at any layer (service, repository, controller, or
 * route). Generic update() only ever touches admissionDate/quota
 * (UpdateAdmissionInput has no `status` key) and is refused entirely once
 * an admission is CANCELLED — see updateAdmission.
 *
 * CREATE/UPDATE/CANCEL each run inside prisma.$transaction and re-read the
 * row via admissionRepository.findByIdTx, so the existence check, the
 * audit oldValue snapshot, and the mutation are transactionally
 * consistent — mirrors ProgramService/CurriculumVersionService. Reads
 * (getAdmissionById/listAdmissions) are never audited.
 *
 * ── CONCURRENT CANCELLATION ──────────────────────────────────────────
 * admissionRepository.cancel() does a conditional
 * `updateMany({ where: { id, status: CONFIRMED } })`, not a plain update.
 * If two cancellations race, the loser's updateMany matches zero rows
 * (Postgres's default READ COMMITTED isolation blocks the loser's UPDATE
 * on the winner's row lock, then re-evaluates the WHERE clause against
 * the now-committed row once unblocked) — it never re-flips or silently
 * no-ops, it reports ADMISSION_CANCELLED_PROTECTED like any other
 * already-cancelled attempt.
 *
 * ── WHY "ALREADY CANCELLED" IS A CONFLICT, NOT A SILENT SUCCESS ───────
 * No verified sibling state-transition service (curriculum, academic
 * year, role archive/restore) was available to copy an established
 * idempotency convention from — this was inferred from two pieces of
 * secondary evidence already in this codebase rather than invented from
 * scratch: role.bootstrap.ts explicitly throws instead of silently
 * no-op'ing when a target role is already in an unexpected state, and
 * PromotionBatch's schema comment states FINALIZED must make related
 * records immutable. The same ErrorCode
 * (ErrorCode.ADMISSION_CANCELLED_PROTECTED) covers re-cancelling and
 * PATCHing a CANCELLED admission — same underlying invariant. Flag this
 * for confirmation once an actual sibling transition service is
 * available.
 */
export class AdmissionService {
  /**
   * Creates an Admission. Sequential existence/hierarchy checks (User,
   * Program, CurriculumVersion + Program-membership, SemesterCatalog +
   * CurriculumVersion-membership) so a failure is attributable to the
   * specific mismatch — see schema.prisma's own comment on the Admission
   * model for why the hierarchy check belongs here, not in Prisma.
   * `existsByAdmissionNumber` is a fast-path only; the DB's
   * `@@unique([admissionNumber])` is the real concurrency guarantee.
   */
  async createAdmission(actorUserId: string, input: CreateAdmissionInput): Promise<AdmissionDTO> {
    const user = await userRepository.findById(input.userId);
    if (!user) {
      throw ApiError.notFound('User not found', ErrorCode.RECORD_NOT_FOUND);
    }

    const program = await programRepository.findById(input.initialProgramId);
    if (!program) {
      throw ApiError.notFound('Program not found', ErrorCode.RECORD_NOT_FOUND);
    }

    const curriculumVersion = await curriculumVersionRepository.findById(input.initialCurriculumId);
    if (!curriculumVersion) {
      throw ApiError.notFound('Curriculum version not found', ErrorCode.RECORD_NOT_FOUND);
    }
    if (curriculumVersion.programId !== input.initialProgramId) {
      throw ApiError.unprocessable(
        'The selected curriculum version does not belong to the selected program',
        ErrorCode.ACADEMIC_HIERARCHY_MISMATCH,
      );
    }

    const semesterCatalog = await semesterCatalogRepository.findById(input.entrySemesterCatalogId);
    if (!semesterCatalog) {
      throw ApiError.notFound('Semester catalog not found', ErrorCode.RECORD_NOT_FOUND);
    }
    if (semesterCatalog.curriculumVersionId !== input.initialCurriculumId) {
      throw ApiError.unprocessable(
        'The selected entry semester does not belong to the selected curriculum version',
        ErrorCode.ACADEMIC_HIERARCHY_MISMATCH,
      );
    }

    const admissionNumberTaken = await admissionRepository.existsByAdmissionNumber(
      input.admissionNumber,
    );
    if (admissionNumberTaken) {
      throw ApiError.conflict(
        'An admission with this admission number already exists',
        ErrorCode.DUPLICATE_ENTRY,
      );
    }

    const admission = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const created = await admissionRepository.create(tx, input, actorUserId);

      await recordAuditTx(tx, {
        actorUserId,
        action: 'CREATE',
        entityType: AuditEntityType.ADMISSION,
        entityId: created.id,
        newValue: {
          id: created.id,
          userId: created.userId,
          admissionNumber: created.admissionNumber,
          admissionDate: created.admissionDate.toISOString(),
          admissionType: created.admissionType,
          entrySemesterCatalogId: created.entrySemesterCatalogId,
          quota: created.quota,
          status: created.status,
          admittedByUserId: created.admittedByUserId,
          initialProgramId: created.initialProgramId,
          initialCurriculumId: created.initialCurriculumId,
        },
      });

      return created;
    });

    admissionLogger.info('Admission created', {
      actorUserId,
      admissionId: admission.id,
      admissionNumber: admission.admissionNumber,
    });

    return toAdmissionDTO(admission);
  }

  /** Not audited — routine read. */
  async getAdmissionById(id: AdmissionId): Promise<AdmissionDTO> {
    const admission = await admissionRepository.findById(id);
    if (!admission) {
      throw ApiError.notFound('Admission not found', ErrorCode.RECORD_NOT_FOUND);
    }
    return toAdmissionDTO(admission);
  }

  /**
   * Not audited — routine read. Cancelled admissions are never filtered
   * out — they remain queryable via list/get unless the caller explicitly
   * passes status=CONFIRMED or status=CANCELLED.
   */
  async listAdmissions(
    filters: ListAdmissionsFilters,
    options: ListAdmissionsOptions,
  ): Promise<ListAdmissionsResult> {
    const result = await admissionRepository.findMany(filters, options);
    return {
      admissions: toAdmissionDTOList(result.admissions),
      total: result.total,
    };
  }

  /**
   * Updates admissionDate/quota only. Refused entirely once the admission
   * is CANCELLED — a cancelled admission is a closed historical record
   * (see class header). This is the only place that check happens; the
   * repository stays persistence-only.
   */
  async updateAdmission(
    actorUserId: string,
    id: AdmissionId,
    input: UpdateAdmissionInput,
  ): Promise<AdmissionDTO> {
    const updated = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const existing = await admissionRepository.findByIdTx(tx, id);
      if (!existing) {
        throw ApiError.notFound('Admission not found', ErrorCode.RECORD_NOT_FOUND);
      }

      if (existing.status === 'CANCELLED') {
        throw ApiError.conflict(
          'A cancelled admission is a permanent historical record and cannot be updated',
          ErrorCode.ADMISSION_CANCELLED_PROTECTED,
        );
      }

      const result = await admissionRepository.update(tx, id, input);

      await recordAuditTx(tx, {
        actorUserId,
        action: 'UPDATE',
        entityType: AuditEntityType.ADMISSION,
        entityId: existing.id,
        oldValue: {
          admissionDate: existing.admissionDate.toISOString(),
          quota: existing.quota,
        },
        newValue: {
          admissionDate: result.admissionDate.toISOString(),
          quota: result.quota,
        },
      });

      return result;
    });

    admissionLogger.info('Admission updated', {
      actorUserId,
      admissionId: updated.id,
    });

    return toAdmissionDTO(updated);
  }

  /**
   * Cancels a CONFIRMED admission. Dedicated command — not a generic
   * status setter — so there is no code path that can drive any
   * transition other than CONFIRMED -> CANCELLED. See class header for
   * the concurrency guarantee and for why "already cancelled" is a
   * conflict rather than a silent success.
   */
  async cancelAdmission(actorUserId: string, id: AdmissionId): Promise<AdmissionDTO> {
    const updated = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const existing = await admissionRepository.findByIdTx(tx, id);
      if (!existing) {
        throw ApiError.notFound('Admission not found', ErrorCode.RECORD_NOT_FOUND);
      }

      if (existing.status === 'CANCELLED') {
        throw ApiError.conflict(
          'Admission is already cancelled',
          ErrorCode.ADMISSION_CANCELLED_PROTECTED,
        );
      }

      const result = await admissionRepository.cancel(tx, id);
      if (!result) {
        // Lost a concurrent race — another transaction cancelled it first.
        throw ApiError.conflict(
          'Admission is already cancelled',
          ErrorCode.ADMISSION_CANCELLED_PROTECTED,
        );
      }

      await recordAuditTx(tx, {
        actorUserId,
        action: 'UPDATE',
        entityType: AuditEntityType.ADMISSION,
        entityId: existing.id,
        oldValue: { status: existing.status },
        newValue: { status: result.status },
      });

      return result;
    });

    admissionLogger.info('Admission cancelled', {
      actorUserId,
      admissionId: updated.id,
      admissionNumber: updated.admissionNumber,
    });

    return toAdmissionDTO(updated);
  }
}

export const admissionService = new AdmissionService();
