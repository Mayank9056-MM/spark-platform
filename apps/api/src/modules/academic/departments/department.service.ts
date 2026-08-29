// apps/api/src/modules/academic/departments/department.service.ts

import type { Prisma } from '@spark/database/client';

import { ApiError } from '../../../common/errors/ApiError.js';
import { ErrorCode } from '../../../common/errors/ErrorCodes.js';
import { prisma } from '../../../lib/prisma.js';
import { recordAuditTx } from '../../audit/audit.service.js';
import { AuditEntityType } from '../../audit/audit.types.js';

import { toDepartmentDTO, toDepartmentDTOList } from './department.mapper.js';
import { departmentRepository } from './department.repository.js';
import type {
  CreateDepartmentInput,
  DepartmentDTO,
  DepartmentId,
  ListDepartmentsFilters,
  ListDepartmentsOptions,
  ListDepartmentsResult,
  UpdateDepartmentInput,
} from './department.types.js';

/**
 * Business-logic layer for the Department domain.
 *
 * This service owns:
 *
 * - Department business rules (code uniqueness messaging, code
 *   immutability, existence checks)
 * - orchestration between department.repository.ts, department.mapper.ts,
 *   and the Audit module for state-changing operations
 *
 * This service does NOT:
 *
 * - construct Prisma queries (that's department.repository.ts)
 * - make authorization decisions (that's authorization.service.ts, called
 *   from the controller/route boundary, not from here)
 * - perform HTTP validation (that's department.validation.ts)
 * - contain Department-specific logic inside the Audit module — this
 *   service calls the existing generic `recordAuditTx`; AuditService
 *   itself remains untouched and knows nothing about Department
 *
 * The application is single-college; there is no organizationId/tenantId
 * anywhere in this file, matching RoleService/UserService/
 * RoleAssignmentService.
 *
 * ── AUDIT POLICY ──────────────────────────────────────────────────────
 * CREATE/UPDATE/DELETE are state-changing administrative operations, so
 * they use `recordAuditTx` (never `recordAudit`) inside the SAME
 * `prisma.$transaction(...)` as the repository write — if the audit
 * insert fails, the whole transaction rolls back and the Department
 * mutation does not silently succeed with no audit trail. This mirrors
 * RoleService.createRole/updateRole and UserService.createUser/
 * updateUser exactly. Reads (`getDepartmentById`, `listDepartments`) are
 * never audited, per the same policy those services already follow.
 *
 * ── WHY UPDATE/DELETE RE-READ INSIDE THE TRANSACTION ─────────────────
 * RoleService.updateRole/UserService.updateUser read the pre-mutation
 * record with the plain `findById` singleton BEFORE opening
 * `prisma.$transaction`, then use that already-fetched snapshot as the
 * audit `oldValue` inside the transaction. That leaves a window where a
 * concurrent transaction could change the row between the outside read
 * and the in-transaction write, so the audit's `oldValue` would no
 * longer describe what was actually overwritten. `updateDepartment`/
 * `deleteDepartment` below instead call the new
 * `departmentRepository.findByIdTx(tx, id)` from inside the transaction,
 * so the existence check, the `oldValue` snapshot, and the mutation all
 * observe the same transactionally-consistent row. This is a deliberate
 * improvement scoped to Department only — it does not change how
 * Role/User capture their pre-mutation state.
 *
 * ── LOGGING (still flagged — unchanged from the prior revision) ──────
 * `lib/logger.ts` was inspected and does not export a `departmentLogger`
 * — only `roleLogger`, `userLogger`, `roleAssignmentLogger`, etc. exist.
 * Adding one is outside this task's authorized file list (only
 * department.service.ts, department.repository.ts, and audit.types.ts
 * were in scope), so no logging calls were added here.
 */
export class DepartmentService {
  /**
   * Creates a Department.
   *
   * `existsByCode` runs before the transaction — it's a fast-path check
   * only, for a friendlier conflict message, NOT the concurrency
   * guarantee. Two concurrent requests can both pass this check; the
   * database's `@@unique([code])` constraint is what actually prevents a
   * duplicate, surfaced as a Prisma P2002 that the centralized Prisma
   * error mapper turns into a 409 — if that happens, the transaction
   * (create + audit) rolls back together, so no orphaned audit row is
   * ever written for a create that didn't actually happen.
   *
   * `newValue` includes `id` alongside `name`/`code` — a deliberate,
   * explicit ask for Department's audit snapshot (self-contained even
   * though `entityId` already carries it), unlike RoleService.createRole's
   * `newValue`, which omits `id` for that same reason. Both are correct
   * for their respective specs; this isn't an inconsistency introduced
   * by accident.
   */
  async createDepartment(
    actorUserId: string,
    input: CreateDepartmentInput,
  ): Promise<DepartmentDTO> {
    const codeTaken = await departmentRepository.existsByCode(input.code);
    if (codeTaken) {
      throw ApiError.conflict(
        'A department with this code already exists',
        ErrorCode.DUPLICATE_ENTRY,
      );
    }

    const department = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const created = await departmentRepository.create(tx, input);

      await recordAuditTx(tx, {
        actorUserId,
        action: 'CREATE',
        entityType: AuditEntityType.DEPARTMENT,
        entityId: created.id,
        newValue: { id: created.id, name: created.name, code: created.code },
      });

      return created;
    });

    return toDepartmentDTO(department);
  }

  /**
   * Returns a Department by ID. Not audited — routine read.
   */
  async getDepartmentById(id: DepartmentId): Promise<DepartmentDTO> {
    const department = await departmentRepository.findById(id);
    if (!department) {
      throw ApiError.notFound('Department not found', ErrorCode.RECORD_NOT_FOUND);
    }
    return toDepartmentDTO(department);
  }

  /**
   * Lists departments using the filters/options supplied by the caller.
   * Not audited — routine read. No organization/tenant filter —
   * single-college architecture.
   */
  async listDepartments(
    filters: ListDepartmentsFilters,
    options: ListDepartmentsOptions,
  ): Promise<ListDepartmentsResult> {
    const result = await departmentRepository.findMany(filters, options);
    return {
      departments: toDepartmentDTOList(result.departments),
      total: result.total,
    };
  }

  /**
   * Updates the mutable `name` field.
   *
   * `code` cannot be changed through this method — `UpdateDepartmentInput`
   * has no `code` field, and department.repository.ts's `update()` has no
   * code path that would write one even if it did. This is intentional
   * and matches the domain's code-immutability rule established in
   * department.types.ts; auditing this operation never shows a code
   * change because one is structurally impossible here.
   *
   * The existence check, the `oldValue` snapshot, and the update all
   * happen inside one transaction via `findByIdTx` — see the file-level
   * "WHY UPDATE/DELETE RE-READ INSIDE THE TRANSACTION" note. `newValue`
   * is taken from the actual post-update record (`result.name`), not
   * merely echoed back from `input`, so it reflects what was really
   * persisted.
   */
  async updateDepartment(
    actorUserId: string,
    id: DepartmentId,
    input: UpdateDepartmentInput,
  ): Promise<DepartmentDTO> {
    const updated = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const existing = await departmentRepository.findByIdTx(tx, id);
      if (!existing) {
        throw ApiError.notFound('Department not found', ErrorCode.RECORD_NOT_FOUND);
      }

      const result = await departmentRepository.update(tx, id, input);

      await recordAuditTx(tx, {
        actorUserId,
        action: 'UPDATE',
        entityType: AuditEntityType.DEPARTMENT,
        entityId: existing.id,
        oldValue: { name: existing.name },
        newValue: { name: result.name },
      });

      return result;
    });

    return toDepartmentDTO(updated);
  }

  /**
   * Deletes a Department.
   *
   * Existence check, `oldValue` snapshot, and the delete all happen
   * inside one transaction via `findByIdTx` — same reasoning as
   * `updateDepartment`. If the Department still has Programs attached,
   * `Program.departmentId` (a required foreign key with no cascade
   * declared in schema.prisma) causes Postgres to reject the deletion —
   * that P2003 propagates out of the transaction callback, which rolls
   * the whole transaction back: the delete does not happen, no audit row
   * is written, and the Department remains intact. This service does not
   * cascade-delete Programs, does not soft-delete, and does not invent an
   * archival/status field — none of those exist on the current
   * Department model.
   */
  async deleteDepartment(actorUserId: string, id: DepartmentId): Promise<void> {
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const existing = await departmentRepository.findByIdTx(tx, id);
      if (!existing) {
        throw ApiError.notFound('Department not found', ErrorCode.RECORD_NOT_FOUND);
      }

      await departmentRepository.delete(tx, id);

      await recordAuditTx(tx, {
        actorUserId,
        action: 'DELETE',
        entityType: AuditEntityType.DEPARTMENT,
        entityId: existing.id,
        oldValue: { id: existing.id, name: existing.name, code: existing.code },
        newValue: null,
      });
    });
  }
}

export const departmentService = new DepartmentService();
