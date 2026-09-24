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
 * Admission is a permanent historical record: CONFIRMED -> CANCELLED is the
 * only transition, cancellation is irreversible, and there is no delete at
 * any layer. Generic update() only touches admissionDate/quota and is
 * refused once CANCELLED.
 *
 * ── CREATE: AUTHORITATIVE CHECKS RUN INSIDE THE TRANSACTION ───────────
 *   BEGIN
 *     load curriculum version (findByIdTx)                        404
 *     curriculum must be ACTIVE                                   422 CURRICULUM_VERSION_NOT_ADMITTABLE
 *     load program (findByIdTx)                                   404
 *     curriculum.programId === program.id                         422 ACADEMIC_HIERARCHY_MISMATCH
 *     load entry semester (findByIdTx)                            404
 *     semester.curriculumVersionId === curriculum.id              422 ACADEMIC_HIERARCHY_MISMATCH
 *     create admission + audit
 *   COMMIT
 * DRAFT versions are not finished; RETIRED versions take no new intake.
 * Existing admissions/enrollments on a RETIRED version are unaffected. The
 * user-exists and admission-number checks stay outside as fast paths (the FK
 * and `@@unique([admissionNumber])` are the real guarantees).
 *
 * Program/curriculum agreement is additionally enforced by the database via
 * a composite FK (see the migration), so the service check is now a
 * friendlier error in front of a constraint, not the only guard.
 *
 * KNOWN RESIDUAL WINDOW: the ACTIVE check is a plain read under READ
 * COMMITTED. A retirement committing between that read and this insert is
 * not blocked (the FK's key-share lock does not conflict with the
 * retirement's row update). Result: one admission may land on a version
 * retired a moment earlier, which is indistinguishable from the admission
 * having been made just before retirement. Closing it would need a row lock
 * on the version on every admission (serializing intake); not done.
 *
 * ── CONCURRENT CANCELLATION ──────────────────────────────────────────
 * admissionRepository.cancel() is a conditional `updateMany({ where: { id,
 * status: CONFIRMED } })`; the loser matches zero rows and reports
 * ADMISSION_CANCELLED_PROTECTED.
 *
 * "Already cancelled" is a 409 conflict, not a silent success — consistent
 * with the other transition services in this codebase.
 */
export class AdmissionService {
  async createAdmission(actorUserId: string, input: CreateAdmissionInput): Promise<AdmissionDTO> {
    const user = await userRepository.findById(input.userId);
    if (!user) {
      throw ApiError.notFound('User not found', ErrorCode.RECORD_NOT_FOUND);
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
      const curriculumVersion = await curriculumVersionRepository.findByIdTx(
        tx,
        input.initialCurriculumId,
      );
      if (!curriculumVersion) {
        throw ApiError.notFound('Curriculum version not found', ErrorCode.RECORD_NOT_FOUND);
      }

      if (curriculumVersion.status !== 'ACTIVE') {
        throw ApiError.unprocessable(
          'Admissions can only be created against an active curriculum version',
          ErrorCode.CURRICULUM_VERSION_NOT_ADMITTABLE,
        );
      }

      const program = await programRepository.findByIdTx(tx, input.initialProgramId);
      if (!program) {
        throw ApiError.notFound('Program not found', ErrorCode.RECORD_NOT_FOUND);
      }

      if (curriculumVersion.programId !== program.id) {
        throw ApiError.unprocessable(
          'The selected curriculum version does not belong to the selected program',
          ErrorCode.ACADEMIC_HIERARCHY_MISMATCH,
        );
      }

      const semesterCatalog = await semesterCatalogRepository.findByIdTx(
        tx,
        input.entrySemesterCatalogId,
      );
      if (!semesterCatalog) {
        throw ApiError.notFound('Semester catalog not found', ErrorCode.RECORD_NOT_FOUND);
      }

      if (semesterCatalog.curriculumVersionId !== curriculumVersion.id) {
        throw ApiError.unprocessable(
          'The selected entry semester does not belong to the selected curriculum version',
          ErrorCode.ACADEMIC_HIERARCHY_MISMATCH,
        );
      }

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

  /** Not audited — routine read. Cancelled admissions are never filtered out implicitly. */
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

  /** Updates admissionDate/quota only; refused once CANCELLED. */
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

  /** Cancels a CONFIRMED admission. Dedicated command; only CONFIRMED -> CANCELLED is reachable. */
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
