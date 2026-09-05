// apps/api/src/modules/semester-enrollments/semesterEnrollment.service.ts

import type { Prisma } from '@spark/database/client';

import { ApiError } from '../../common/errors/ApiError.js';
import { ErrorCode } from '../../common/errors/ErrorCodes.js';
import { semesterEnrollmentLogger } from '../../lib/logger.js';
import { prisma } from '../../lib/prisma.js';
import { programRepository } from '../academic/programs/program.repository.js';
import { semesterCatalogRepository } from '../academic/SemesterCatalog/semester.repository.js';
import { academicYearRepository } from '../academic-years/academic-year.repository.js';
import { admissionRepository } from '../admissions/admission.repository.js';
import { recordAuditTx } from '../audit/audit.service.js';
import { AuditEntityType } from '../audit/audit.types.js';
import { studentEnrollmentRepository } from '../student-enrollments/studentEnrollment.repository.js';

import {
  toSemesterEnrollmentDTO,
  toSemesterEnrollmentDTOList,
} from './semesterEnrollment.mapper.js';
import { semesterEnrollmentRepository } from './semesterEnrollment.repository.js';
import type {
  CreateSemesterEnrollmentInput,
  ListSemesterEnrollmentsFilters,
  ListSemesterEnrollmentsOptions,
  ListSemesterEnrollmentsResult,
  SemesterEnrollmentDTO,
  SemesterEnrollmentId,
} from './semesterEnrollment.types.js';

/**
 * Business-logic layer for the SemesterEnrollment domain.
 *
 * Key invariants this service enforces on create:
 * 1. The referenced StudentEnrollment must exist and be ACTIVE — only an
 *    ACTIVE enrollment may open a new attempt at any semester.
 * 2. The referenced SemesterCatalog must exist and belong to the SAME
 *    CurriculumVersion as the StudentEnrollment
 *    (`semesterCatalog.curriculumVersionId === studentEnrollment.curriculumVersionId`)
 *    — this is the academic-integrity check that prevents a student
 *    enrolled under one curriculum from opening a semester defined by
 *    another.
 * 3. The referenced AcademicYear must exist.
 * 4. The requested SemesterCatalog's `number` must not exceed the
 *    student's Program's `totalSemesters` — the authoritative ceiling,
 *    never hardcoded.
 * 5. A REPEAT (same studentEnrollmentId + semesterCatalogId as an
 *    existing row) is permitted, but not while the latest existing
 *    attempt for that exact pair is still IN_PROGRESS — this service
 *    does not allow two simultaneous live attempts at the same
 *    curriculum semester. This is a service-level check, not a database
 *    constraint (see the KNOWN LIMITATION note on
 *    `createSemesterEnrollment` below).
 * 6. A FIRST-EVER attempt at a given SemesterCatalog (no existing row
 *    for that pair) is only permitted when it matches the student's
 *    Admission.entrySemesterCatalogId — the source of truth for where a
 *    student enters the curriculum (NORMAL/LATERAL/EXCEPTION admissions
 *    may all have different entry points; Semester 1 is never assumed).
 * 7. Any other first-ever attempt at a SemesterCatalog (i.e. progressing
 *    to a semester beyond the entry point) is REJECTED. See the
 *    "PROMOTION BOUNDARY" note below — this is a deliberate, reported
 *    deferral, not an oversight.
 *
 * Attempt-number allocation (`getNextAttemptNumberTx`) and row creation
 * happen inside the SAME `prisma.$transaction`, alongside the audit
 * write — mirroring StudentEnrollmentService's transaction shape
 * exactly. A resulting P2002 (both concurrent transactions computing the
 * same next attempt number) is not caught here; it propagates to the
 * centralized Prisma-error-handling middleware, same as every sibling
 * service.
 *
 * PROMOTION BOUNDARY (read before changing invariant #7 above):
 * Genuine "next normal semester" progression (e.g. the student's latest
 * attempt is Semester 3, and Semester 4 is now being opened as the
 * legitimate next step) is NOT enforced by this service. Determining a
 * student's "current furthest semester" would require reconstructing
 * their full SemesterEnrollment history and cross-referencing each
 * row's SemesterCatalog.number — and the only history-listing method
 * available, `semesterEnrollmentRepository.list()`, is NOT
 * transaction-scoped (it always reads through the plain `prisma`
 * singleton), so it cannot be read consistently inside the same
 * transaction that then allocates an attempt number and creates the
 * row. Rather than approximate this with a stale, non-transactional
 * read — which could silently authorize or reject progression based on
 * a race-prone snapshot — this service rejects every non-repeat,
 * non-entry-semester creation attempt outright. The schema's own
 * PromotionDecision model is the intended authority for authorizing
 * progression to a new semester; once a PromotionDecision
 * repository/service exists, THAT is where "is Semester 4 the
 * legitimate next step after Semester 3" should be decided — not here,
 * and not by walking SemesterEnrollment history as a substitute. See
 * this module's final implementation report for the explicit list of
 * what is enforced now vs. deferred.
 *
 * getSemesterEnrollmentById/listSemesterEnrollments are plain, unaudited
 * reads with no transaction, matching
 * StudentEnrollmentService's identical read methods.
 */
export class SemesterEnrollmentService {
  /**
   * Opens a new SemesterEnrollment (first attempt at the entry semester,
   * or a repeat of an already-attempted semester) for an ACTIVE
   * StudentEnrollment.
   *
   * KNOWN LIMITATION — concurrent repeat requests: the "no simultaneous
   * IN_PROGRESS attempt for the same semester" check reads the latest
   * attempt via `findByStudentEnrollmentIdAndSemesterCatalogIdTx` inside
   * this transaction, but that read is not a row lock. Two concurrent
   * transactions could both observe no IN_PROGRESS row, both pass this
   * check, and both proceed to create — call `getNextAttemptNumberTx`
   * for the same pair, and (per that method's own documented
   * concurrency note) resolve to different attempt numbers without
   * colliding on the unique constraint, since the constraint is on
   * `(studentEnrollmentId, semesterCatalogId, attemptNumber)`, not on
   * "at most one IN_PROGRESS row per pair". This is a real,
   * database-unenforced gap: this service can reduce the race window
   * but cannot close it without either a schema-level partial unique
   * index (e.g. one IN_PROGRESS row per
   * `(studentEnrollmentId, semesterCatalogId)`, mirroring
   * StudentEnrollment's own `student_enrollments_one_active_per_user_idx`
   * pattern) or row-level locking neither this task nor the existing
   * project architecture currently establishes. Flagged in the final
   * report as a suggested schema follow-up, not fixed here.
   */
  async createSemesterEnrollment(
    actorUserId: string,
    input: CreateSemesterEnrollmentInput,
  ): Promise<SemesterEnrollmentDTO> {
    const created = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const studentEnrollment = await studentEnrollmentRepository.findByIdTx(
        tx,
        input.studentEnrollmentId,
      );
      if (!studentEnrollment) {
        throw ApiError.notFound('Student enrollment not found', ErrorCode.RECORD_NOT_FOUND);
      }

      if (studentEnrollment.status !== 'ACTIVE') {
        throw ApiError.conflict(
          'Only an active student enrollment can open a new semester enrollment',
          ErrorCode.STUDENT_ENROLLMENT_NOT_ACTIVE,
        );
      }

      const semesterCatalog = await semesterCatalogRepository.findByIdTx(
        tx,
        input.semesterCatalogId,
      );
      if (!semesterCatalog) {
        throw ApiError.notFound('Semester catalog not found', ErrorCode.RECORD_NOT_FOUND);
      }

      // Academic-integrity invariant: a student may only open semesters
      // defined by their own curriculum version. Reused ErrorCode — see
      // final report: no dedicated code exists for this specific check.
      if (semesterCatalog.curriculumVersionId !== studentEnrollment.curriculumVersionId) {
        throw ApiError.unprocessable(
          'This semester does not belong to the student\u2019s curriculum version',
          ErrorCode.ACADEMIC_HIERARCHY_MISMATCH,
        );
      }

      const academicYear = await academicYearRepository.findByIdTx(tx, input.academicYearId);
      if (!academicYear) {
        throw ApiError.notFound('Academic year not found', ErrorCode.RECORD_NOT_FOUND);
      }

      const program = await programRepository.findByIdTx(tx, studentEnrollment.programId);
      if (!program) {
        throw ApiError.notFound('Program not found', ErrorCode.RECORD_NOT_FOUND);
      }

      // Program.totalSemesters is the authoritative ceiling — never a
      // hardcoded maximum semester number.
      if (semesterCatalog.number > program.totalSemesters) {
        throw ApiError.unprocessable(
          'This semester exceeds the program\u2019s total semester count',
          ErrorCode.ACADEMIC_HIERARCHY_MISMATCH,
        );
      }

      // (studentEnrollmentId, semesterCatalogId) is NOT unique — this
      // returns the LATEST attempt for the pair, or null if the student
      // has never attempted this curriculum semester before.
      const latestAttemptForSemester =
        await semesterEnrollmentRepository.findByStudentEnrollmentIdAndSemesterCatalogIdTx(
          tx,
          input.studentEnrollmentId,
          input.semesterCatalogId,
        );

      if (latestAttemptForSemester) {
        // A REPEAT of a previously attempted semester. Permitted, except
        // while a prior attempt at the SAME semester is still open — see
        // this method's "KNOWN LIMITATION" note above for the concurrency
        // caveat on this specific check.
        if (latestAttemptForSemester.status === 'IN_PROGRESS') {
          throw ApiError.conflict(
            'An in-progress attempt already exists for this semester',
            ErrorCode.DUPLICATE_ENTRY,
          );
        }
      } else {
        // Never attempted this SemesterCatalog before. The ONLY case this
        // service can safely authorize without the promotion domain is
        // the student's very first enrollment, at their admission's
        // recorded entry semester — Semester 1 is never assumed, since
        // LATERAL/EXCEPTION admissions may enter elsewhere.
        const admission = await admissionRepository.findByIdTx(tx, studentEnrollment.admissionId);
        if (!admission) {
          throw ApiError.notFound('Admission not found', ErrorCode.RECORD_NOT_FOUND);
        }

        if (admission.entrySemesterCatalogId !== input.semesterCatalogId) {
          // See this class's "PROMOTION BOUNDARY" doc comment: progressing
          // to any semester beyond the entry point is deliberately
          // deferred to the (not yet implemented) promotion domain, not
          // approximated here.
          throw ApiError.unprocessable(
            'Opening a semester beyond the student\u2019s entry semester requires the promotion workflow, which is not available yet',
            ErrorCode.ACADEMIC_HIERARCHY_MISMATCH,
          );
        }
      }

      const attemptNumber = await semesterEnrollmentRepository.getNextAttemptNumberTx(
        tx,
        input.studentEnrollmentId,
        input.semesterCatalogId,
      );

      const enrollment = await semesterEnrollmentRepository.create(tx, {
        studentEnrollmentId: input.studentEnrollmentId,
        semesterCatalogId: input.semesterCatalogId,
        academicYearId: input.academicYearId,
        attemptNumber,
      });

      await recordAuditTx(tx, {
        actorUserId,
        action: 'CREATE',
        entityType: AuditEntityType.SEMESTER_ENROLLMENT,
        entityId: enrollment.id,
        newValue: {
          id: enrollment.id,
          studentEnrollmentId: enrollment.studentEnrollmentId,
          semesterCatalogId: enrollment.semesterCatalogId,
          academicYearId: enrollment.academicYearId,
          attemptNumber: enrollment.attemptNumber,
          status: enrollment.status,
        },
      });

      return enrollment;
    });

    semesterEnrollmentLogger.info('Semester enrollment created', {
      actorUserId,
      semesterEnrollmentId: created.id,
      studentEnrollmentId: created.studentEnrollmentId,
      semesterCatalogId: created.semesterCatalogId,
      academicYearId: created.academicYearId,
      attemptNumber: created.attemptNumber,
    });

    return toSemesterEnrollmentDTO(created);
  }

  /** Not audited — routine read. */
  async getSemesterEnrollmentById(id: SemesterEnrollmentId): Promise<SemesterEnrollmentDTO> {
    const enrollment = await semesterEnrollmentRepository.findById(id);
    if (!enrollment) {
      throw ApiError.notFound('Semester enrollment not found', ErrorCode.RECORD_NOT_FOUND);
    }
    return toSemesterEnrollmentDTO(enrollment);
  }

  /** Not audited — routine read. Thin pass-through; the repository owns filtering/pagination/sorting. */
  async listSemesterEnrollments(
    filters: ListSemesterEnrollmentsFilters,
    options: ListSemesterEnrollmentsOptions,
  ): Promise<ListSemesterEnrollmentsResult> {
    const result = await semesterEnrollmentRepository.list(filters, options);
    return {
      semesterEnrollments: toSemesterEnrollmentDTOList(result.semesterEnrollments),
      total: result.total,
    };
  }
}

export const semesterEnrollmentService = new SemesterEnrollmentService();
