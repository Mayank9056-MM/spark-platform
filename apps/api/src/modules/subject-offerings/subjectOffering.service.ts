// apps/api/src/modules/subject-offerings/subjectOffering.service.ts

import type { Prisma } from '@spark/database/client';

import { ApiError } from '../../common/errors/ApiError.js';
import { ErrorCode } from '../../common/errors/ErrorCodes.js';
import { subjectOfferingLogger } from '../../lib/logger.js';
import { prisma } from '../../lib/prisma.js';
import { subjectRepository } from '../academic/subjects/subject.repository.js';
import { academicYearRepository } from '../academic-years/academic-year.repository.js';
import { recordAuditTx } from '../audit/audit.service.js';
import { AuditEntityType } from '../audit/audit.types.js';

import { toSubjectOfferingDTO, toSubjectOfferingDTOList } from './subjectOffering.mapper.js';
import { subjectOfferingRepository } from './subjectOffering.repository.js';
import type {
  CreateSubjectOfferingInput,
  ListSubjectOfferingsFilters,
  ListSubjectOfferingsOptions,
  ListSubjectOfferingsResult,
  SubjectOfferingDTO,
  SubjectOfferingId,
} from './subjectOffering.types.js';

/**
 * Business-logic layer for the SubjectOffering domain.
 *
 * Key invariants this service enforces on create:
 * 1. The referenced Subject must exist.
 * 2. The referenced AcademicYear must exist.
 * 3. No SubjectOffering may already exist for the same
 *    `(subjectId, academicYearId)` pair — mirrored by the schema's
 *    `@@unique([subjectId, academicYearId])`.
 *
 * Unlike SemesterEnrollmentService, there is no curriculum-hierarchy
 * cross-check between Subject and AcademicYear to perform — Subject's
 * academic placement lives entirely on `semesterCatalogId`
 * (subject.types.ts), which has no relationship to AcademicYear at all
 * (AcademicYear is a real enrollment term; SemesterCatalog's "year" is a
 * deliberately non-persisted derived value — see semester.types.ts). The
 * two identity fields here are independent references with no agreement
 * to validate beyond each existing.
 *
 * The existence checks and the duplicate pre-check are all fast-path
 * conveniences for a deterministic 404/409 response, not the concurrency
 * guarantee — same posture as every sibling service. The database's
 * `@@unique([subjectId, academicYearId])` constraint remains the final
 * authority: two concurrent transactions can both pass the pre-check,
 * and the losing `create()` call surfaces a P2002 that this service does
 * not catch, left to propagate to the centralized Prisma-error-handling
 * middleware, matching AcademicYearService/SemesterEnrollmentService/
 * StudentEnrollmentService's identical choice not to translate Prisma
 * errors at this layer.
 *
 * create runs inside one `prisma.$transaction`, re-reading Subject/
 * AcademicYear/the duplicate check via `*Tx` methods within that same
 * transaction (never a pre-fetch outside it), with the audit write in
 * the same transaction — matching every sibling service's shape exactly.
 *
 * No `updateSubjectOffering`/`deleteSubjectOffering` — `subjectOffering.
 * types.ts` defines no `UpdateSubjectOfferingInput`, and
 * `subjectOffering.repository.ts` exposes no `update`/`delete` methods.
 * `subjectId`/`academicYearId` are the only two fields this model has
 * beyond id/timestamps, and both are referenced by id from
 * `FacultyAssignment`/`Timetable`/`Lecture`/`Assignment`/`StudyMaterial`
 * the moment any downstream teaching activity exists, so there is no
 * generic PATCH/delete contract to orchestrate here.
 *
 * getSubjectOfferingById/listSubjectOfferings are plain, unaudited reads
 * with no transaction, matching every sibling service's identical read
 * methods. list is a thin pass-through — filtering/pagination/sorting
 * all happen in `subjectOfferingRepository.list`.
 */
export class SubjectOfferingService {
  async createSubjectOffering(
    actorUserId: string,
    input: CreateSubjectOfferingInput,
  ): Promise<SubjectOfferingDTO> {
    const created = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const subject = await subjectRepository.findByIdTx(tx, input.subjectId);
      if (!subject) {
        throw ApiError.notFound('Subject not found', ErrorCode.RECORD_NOT_FOUND);
      }

      const academicYear = await academicYearRepository.findByIdTx(tx, input.academicYearId);
      if (!academicYear) {
        throw ApiError.notFound('Academic year not found', ErrorCode.RECORD_NOT_FOUND);
      }

      const existing = await subjectOfferingRepository.findBySubjectIdAndAcademicYearIdTx(
        tx,
        input.subjectId,
        input.academicYearId,
      );
      if (existing) {
        throw ApiError.conflict(
          'A subject offering already exists for this subject and academic year',
          ErrorCode.DUPLICATE_ENTRY,
        );
      }

      const offering = await subjectOfferingRepository.create(tx, input);

      await recordAuditTx(tx, {
        actorUserId,
        action: 'CREATE',
        entityType: AuditEntityType.SUBJECT_OFFERING,
        entityId: offering.id,
        newValue: {
          id: offering.id,
          subjectId: offering.subjectId,
          academicYearId: offering.academicYearId,
        },
      });

      return offering;
    });

    subjectOfferingLogger.info('Subject offering created', {
      actorUserId,
      subjectOfferingId: created.id,
      subjectId: created.subjectId,
      academicYearId: created.academicYearId,
    });

    return toSubjectOfferingDTO(created);
  }

  /** Not audited — routine read. */
  async getSubjectOfferingById(id: SubjectOfferingId): Promise<SubjectOfferingDTO> {
    const offering = await subjectOfferingRepository.findById(id);
    if (!offering) {
      throw ApiError.notFound('Subject offering not found', ErrorCode.RECORD_NOT_FOUND);
    }
    return toSubjectOfferingDTO(offering);
  }

  /** Not audited — routine read. Thin pass-through; the repository owns filtering/pagination/sorting. */
  async listSubjectOfferings(
    filters: ListSubjectOfferingsFilters,
    options: ListSubjectOfferingsOptions,
  ): Promise<ListSubjectOfferingsResult> {
    const result = await subjectOfferingRepository.list(filters, options);
    return {
      subjectOfferings: toSubjectOfferingDTOList(result.subjectOfferings),
      total: result.total,
    };
  }
}

export const subjectOfferingService = new SubjectOfferingService();
