// apps/api/src/modules/academic/electives/elective.service.ts

import type { Prisma } from '@spark/database/client';

import { ApiError } from '../../../common/errors/ApiError.js';
import { ErrorCode } from '../../../common/errors/ErrorCodes.js';
import { electiveGroupLogger } from '../../../lib/logger.js';
import { prisma } from '../../../lib/prisma.js';
import { recordAuditTx } from '../../audit/audit.service.js';
import { AuditEntityType } from '../../audit/audit.types.js';
import { semesterCatalogRepository } from '../SemesterCatalog/semester.repository.js';

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
 * Owns: SemesterCatalog existence checks, scoped
 * `(semesterCatalogId, name)` uniqueness messaging, `semesterCatalogId`
 * immutability, the `minSelect <= maxSelect` domain invariant (computed
 * against the *effective* resulting state, not just the fields present in
 * a PATCH), transaction boundaries, audit coordination, and DTO mapping.
 * Does not own persistence (elective.repository.ts), HTTP validation
 * (elective.validation.ts), or authorization (route middleware).
 *
 * ── minSelect / maxSelect: EFFECTIVE-STATE VALIDATION ────────────────
 * `ElectiveGroup.minSelect`/`.maxSelect` both carry `@default(1)` in
 * schema.prisma and are unconstrained by any DB CHECK
 * (elective.types.ts's own doc comment on `CreateElectiveGroupInput` /
 * `UpdateElectiveGroupInput`). `ELECTIVE_GROUP_DEFAULT_MIN_SELECT` /
 * `ELECTIVE_GROUP_DEFAULT_MAX_SELECT` below mirror those two schema
 * defaults so this service can reason about the value that will
 * actually be persisted when a field is omitted — `elective.repository
 * .ts.create` still lets Prisma apply the real column default at write
 * time (via its `!== undefined` conditional spread); these constants
 * exist only so the service can validate the *same* effective state the
 * database will end up holding, not to duplicate the write itself.
 * `updateElectiveGroup` computes its effective state from the existing
 * persisted row instead (`input.field ?? existing.field`), per this
 * task's explicit instruction not to validate only the fields present
 * in a PATCH.
 *
 * ── DEPENDENT-RECORD SAFETY: NOT IMPLEMENTED (see class-level gap) ───
 * `Subject.electiveGroupId` (nullable) and
 * `StudentElectiveSelection.electiveGroupId` (required) both reference
 * ElectiveGroup with no cascade declared in schema.prisma, so Postgres
 * rejects a `delete()` that either still references (P2003 -> 400 via
 * prisma-error.mapper.ts). Unlike `SemesterCatalogRepository
 * .hasDependentRecords`, `ElectiveGroupRepository` (as generated in the
 * prior task) exposes NO equivalent existence-check primitive for
 * Subject/StudentElectiveSelection against a given ElectiveGroup id.
 * Per this task's own instruction ("if a required repository primitive
 * is genuinely missing, report that dependency instead of bypassing the
 * architecture" / "do not silently modify the repository unless
 * explicitly asked"), `deleteElectiveGroup` below does NOT pre-check
 * dependents — it mirrors `SubjectService.deleteSubject`'s posture (hard
 * delete, rely on the FK, let P2003 propagate), not
 * `SemesterCatalogService.updateSemesterCatalog`'s pre-check pattern.
 * Likewise, `updateElectiveGroup` does not restrict changing
 * `minSelect`/`maxSelect` once `StudentElectiveSelection` rows exist —
 * no such rule is established anywhere in elective.types.ts,
 * elective.repository.ts, or the schema, and this task explicitly
 * forbids inventing one. Both are listed under "Domain-policy gaps"
 * below rather than silently encoded as behavior.
 *
 * ── NAME CHANGES: NOT RESTRICTED BY DEPENDENTS ────────────────────────
 * `name` is a display field, not the relational identity (`id` is,
 * referenced by both `Subject.electiveGroupId` and
 * `StudentElectiveSelection.electiveGroupId`) — matching this task's own
 * "identity-affecting vs. display metadata" distinction. Renames are
 * therefore permitted regardless of dependent Subjects/selections,
 * subject only to the scoped uniqueness check below.
 *
 * ── AUDIT ──────────────────────────────────────────────────────────
 * CREATE/UPDATE/DELETE use `recordAuditTx` inside the same
 * `prisma.$transaction(...)` as the repository write, matching
 * SubjectService/SemesterCatalogService exactly. Reads are never
 * audited. `AuditEntityType.ELECTIVE_GROUP` was added to audit.types.ts
 * as the minimal required addition — see this file's accompanying
 * report.
 *
 * ── CONCURRENCY ────────────────────────────────────────────────────
 * `updateElectiveGroup`'s composite-uniqueness pre-check runs inside the
 * same transaction as its `findByIdTx` read and `update` write (via
 * `findBySemesterCatalogAndNameTx`), matching
 * `SubjectService.updateSubject`'s identical pattern. This closes the
 * gap between an outside pre-check and the in-transaction write, but —
 * same as every sibling service — does NOT add row-level locking or
 * Serializable isolation; under Postgres's default READ COMMITTED
 * isolation, a second transaction inserting a colliding
 * `(semesterCatalogId, name)` row can still commit in the narrow window
 * between this pre-check and this `update()` call. The database's
 * `@@unique([semesterCatalogId, name])` constraint (P2002 -> 409 via
 * prisma-error.mapper.ts) is what actually closes that window, not this
 * pre-check. `ElectiveGroup` has no `version` column, so a concurrent
 * update to unrelated fields is not detected as a lost update either.
 */
export class ElectiveGroupService {
  /**
   * Mirrors the `@default(1)` on `ElectiveGroup.minSelect` /
   * `.maxSelect` in schema.prisma — see class-level "EFFECTIVE-STATE
   * VALIDATION" note. Used only to compute the effective state for
   * validation on create; the actual persisted default, when a field is
   * omitted, is still applied by Postgres via
   * `electiveGroupRepository.create`'s conditional spread.
   */
  private static readonly DEFAULT_MIN_SELECT = 1;
  private static readonly DEFAULT_MAX_SELECT = 1;

  /**
   * Creates an ElectiveGroup.
   *
   * SemesterCatalog existence is checked directly via
   * `semesterCatalogRepository.findById`, not through a service —
   * matching SubjectService.createSubject's identical direct check.
   * `existsBySemesterCatalogAndName` is a fast-path pre-check only; the
   * database's `@@unique([semesterCatalogId, name])` constraint is the
   * final guarantee (P2002 -> 409). The `minSelect <= maxSelect`
   * invariant is validated against the EFFECTIVE state (falling back to
   * the schema defaults for any omitted field), not just the fields
   * present in `input` — see class-level note.
   */
  async createElectiveGroup(
    actorUserId: string,
    input: CreateElectiveGroupInput,
  ): Promise<ElectiveGroupDTO> {
    const semesterCatalog = await semesterCatalogRepository.findById(input.semesterCatalogId);
    if (!semesterCatalog) {
      throw ApiError.notFound('Semester catalog not found', ErrorCode.RECORD_NOT_FOUND);
    }

    const nameTaken = await electiveGroupRepository.existsBySemesterCatalogAndName(
      input.semesterCatalogId,
      input.name,
    );
    if (nameTaken) {
      throw ApiError.conflict(
        'An elective group with this name already exists in this semester catalog',
        ErrorCode.DUPLICATE_ENTRY,
      );
    }

    const effectiveMinSelect = input.minSelect ?? ElectiveGroupService.DEFAULT_MIN_SELECT;
    const effectiveMaxSelect = input.maxSelect ?? ElectiveGroupService.DEFAULT_MAX_SELECT;
    if (effectiveMinSelect > effectiveMaxSelect) {
      throw ApiError.badRequest(
        'minSelect cannot be greater than maxSelect',
        ErrorCode.VALIDATION_ERROR,
      );
    }

    const electiveGroup = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
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

  /**
   * Not audited — routine read. Filtering/sorting/pagination all happen
   * in `electiveGroupRepository.findMany`; no per-row SemesterCatalog
   * lookups (no N+1).
   */
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

  /**
   * Updates `name`, `minSelect`, `maxSelect`. `semesterCatalogId` has no
   * write path — `UpdateElectiveGroupInput` excludes it and
   * `electiveGroupRepository.update` has no branch for it.
   *
   * The effective resulting state (`input.field ?? existing.field` for
   * each of `name`/`minSelect`/`maxSelect`) is validated against the
   * `minSelect <= maxSelect` invariant BEFORE any write — e.g. a PATCH
   * of `{ maxSelect: 1 }` against an existing `minSelect: 2` is rejected
   * even though `maxSelect: 1` alone is structurally valid, per this
   * task's explicit instruction not to validate only the changed field.
   *
   * When `name` changes, the composite-uniqueness pre-check runs via
   * `findBySemesterCatalogAndNameTx` inside this transaction — see the
   * class-level "CONCURRENCY" note for exactly what guarantee this does
   * and does not provide.
   */
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

  /**
   * Hard delete — ElectiveGroup has no `deletedAt`/status field. No
   * dependent-record pre-check is performed — see class-level
   * "DEPENDENT-RECORD SAFETY: NOT IMPLEMENTED" note for why. Mirrors
   * SubjectService.deleteSubject, not
   * SemesterCatalogService.updateSemesterCatalog's `hasDependentRecords`
   * pattern. `Subject.electiveGroupId` and
   * `StudentElectiveSelection.electiveGroupId` are both foreign keys
   * with no declared cascade, so Postgres rejects deletion when either
   * still references this group (P2003 -> 400 via
   * prisma-error.mapper.ts), rolling back the delete and the audit
   * together.
   */
  async deleteElectiveGroup(actorUserId: string, id: ElectiveGroupId): Promise<void> {
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const existing = await electiveGroupRepository.findByIdTx(tx, id);
      if (!existing) {
        throw ApiError.notFound('Elective group not found', ErrorCode.RECORD_NOT_FOUND);
      }

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

    electiveGroupLogger.info('Elective group deleted', {
      actorUserId,
      electiveGroupId: id,
    });
  }
}

export const electiveGroupService = new ElectiveGroupService();
