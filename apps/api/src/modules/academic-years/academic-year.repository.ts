// apps/api/src/modules/academic-years/academic-year.repository.ts

import type { AcademicYear, Prisma, PrismaClient } from '@spark/database/client';

import { prisma } from '../../lib/prisma.js';

import type {
  CreateAcademicYearInput,
  AcademicYearId,
  ListAcademicYearsFilters,
  ListAcademicYearsOptions,
  UpdateAcademicYearInput,
} from './academic-year.types.js';

type Db = PrismaClient | Prisma.TransactionClient;

export interface AcademicYearListQueryResult {
  readonly academicYears: AcademicYear[];
  readonly total: number;
}

export class AcademicYearRepository {
  async create(tx: Db, input: CreateAcademicYearInput): Promise<AcademicYear> {
    return tx.academicYear.create({
      data: {
        label: input.label,
        startDate: new Date(input.startDate),
        endDate: new Date(input.endDate),
      },
    });
  }

  async findById(id: AcademicYearId): Promise<AcademicYear | null> {
    return prisma.academicYear.findUnique({
      where: { id },
    });
  }

  async findByIdTx(tx: Db, id: AcademicYearId): Promise<AcademicYear | null> {
    return tx.academicYear.findUnique({
      where: { id },
    });
  }

  async findByLabel(label: string): Promise<AcademicYear | null> {
    return prisma.academicYear.findUnique({
      where: { label },
    });
  }

  /**
   * Transaction-aware counterpart to findByLabel(), added for
   * updateAcademicYear()'s label-uniqueness pre-check. Reading the
   * potential conflict through the same `tx` as the eventual `update()`
   * keeps the check consistent with the transaction's snapshot, matching
   * the reasoning `findByIdTx`/`hasReferences` already establish for
   * delete — the singleton-client `findByLabel` above remains for any
   * future outside-transaction fast-path use, but is not used for the
   * update conflict check.
   */
  async findByLabelTx(tx: Db, label: string): Promise<AcademicYear | null> {
    return tx.academicYear.findUnique({
      where: { label },
    });
  }

  async existsByLabel(label: string): Promise<boolean> {
    const count = await prisma.academicYear.count({
      where: { label },
    });
    return count > 0;
  }

  async findActive(): Promise<AcademicYear | null> {
    return prisma.academicYear.findFirst({
      where: { isActive: true },
    });
  }

  /**
   * Transaction-aware counterpart to findActive(), added for
   * activateAcademicYear(). The activation workflow must read whichever
   * year is currently active and write both the deactivation and the
   * activation inside the SAME transaction — a singleton-client read
   * taken before the transaction opens would not observe the
   * transaction's own uncommitted state and would reintroduce exactly
   * the race window the atomic transition is meant to close.
   */
  async findActiveTx(tx: Db): Promise<AcademicYear | null> {
    return tx.academicYear.findFirst({
      where: { isActive: true },
    });
  }

  /**
   * Narrowly-scoped write primitive for flipping `isActive` only. This is
   * deliberately NOT folded into update()/UpdateAcademicYearInput —
   * activation is a college-wide state transition, not a field-level
   * PATCH, and generic update() must remain structurally incapable of
   * changing isActive. Only activateAcademicYear() in the service may
   * call this.
   */
  async updateActiveState(tx: Db, id: AcademicYearId, isActive: boolean): Promise<AcademicYear> {
    return tx.academicYear.update({
      where: { id },
      data: { isActive },
    });
  }

  async hasReferences(tx: Db, id: AcademicYearId): Promise<boolean> {
    const [
      semesterEnrollmentCount,
      promotionBatchCount,
      subjectOfferingCount,
      timetableCount,
      lectureCount,
    ] = await Promise.all([
      tx.semesterEnrollment.count({ where: { academicYearId: id } }),
      tx.promotionBatch.count({ where: { academicYearId: id } }),
      tx.subjectOffering.count({ where: { academicYearId: id } }),
      tx.timetable.count({ where: { academicYearId: id } }),
      tx.lecture.count({ where: { academicYearId: id } }),
    ]);

    return (
      semesterEnrollmentCount > 0 ||
      promotionBatchCount > 0 ||
      subjectOfferingCount > 0 ||
      timetableCount > 0 ||
      lectureCount > 0
    );
  }

  async update(tx: Db, id: AcademicYearId, input: UpdateAcademicYearInput): Promise<AcademicYear> {
    return tx.academicYear.update({
      where: { id },
      data: {
        ...(input.label !== undefined && { label: input.label }),
        ...(input.startDate !== undefined && { startDate: new Date(input.startDate) }),
        ...(input.endDate !== undefined && { endDate: new Date(input.endDate) }),
      },
    });
  }

  async delete(tx: Db, id: AcademicYearId): Promise<AcademicYear> {
    return tx.academicYear.delete({
      where: { id },
    });
  }

  async findMany(
    filters: ListAcademicYearsFilters,
    options: ListAcademicYearsOptions,
  ): Promise<AcademicYearListQueryResult> {
    const where: Prisma.AcademicYearWhereInput = {
      ...(filters.isActive !== undefined && { isActive: filters.isActive }),
      ...(filters.search && {
        label: { contains: filters.search, mode: 'insensitive' },
      }),
    };

    const [academicYears, total] = await Promise.all([
      prisma.academicYear.findMany({
        where,
        orderBy: { [options.sortBy]: options.sortOrder },
        skip: (options.page - 1) * options.limit,
        take: options.limit,
      }),
      prisma.academicYear.count({ where }),
    ]);

    return { academicYears, total };
  }
}

export const academicYearRepository = new AcademicYearRepository();
