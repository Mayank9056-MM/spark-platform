// apps/api/src/modules/academic/departments/department.repository.ts

import type { Department, Prisma, PrismaClient } from '@spark/database/client';

import { prisma } from '../../../lib/prisma.js';

import type {
  CreateDepartmentInput,
  DepartmentId,
  ListDepartmentsFilters,
  ListDepartmentsOptions,
  UpdateDepartmentInput,
} from './department.types.js';

/**
 * As with UserRepository/RoleRepository/RoleAssignmentRepository, mutating
 * methods take an explicit Prisma transaction client rather than closing
 * over the module-level `prisma` singleton — so department.service.ts can
 * wrap a Department mutation together with its audit-log write in one
 * `prisma.$transaction(...)`. Read-only methods use the singleton, same
 * convention as every sibling repository — except `findByIdTx` below,
 * which is deliberately transaction-scoped; see its own doc comment.
 */
type Db = PrismaClient | Prisma.TransactionClient;

/**
 * Raw persistence list result — deliberately NOT `ListDepartmentsResult`
 * from department.types.ts, which holds `DepartmentDTO[]` for the API
 * boundary. This repository never produces DTOs (see role.repository.ts's
 * `RoleListQueryResult` / role-assignment.repository.ts's
 * `RoleAssignmentListQueryResult` for the identical reasoning); mapping
 * `Department[]` → `DepartmentDTO[]` is department.mapper.ts's job, one
 * layer up.
 */
export interface DepartmentListQueryResult {
  readonly departments: Department[];
  readonly total: number;
}

/**
 * The only file allowed to call `prisma.department.*` directly.
 * Persistence access only: no authorization decisions, no DTO mapping, no
 * audit orchestration, no business rules (e.g. whether a department may
 * be renamed or deleted — that belongs to department.service.ts).
 *
 * Department is global within this single-college deployment — there is
 * no tenant boundary to scope by, and (unlike User/Role) the Prisma model
 * has no `deletedAt`/status field, so no soft-delete filtering appears
 * anywhere below.
 */
export class DepartmentRepository {
  /**
   * `code` is written exactly as submitted — no case conversion or
   * trimming happens here; that's validation's job
   * (department.validation.ts). Uniqueness is enforced by the database's
   * `@@unique([code])` constraint, not by this method: a concurrent
   * duplicate `create()` call is rejected by Postgres (P2002), mapped to
   * a 409 by prisma-error.mapper.ts. Any pre-check the service performs
   * via `existsByCode` is only for a friendlier error message, never the
   * actual concurrency guarantee.
   */
  async create(tx: Db, input: CreateDepartmentInput): Promise<Department> {
    return tx.department.create({
      data: {
        name: input.name,
        code: input.code,
      },
    });
  }

  async findById(id: DepartmentId): Promise<Department | null> {
    return prisma.department.findFirst({
      where: { id },
    });
  }

  /**
   * Transaction-scoped equivalent of `findById`. Exists specifically so
   * department.service.ts can read a Department's pre-mutation state and
   * then update/delete it within the SAME `prisma.$transaction(...)` —
   * reading outside the transaction first (as RoleRepository/
   * UserRepository's own read-then-`$transaction` call sites currently
   * do for their audit `oldValue`) leaves a window where a concurrent
   * transaction could change the row between the read and the write,
   * producing an audit record whose `oldValue` no longer matches what
   * was actually overwritten. This method is added for Department only —
   * it does not change how Role/User capture their pre-mutation state.
   */
  async findByIdTx(tx: Db, id: DepartmentId): Promise<Department | null> {
    return tx.department.findFirst({
      where: { id },
    });
  }

  /** `code` is unique — a single-argument lookup is correct, not a shortcut. */
  async findByCode(code: string): Promise<Department | null> {
    return prisma.department.findFirst({
      where: { code },
    });
  }

  async existsByCode(code: string): Promise<boolean> {
    const count = await prisma.department.count({
      where: { code },
    });
    return count > 0;
  }

  /**
   * Only `name` is ever written — the only field `UpdateDepartmentInput`
   * exposes. `code` has no corresponding branch here at all, so there is
   * no code path through which a caller could update it even by mistake
   * (see department.types.ts's UpdateDepartmentInput doc comment on code
   * immutability). Plain `id` selector: if `id` doesn't match an existing
   * row, Prisma throws P2025 — mapped to a clean 404 by the Prisma error
   * mapper, same behavior as UserRepository.update/RoleRepository.update.
   */
  async update(tx: Db, id: DepartmentId, input: UpdateDepartmentInput): Promise<Department> {
    return tx.department.update({
      where: { id },
      data: {
        ...(input.name !== undefined && { name: input.name }),
      },
    });
  }

  /**
   * Hard delete — Department has no `deletedAt`/status field to soft-delete
   * with, and no such field was invented here (that's a schema decision,
   * out of scope for this repository). `Program.departmentId` is a
   * required foreign key with no explicit cascade behavior declared in
   * schema.prisma, so Postgres will reject deleting a Department that
   * still has Programs attached (P2003, mapped to 400 by
   * prisma-error.mapper.ts) rather than silently cascading. Whether
   * Department should eventually support archival/soft-delete instead of
   * hard deletion is an open architectural decision this repository does
   * not make.
   */
  async delete(tx: Db, id: DepartmentId): Promise<Department> {
    return tx.department.delete({
      where: { id },
    });
  }

  /**
   * Same count+findMany-in-parallel shape as every sibling repository's
   * `findMany`. `search` matches against name/code via case-insensitive
   * `contains`, matching UserRepository/RoleRepository's search
   * convention exactly — no new search strategy invented for Department.
   *
   * `orderBy: { [options.sortBy]: options.sortOrder }` mirrors
   * UserRepository/RoleRepository/RoleAssignmentRepository's identical
   * dynamic-key pattern — safe here for the same reason it's safe there:
   * `options.sortBy` is already whitelisted to the
   * `'name' | 'code' | 'createdAt'` literal union by
   * department.validation.ts before it ever reaches this method.
   */
  async findMany(
    filters: ListDepartmentsFilters,
    options: ListDepartmentsOptions,
  ): Promise<DepartmentListQueryResult> {
    const where: Prisma.DepartmentWhereInput = {
      ...(filters.search && {
        OR: [
          { name: { contains: filters.search, mode: 'insensitive' } },
          { code: { contains: filters.search, mode: 'insensitive' } },
        ],
      }),
    };

    const [departments, total] = await Promise.all([
      prisma.department.findMany({
        where,
        orderBy: { [options.sortBy]: options.sortOrder },
        skip: (options.page - 1) * options.limit,
        take: options.limit,
      }),
      prisma.department.count({ where }),
    ]);

    return { departments, total };
  }
}

export const departmentRepository = new DepartmentRepository();
