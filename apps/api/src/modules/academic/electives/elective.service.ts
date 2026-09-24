// apps/api/src/modules/academic/electives/elective.service.ts

import type { Prisma } from '@spark/database/client';

import { ApiError } from '../../../common/errors/ApiError.js';
import { ErrorCode } from '../../../common/errors/ErrorCodes.js';
import { electiveGroupLogger } from '../../../lib/logger.js';
import { prisma } from '../../../lib/prisma.js';
import { recordAuditTx } from '../../audit/audit.service.js';
import { AuditEntityType } from '../../audit/audit.types.js';
import { assertSemesterStructureMutableTx } from '../curricula/curriculum.guard.js';

import { toElectiveGroupDTO, toElectiveGroupDTOList } from './elective.mapper.js';
import { electiveGroupRepository } from './elective.repository.js';
import type {
  CreateElectiveGroupInput,
  ElectiveGroupDTO,
  ElectiveGroupId,
  ListElectiveGroupsFilters,
  ListElectiveGroupsOptions,
  ListElectiveGroupsResult,
  UpdateElectiveGroupInput,
} from './elective.types.js';

/**
 * Business-logic layer for the ElectiveGroup domain.
 *
 * Every mutation (create, update, delete) begins with
 * `assertSemesterStructureMutableTx`, inside the write transaction:
 * the semester's CurriculumVersion must be DRAFT (409
 * CURRICULUM_VERSION_STRUCTURE_FROZEN — the primary rule), and the semester
 * must have no academic history (409 SEMESTER_CATALOG_HISTORICAL).
 *
 * Also owns: the `minSelect <= maxSelect` invariant, validated against the
 * EFFECTIVE resulting state (schema defaults on create, existing row on
 * update); `(semesterCatalogId, name)` uniqueness messaging;
 * `semesterCatalogId` immutability.
 *
 * Deleting a group that Subjects or StudentElectiveSelections still
 * reference is rejected by the database (Restrict) — not pre-checked here.
 * `@@unique([semesterCatalogId, name])` is the final duplicate guarantee.
 */
export class ElectiveGroupService {
  /** Mirror the `@default(1)` on ElectiveGroup.minSelect/maxSelect for effective-state validation. */
  private static readonly DEFAULT_MIN_SELECT = 1;
  private static readonly DEFAULT_MAX_SELECT = 1;

  async createElectiveGroup(
    actorUserId: string,
    input: CreateElectiveGroupInput,
  ): Promise<ElectiveGroupDTO> {
    const effectiveMinSelect = input.minSelect ?? ElectiveGroupService.DEFAULT_MIN_SELECT;
    const effectiveMaxSelect = input.maxSelect ?? ElectiveGroupService.DEFAULT_MAX_SELECT;
    if (effectiveMinSelect > effectiveMaxSelect) {
      throw ApiError.badRequest(
        'minSelect cannot be greater than maxSelect',
        ErrorCode.VALIDATION_ERROR,
      );
    }

    const electiveGroup = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await assertSemesterStructureMutableTx(tx, input.semesterCatalogId);

      const nameTaken = await electiveGroupRepository.findBySemesterCatalogAndNameTx(
        tx,
        input.semesterCatalogId,
        input.name,
      );
      if (nameTaken) {
        throw ApiError.conflict(
          'An elective group with this name already exists in this semester catalog',
          ErrorCode.DUPLICATE_ENTRY,
        );
      }

      const created = await electiveGroupRepository.create(tx, input);

      await recordAuditTx(tx, {
        actorUserId,
        action: 'CREATE',
        entityType: AuditEntityType.ELECTIVE_GROUP,
        entityId: created.id,
        newValue: {
          id: created.id,
          semesterCatalogId: created.semesterCatalogId,
          name: created.name,
          minSelect: created.minSelect,
          maxSelect: created.maxSelect,
        },
      });

      return created;
    });

    electiveGroupLogger.info('Elective group created', {
      actorUserId,
      electiveGroupId: electiveGroup.id,
      semesterCatalogId: electiveGroup.semesterCatalogId,
    });

    return toElectiveGroupDTO(electiveGroup);
  }

  /** Not audited — routine read. */
  async getElectiveGroupById(id: ElectiveGroupId): Promise<ElectiveGroupDTO> {
    const electiveGroup = await electiveGroupRepository.findById(id);
    if (!electiveGroup) {
      throw ApiError.notFound('Elective group not found', ErrorCode.RECORD_NOT_FOUND);
    }
    return toElectiveGroupDTO(electiveGroup);
  }

  /** Not audited — routine read. No per-row lookups (no N+1). */
  async listElectiveGroups(
    filters: ListElectiveGroupsFilters,
    options: ListElectiveGroupsOptions,
  ): Promise<ListElectiveGroupsResult> {
    const result = await electiveGroupRepository.findMany(filters, options);
    return {
      electiveGroups: toElectiveGroupDTOList(result.electiveGroups),
      total: result.total,
    };
  }

  async updateElectiveGroup(
    actorUserId: string,
    id: ElectiveGroupId,
    input: UpdateElectiveGroupInput,
  ): Promise<ElectiveGroupDTO> {
    const updated = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const existing = await electiveGroupRepository.findByIdTx(tx, id);
      if (!existing) {
        throw ApiError.notFound('Elective group not found', ErrorCode.RECORD_NOT_FOUND);
      }

      await assertSemesterStructureMutableTx(tx, existing.semesterCatalogId);

      const effectiveMinSelect = input.minSelect ?? existing.minSelect;
      const effectiveMaxSelect = input.maxSelect ?? existing.maxSelect;
      if (effectiveMinSelect > effectiveMaxSelect) {
        throw ApiError.badRequest(
          'minSelect cannot be greater than maxSelect',
          ErrorCode.VALIDATION_ERROR,
        );
      }

      if (input.name !== undefined && input.name !== existing.name) {
        const conflicting = await electiveGroupRepository.findBySemesterCatalogAndNameTx(
          tx,
          existing.semesterCatalogId,
          input.name,
        );
        if (conflicting && conflicting.id !== id) {
          throw ApiError.conflict(
            'An elective group with this name already exists in this semester catalog',
            ErrorCode.DUPLICATE_ENTRY,
          );
        }
      }

      const result = await electiveGroupRepository.update(tx, id, input);

      await recordAuditTx(tx, {
        actorUserId,
        action: 'UPDATE',
        entityType: AuditEntityType.ELECTIVE_GROUP,
        entityId: existing.id,
        oldValue: {
          semesterCatalogId: existing.semesterCatalogId,
          name: existing.name,
          minSelect: existing.minSelect,
          maxSelect: existing.maxSelect,
        },
        newValue: {
          semesterCatalogId: result.semesterCatalogId,
          name: result.name,
          minSelect: result.minSelect,
          maxSelect: result.maxSelect,
        },
      });

      return result;
    });

    electiveGroupLogger.info('Elective group updated', {
      actorUserId,
      electiveGroupId: updated.id,
      semesterCatalogId: updated.semesterCatalogId,
    });

    return toElectiveGroupDTO(updated);
  }

  async deleteElectiveGroup(actorUserId: string, id: ElectiveGroupId): Promise<void> {
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const existing = await electiveGroupRepository.findByIdTx(tx, id);
      if (!existing) {
        throw ApiError.notFound('Elective group not found', ErrorCode.RECORD_NOT_FOUND);
      }

      await assertSemesterStructureMutableTx(tx, existing.semesterCatalogId);

      await electiveGroupRepository.delete(tx, id);

      await recordAuditTx(tx, {
        actorUserId,
        action: 'DELETE',
        entityType: AuditEntityType.ELECTIVE_GROUP,
        entityId: existing.id,
        oldValue: {
          id: existing.id,
          semesterCatalogId: existing.semesterCatalogId,
          name: existing.name,
          minSelect: existing.minSelect,
          maxSelect: existing.maxSelect,
        },
        newValue: null,
      });
    });

    electiveGroupLogger.info('Elective group deleted', { actorUserId, electiveGroupId: id });
  }
}

export const electiveGroupService = new ElectiveGroupService();
