// apps/api/src/modules/admissions/admission.repository.ts

import type { Admission, Prisma, PrismaClient } from '@spark/database/client';

import { prisma } from '../../lib/prisma.js';

import type {
  AdmissionId,
  CreateAdmissionInput,
  ListAdmissionsFilters,
  ListAdmissionsOptions,
  UpdateAdmissionInput,
} from './admission.types.js';

type Db = PrismaClient | Prisma.TransactionClient;

export interface AdmissionListQueryResult {
  readonly admissions: Admission[];
  readonly total: number;
}

export class AdmissionRepository {
  async create(tx: Db, input: CreateAdmissionInput, admittedByUserId: string): Promise<Admission> {
    return tx.admission.create({
      data: {
        userId: input.userId,
        admissionNumber: input.admissionNumber,
        admissionDate: new Date(input.admissionDate),
        admissionType: input.admissionType,
        entrySemesterCatalogId: input.entrySemesterCatalogId,
        quota: input.quota,
        initialProgramId: input.initialProgramId,
        initialCurriculumId: input.initialCurriculumId,
        admittedByUserId,
      },
    });
  }

  async findById(id: AdmissionId): Promise<Admission | null> {
    return prisma.admission.findUnique({ where: { id } });
  }

  async findByIdTx(tx: Db, id: AdmissionId): Promise<Admission | null> {
    return tx.admission.findUnique({ where: { id } });
  }

  async findByAdmissionNumber(admissionNumber: string): Promise<Admission | null> {
    return prisma.admission.findUnique({ where: { admissionNumber } });
  }

  async existsByAdmissionNumber(admissionNumber: string): Promise<boolean> {
    const count = await prisma.admission.count({ where: { admissionNumber } });
    return count > 0;
  }

  async update(tx: Db, id: AdmissionId, input: UpdateAdmissionInput): Promise<Admission> {
    return tx.admission.update({
      where: { id },
      data: {
        ...(input.admissionDate !== undefined && { admissionDate: new Date(input.admissionDate) }),
        ...(input.quota !== undefined && { quota: input.quota }),
      },
    });
  }

  /**
   * Conditional transition: only flips a row that is still CONFIRMED.
   * `updateMany` (not `update`) is used deliberately — `update`'s `where`
   * only accepts unique fields, so it cannot express "and status is still
   * CONFIRMED" as a precondition. `count === 0` means either the id
   * doesn't exist or the row was already CANCELLED (by this call or a
   * concurrent one that won the race) — the caller (AdmissionService)
   * already re-read the row via findByIdTx, so it can tell those two
   * apart without a second query here.
   *
   * No delete() method exists on this repository — Admission is never
   * hard-deleted at any layer.
   */
  async cancel(tx: Db, id: AdmissionId): Promise<Admission | null> {
    const { count } = await tx.admission.updateMany({
      where: { id, status: 'CONFIRMED' },
      data: { status: 'CANCELLED' },
    });
    if (count === 0) {
      return null;
    }
    return tx.admission.findUniqueOrThrow({ where: { id } });
  }

  async findMany(
    filters: ListAdmissionsFilters,
    options: ListAdmissionsOptions,
  ): Promise<AdmissionListQueryResult> {
    const where: Prisma.AdmissionWhereInput = {
      ...(filters.status !== undefined && { status: filters.status }),
      ...(filters.admissionType !== undefined && { admissionType: filters.admissionType }),
      ...(filters.quota !== undefined && { quota: filters.quota }),
      ...(filters.userId !== undefined && { userId: filters.userId }),
      ...(filters.initialProgramId !== undefined && { initialProgramId: filters.initialProgramId }),
      ...(filters.initialCurriculumId !== undefined && {
        initialCurriculumId: filters.initialCurriculumId,
      }),
      ...(filters.entrySemesterCatalogId !== undefined && {
        entrySemesterCatalogId: filters.entrySemesterCatalogId,
      }),
      ...(filters.search && { admissionNumber: { contains: filters.search, mode: 'insensitive' } }),
    };

    const [admissions, total] = await Promise.all([
      prisma.admission.findMany({
        where,
        orderBy: { [options.sortBy]: options.sortOrder },
        skip: (options.page - 1) * options.limit,
        take: options.limit,
      }),
      prisma.admission.count({ where }),
    ]);

    return { admissions, total };
  }
}

export const admissionRepository = new AdmissionRepository();
