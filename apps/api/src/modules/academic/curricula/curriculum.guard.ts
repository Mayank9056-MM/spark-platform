// apps/api/src/modules/academic/curricula/curriculum.guard.ts

import type { CurriculumVersion, Prisma, SemesterCatalog } from '@spark/database/client';

import { ApiError } from '../../../common/errors/ApiError.js';
import { ErrorCode } from '../../../common/errors/ErrorCodes.js';
import { semesterCatalogRepository } from '../SemesterCatalog/semester.repository.js';

import { curriculumVersionRepository } from './curriculum.repository.js';
import type { CurriculumVersionId } from './curriculum.types.js';

/**
 * Structure-freeze guards. A CurriculumVersion's academic structure
 * (semesters, subjects, elective groups) may change ONLY while the version
 * is DRAFT; once ACTIVE or RETIRED it is immutable and a new version must
 * be created instead. The version's own status is the primary rule — the
 * historical-usage check is a secondary safety net layered on top.
 *
 * Both guards must be called INSIDE the caller's `prisma.$transaction`, as
 * the first thing the mutation does, passing that transaction's client.
 * The guard takes a row lock on the version (`lockDraftTx`), held until the
 * transaction ends, which serializes structure edits against each other and
 * against activation.
 */

type Tx = Prisma.TransactionClient;

const FROZEN_MESSAGE =
  'The academic structure of a curriculum version can only be changed while it is a draft. ' +
  'Create a new curriculum version to change an active or retired one.';

function frozen(): ApiError {
  return ApiError.conflict(FROZEN_MESSAGE, ErrorCode.CURRICULUM_VERSION_STRUCTURE_FROZEN);
}

/**
 * Asserts the CurriculumVersion exists and is DRAFT, and locks it for the
 * remainder of the transaction. Returns the loaded row (callers need
 * `programId`).
 *
 *   missing      -> 404 RECORD_NOT_FOUND
 *   ACTIVE/RETIRED -> 409 CURRICULUM_VERSION_STRUCTURE_FROZEN
 */
export async function assertCurriculumStructureMutableTx(
  tx: Tx,
  curriculumVersionId: CurriculumVersionId,
): Promise<CurriculumVersion> {
  const curriculumVersion = await curriculumVersionRepository.findByIdTx(tx, curriculumVersionId);
  if (!curriculumVersion) {
    throw ApiError.notFound('Curriculum version not found', ErrorCode.RECORD_NOT_FOUND);
  }
  if (curriculumVersion.status !== 'DRAFT') {
    throw frozen();
  }

  // Conditional lock: also catches a concurrent activation that committed
  // between the read above and now.
  const locked = await curriculumVersionRepository.lockDraftTx(tx, curriculumVersionId);
  if (!locked) {
    throw frozen();
  }

  return curriculumVersion;
}

/**
 * Guard for anything hanging off a SemesterCatalog (Subject, ElectiveGroup):
 *   1. semester exists                                  (404)
 *   2. its curriculum version is DRAFT (status guard)   (409 STRUCTURE_FROZEN)
 *   3. the semester has no academic history             (409 SEMESTER_CATALOG_HISTORICAL)
 * Order matters: the status guard is the primary rule and runs first.
 */
export async function assertSemesterStructureMutableTx(
  tx: Tx,
  semesterCatalogId: string,
): Promise<SemesterCatalog> {
  const semesterCatalog = await semesterCatalogRepository.findByIdTx(tx, semesterCatalogId);
  if (!semesterCatalog) {
    throw ApiError.notFound('Semester catalog not found', ErrorCode.RECORD_NOT_FOUND);
  }

  await assertCurriculumStructureMutableTx(tx, semesterCatalog.curriculumVersionId);

  const historical = await semesterCatalogRepository.hasHistoricalUsage(tx, semesterCatalogId);
  if (historical) {
    throw ApiError.conflict(
      'This semester already has academic history, so its structure can no longer be changed',
      ErrorCode.SEMESTER_CATALOG_HISTORICAL,
    );
  }

  return semesterCatalog;
}
