// apps/api/src/modules/academic/programs/program.service.ts

import type { Prisma } from '@spark/database/client';

import { ApiError } from '../../../common/errors/ApiError.js';
import { ErrorCode } from '../../../common/errors/ErrorCodes.js';
import { prisma } from '../../../lib/prisma.js';
import { recordAuditTx } from '../../audit/audit.service.js';
import { AuditEntityType } from '../../audit/audit.types.js';
import { departmentRepository } from '../departments/department.repository.js';

import { toProgramDTO, toProgramDTOList } from './program.mapper.js';
import { programRepository } from './program.repository.js';
import type {
  CreateProgramInput,
  ListProgramsFilters,
  ListProgramsOptions,
  ListProgramsResult,
  ProgramDTO,
  ProgramId,
  UpdateProgramInput,
} from './program.types.js';

/**
 * Business-logic layer for the Program domain.
 *
 * This service owns:
 *
 * - Program business rules (code uniqueness messaging, Department
 *   existence, departmentId immutability)
 * - orchestration between program.repository.ts, program.mapper.ts, the
 *   Department module's repository (existence check only), and the
 *   Audit module for state-changing operations
 *
 * This service does NOT:
 *
 * - construct Prisma queries (that's program.repository.ts)
 * - make authorization decisions (that's authorization.service.ts,
 *   called from the controller/route boundary, not from here)
 * - perform HTTP validation (that's program.validation.ts)
 * - implement Department business logic — it only reads a Department by
 *   id to confirm it exists; AuditService itself remains untouched and
 *   knows nothing Program-specific beyond the `PROGRAM` entityType tag
 *
 * The application is single-college; there is no organizationId/
 * tenantId anywhere in this file, matching DepartmentService/RoleService/
 * UserService.
 *
 * ── DEPARTMENT EXISTENCE CHECK ────────────────────────────────────────
 * `academic/index.ts` exposes only `departmentRouter` (the HTTP route),
 * not a service- or repository-level public API — there is no
 * dedicated cross-module boundary to go through. The actual established
 * convention for "does a cross-module referenced entity exist" in this
 * codebase is RoleAssignmentService.createRoleAssignment, which imports
 * `userRepository`/`roleRepository` directly from their sibling modules
 * for a plain existence read, rather than routing through
 * UserService/RoleService. `createProgram` below follows that exact
 * precedent: `departmentRepository.findById` is called directly, not
 * `departmentService.getDepartmentById`. This is a single read-only
 * call, not a dependency on Department's business logic, and it creates
 * no risk of a circular dependency — Department has (and should have)
 * no knowledge of Program.
 *
 * ── AUDIT POLICY ──────────────────────────────────────────────────────
 * CREATE/UPDATE/DELETE are state-changing administrative operations, so
 * they use `recordAuditTx` (never `recordAudit`) inside the SAME
 * `prisma.$transaction(...)` as the repository write — if the audit
 * insert fails, the whole transaction rolls back and the Program
 * mutation does not silently succeed with no audit trail. This mirrors
 * DepartmentService.createDepartment/updateDepartment/deleteDepartment
 * exactly. Reads (`getProgramById`, `listPrograms`) are never audited,
 * per the same policy.
 *
 * `AuditEntityType.PROGRAM` did not exist prior to this change — it was
 * added to audit.types.ts as the minimal, explicitly-identified change
 * required for this service to record audits at all (see that file's
 * comment on the added member). No other part of the Audit module was
 * touched; `recordAuditTx` itself is used exactly as every other service
 * uses it.
 *
 * ── WHY UPDATE/DELETE RE-READ INSIDE THE TRANSACTION ─────────────────
 * Same reasoning as DepartmentService: reading the pre-mutation record
 * with the plain `findById` singleton BEFORE opening
 * `prisma.$transaction` (the pattern RoleService.updateRole/
 * UserService.updateUser still use) leaves a window where a concurrent
 * transaction could change the row between the outside read and the
 * in-transaction write, so the audit's `oldValue` would no longer
 * describe what was actually overwritten. `updateProgram`/
 * `deleteProgram` below instead call `programRepository.findByIdTx(tx,
 * id)` — a method added to program.repository.ts specifically for this,
 * mirroring `DepartmentRepository.findByIdTx` — from inside the
 * transaction, so the existence check, the `oldValue` snapshot, and the
 * mutation all observe the same transactionally-consistent row.
 *
 * ── KNOWN CONCURRENCY LIMITATION (not solved here) ───────────────────
 * The above closes the race between the *outside* read and the
 * transaction, but it does not add row-level locking (no `SELECT ...
 * FOR UPDATE`) or optimistic concurrency (no version column exists on
 * `Program` in schema.prisma, and this task does not add one). A
 * narrow window remains between the in-transaction `findByIdTx` read
 * and the subsequent `update`/`delete` write: if another transaction
 * commits a change to the same row in between, this transaction's
 * `UPDATE ... WHERE id = ?` still applies correctly against the latest
 * committed row (Postgres does not lose the write), but the audit
 * `oldValue` captured here reflects the state at `findByIdTx` time, not
 * necessarily the exact row version the `UPDATE` statement actually
 * overwrote. This is the identical, pre-existing limitation
 * DepartmentService also carries — it is not fixed for Program either,
 * and is called out explicitly here rather than left implicit.
 *
 * ── departmentId IS NEVER WRITABLE THROUGH updateProgram ─────────────
 * `UpdateProgramInput` (program.types.ts) has no `departmentId` field,
 * and `ProgramRepository.update` has no code path that would write one
 * even if it did. This service adds no mechanism to reassign a
 * Program's Department — see program.types.ts's own doc comment for
 * why (CurriculumVersion/StudentEnrollment/Admission already reference
 * a Program by id once one exists).
 *
 * ── LOGGING ────────────────────────────────────────────────────────
 * `lib/logger.ts` was inspected and does not export a `programLogger` —
 * only `roleLogger`, `userLogger`, `roleAssignmentLogger`, `auditLogger`,
 * etc. exist. Adding one is outside this task's authorized file list, so
 * — matching DepartmentService's identical, explicitly-noted choice — no
 * logging calls were added here.
 */
export class ProgramService {
  /**
   * Creates a Program.
   *
   * Department existence is checked first — a Program cannot be
   * meaningfully created against a Department that doesn't exist, and
   * this yields a clean domain-level 404 rather than relying on the
   * database's foreign-key constraint (P2003) to surface as a generic
   * "references a record that does not exist" 400. This mirrors the
   * explicit existence-check precedent in
   * RoleAssignmentService.createRoleAssignment (which checks
   * `userRepository`/`roleRepository` the same way) rather than only
   * letting P2003 propagate.
   *
   * `existsByCode` runs next — a fast-path check only, for a friendlier
   * conflict message, NOT the concurrency guarantee. Two concurrent
   * requests can both pass this check; the database's `@@unique([code])`
   * constraint is what actually prevents a duplicate, surfaced as a
   * Prisma P2002 that the centralized Prisma error mapper turns into a
   * 409 — if that happens, the transaction (create + audit) rolls back
   * together, so no orphaned audit row is ever written for a create that
   * didn't actually happen. This mirrors
   * DepartmentService.createDepartment/RoleService.createRole exactly.
   *
   * `newValue` includes `id` alongside the rest of the persisted fields,
   * matching the audit snapshot shape program.service.ts's own spec
   * calls for (id, name, code, departmentId, durationYears,
   * totalSemesters) and DepartmentService.createDepartment's identical
   * choice to make the snapshot self-contained.
   */
  async createProgram(actorUserId: string, input: CreateProgramInput): Promise<ProgramDTO> {
    const department = await departmentRepository.findById(input.departmentId);
    if (!department) {
      throw ApiError.notFound('Department not found', ErrorCode.RECORD_NOT_FOUND);
    }

    const codeTaken = await programRepository.existsByCode(input.code);
    if (codeTaken) {
      throw ApiError.conflict('A program with this code already exists', ErrorCode.DUPLICATE_ENTRY);
    }

    const program = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const created = await programRepository.create(tx, input);

      await recordAuditTx(tx, {
        actorUserId,
        action: 'CREATE',
        entityType: AuditEntityType.PROGRAM,
        entityId: created.id,
        newValue: {
          id: created.id,
          name: created.name,
          code: created.code,
          departmentId: created.departmentId,
          durationYears: created.durationYears,
          totalSemesters: created.totalSemesters,
        },
      });

      return created;
    });

    return toProgramDTO(program);
  }

  /**
   * Returns a Program by ID. Not audited — routine read. Never queries
   * Department — `ProgramDTO.departmentId` is already a plain id, and a
   * plain lookup has no reason to force-load the owning Department.
   */
  async getProgramById(id: ProgramId): Promise<ProgramDTO> {
    const program = await programRepository.findById(id);
    if (!program) {
      throw ApiError.notFound('Program not found', ErrorCode.RECORD_NOT_FOUND);
    }
    return toProgramDTO(program);
  }

  /**
   * Lists programs using the filters/options supplied by the caller.
   * Not audited — routine read. Pagination, sorting, and search are all
   * performed by `programRepository.findMany` — this method does not
   * implement any of them itself. No organization/tenant filter —
   * single-college architecture. Does not query Department to filter by
   * `departmentId` — that filter is a direct equality condition on
   * Program's own indexed foreign-key column, handled entirely inside
   * `programRepository.findMany`.
   */
  async listPrograms(
    filters: ListProgramsFilters,
    options: ListProgramsOptions,
  ): Promise<ListProgramsResult> {
    const result = await programRepository.findMany(filters, options);
    return {
      programs: toProgramDTOList(result.programs),
      total: result.total,
    };
  }

  /**
   * Updates the mutable `name`, `code`, `durationYears`, and
   * `totalSemesters` fields. `departmentId` cannot be changed through
   * this method — see the class-level doc comment.
   *
   * The existence check, the `oldValue` snapshot, and the update all
   * happen inside one transaction via `findByIdTx` — see the class-level
   * "WHY UPDATE/DELETE RE-READ INSIDE THE TRANSACTION" and "KNOWN
   * CONCURRENCY LIMITATION" notes. `oldValue`/`newValue` are both taken
   * from actual persisted Program state (the pre-update row and the
   * post-update result respectively) — input is never echoed directly,
   * per this module's own audit-snapshot requirement.
   */
  async updateProgram(
    actorUserId: string,
    id: ProgramId,
    input: UpdateProgramInput,
  ): Promise<ProgramDTO> {
    const updated = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const existing = await programRepository.findByIdTx(tx, id);
      if (!existing) {
        throw ApiError.notFound('Program not found', ErrorCode.RECORD_NOT_FOUND);
      }

      const result = await programRepository.update(tx, id, input);

      await recordAuditTx(tx, {
        actorUserId,
        action: 'UPDATE',
        entityType: AuditEntityType.PROGRAM,
        entityId: existing.id,
        oldValue: {
          name: existing.name,
          code: existing.code,
          departmentId: existing.departmentId,
          durationYears: existing.durationYears,
          totalSemesters: existing.totalSemesters,
        },
        newValue: {
          name: result.name,
          code: result.code,
          departmentId: result.departmentId,
          durationYears: result.durationYears,
          totalSemesters: result.totalSemesters,
        },
      });

      return result;
    });

    return toProgramDTO(updated);
  }

  /**
   * Deletes a Program.
   *
   * Existence check, `oldValue` snapshot, and the delete all happen
   * inside one transaction via `findByIdTx` — same reasoning as
   * `updateProgram`. If the Program still has CurriculumVersion,
   * StudentEnrollment, or Admission rows referencing it (all required
   * foreign keys with no cascade declared in schema.prisma), Postgres
   * rejects the deletion (P2003, mapped to 400 by
   * prisma-error.mapper.ts) — that error propagates out of the
   * transaction callback, which rolls the whole transaction back: the
   * delete does not happen, no audit row is written, and the Program
   * remains intact. This service does not cascade-delete any of that
   * academic history, does not soft-delete, and does not invent an
   * archival/status field — none of those exist on the current Program
   * model.
   */
  async deleteProgram(actorUserId: string, id: ProgramId): Promise<void> {
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const existing = await programRepository.findByIdTx(tx, id);
      if (!existing) {
        throw ApiError.notFound('Program not found', ErrorCode.RECORD_NOT_FOUND);
      }

      await programRepository.delete(tx, id);

      await recordAuditTx(tx, {
        actorUserId,
        action: 'DELETE',
        entityType: AuditEntityType.PROGRAM,
        entityId: existing.id,
        oldValue: {
          id: existing.id,
          name: existing.name,
          code: existing.code,
          departmentId: existing.departmentId,
          durationYears: existing.durationYears,
          totalSemesters: existing.totalSemesters,
        },
        newValue: null,
      });
    });
  }
}

export const programService = new ProgramService();
