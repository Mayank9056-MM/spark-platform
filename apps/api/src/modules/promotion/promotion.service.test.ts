/* eslint-disable @typescript-eslint/unbound-method, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    $transaction: vi.fn(async (cb: (tx: any) => Promise<any>) => cb({})),
  },
}));

vi.mock('../../lib/logger.js', () => ({
  promotionLogger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../audit/audit.service.js', () => ({
  recordAuditTx: vi.fn(),
}));

vi.mock('../academic/SemesterCatalog/semester.repository.js', () => ({
  semesterCatalogRepository: {
    findById: vi.fn(),
    findByIdTx: vi.fn(),
    findByCurriculumVersionAndNumberTx: vi.fn(),
  },
}));

vi.mock('../academic-years/academic-year.repository.js', () => ({
  academicYearRepository: {
    findById: vi.fn(),
    findByIdTx: vi.fn(),
    findActiveTx: vi.fn(),
  },
}));

vi.mock('../student-enrollments/studentEnrollment.repository.js', () => ({
  studentEnrollmentRepository: {
    findById: vi.fn(),
    findByIdTx: vi.fn(),
    updateStatusTx: vi.fn(),
    graduate: vi.fn(),
    discontinue: vi.fn(),
  },
}));

vi.mock('../semester-enrollments/semesterEnrollment.repository.js', () => ({
  semesterEnrollmentRepository: {
    findById: vi.fn(),
    findByIdTx: vi.fn(),
    updateStatusTx: vi.fn(),
    getNextAttemptNumberTx: vi.fn(),
    create: vi.fn(),
    markPromoted: vi.fn(),
    markRepeated: vi.fn(),
    markWithdrawn: vi.fn(),
    markDiscontinued: vi.fn(),
    markGraduated: vi.fn(),
  },
}));

vi.mock('./promotion.repository.js', () => ({
  promotionBatchRepository: {
    findById: vi.fn(),
    findByIdTx: vi.fn(),
    create: vi.fn(),
    list: vi.fn(),
    finalize: vi.fn(),
  },
  promotionDecisionRepository: {
    findById: vi.fn(),
    findByIdTx: vi.fn(),
    findByBatchAndStudentTx: vi.fn(),
    findByFromSemesterEnrollmentIdTx: vi.fn(),
    findAllByBatchIdTx: vi.fn(),
    create: vi.fn(),
    list: vi.fn(),
    attachTargetSemesterEnrollment: vi.fn(),
  },
}));

import { semesterCatalogRepository } from '../academic/SemesterCatalog/semester.repository.js';
import { academicYearRepository } from '../academic-years/academic-year.repository.js';
import { semesterEnrollmentRepository } from '../semester-enrollments/semesterEnrollment.repository.js';
import { studentEnrollmentRepository } from '../student-enrollments/studentEnrollment.repository.js';

import { promotionBatchRepository, promotionDecisionRepository } from './promotion.repository.js';
import { promotionService } from './promotion.service.js';

describe('PromotionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockBatch = {
    id: 'batch-1',
    semesterCatalogId: 'sem-cat-1',
    academicYearId: 'ay-1',
    initiatedByUserId: 'user-admin-1',
    status: 'DRAFT' as const,
    finalizedAt: null,
    createdAt: new Date('2026-09-01T00:00:00Z'),
    updatedAt: new Date('2026-09-01T00:00:00Z'),
  };

  const mockDecision = {
    id: 'decision-1',
    promotionBatchId: 'batch-1',
    studentEnrollmentId: 'student-enr-1',
    fromSemesterEnrollmentId: 'sem-enr-1',
    toSemesterEnrollmentId: null,
    outcome: 'PROMOTE' as const,
    remarks: 'Approved',
    decidedByUserId: 'user-admin-1',
    decidedAt: new Date('2026-09-01T00:00:00Z'),
    createdAt: new Date('2026-09-01T00:00:00Z'),
  };

  describe('getPromotionBatchById', () => {
    it('returns batch DTO when batch exists', async () => {
      vi.mocked(promotionBatchRepository.findById).mockResolvedValue(mockBatch);

      const result = await promotionService.getPromotionBatchById('batch-1');
      expect(result.id).toBe('batch-1');
      expect(result.status).toBe('DRAFT');
    });

    it('throws RECORD_NOT_FOUND when batch does not exist', async () => {
      vi.mocked(promotionBatchRepository.findById).mockResolvedValue(null);

      await expect(promotionService.getPromotionBatchById('nonexistent')).rejects.toThrow(
        'Promotion batch not found',
      );
    });
  });

  describe('createPromotionBatch', () => {
    const input = {
      semesterCatalogId: 'sem-cat-1',
      academicYearId: 'ay-1',
    };

    it('throws RECORD_NOT_FOUND if semester catalog does not exist', async () => {
      vi.mocked(semesterCatalogRepository.findById).mockResolvedValue(null);

      await expect(promotionService.createPromotionBatch('user-1', input)).rejects.toThrow(
        'Semester catalog not found',
      );
    });

    it('throws RECORD_NOT_FOUND if academic year does not exist', async () => {
      vi.mocked(semesterCatalogRepository.findById).mockResolvedValue({ id: 'sem-cat-1' } as any);
      vi.mocked(academicYearRepository.findById).mockResolvedValue(null);

      await expect(promotionService.createPromotionBatch('user-1', input)).rejects.toThrow(
        'Academic year not found',
      );
    });

    it('creates promotion batch successfully', async () => {
      vi.mocked(semesterCatalogRepository.findById).mockResolvedValue({ id: 'sem-cat-1' } as any);
      vi.mocked(academicYearRepository.findById).mockResolvedValue({ id: 'ay-1' } as any);
      vi.mocked(promotionBatchRepository.create).mockResolvedValue(mockBatch);

      const result = await promotionService.createPromotionBatch('user-1', input);
      expect(result.id).toBe('batch-1');
      expect(result.status).toBe('DRAFT');
    });
  });

  describe('createPromotionDecision', () => {
    const input = {
      studentEnrollmentId: 'student-enr-1',
      fromSemesterEnrollmentId: 'sem-enr-1',
      outcome: 'PROMOTE' as const,
      remarks: 'Good progress',
    };

    it('throws RECORD_NOT_FOUND if batch does not exist', async () => {
      vi.mocked(promotionBatchRepository.findByIdTx).mockResolvedValue(null);

      await expect(
        promotionService.createPromotionDecision('user-1', 'batch-1', input),
      ).rejects.toThrow('Promotion batch not found');
    });

    it('throws error if batch is already FINALIZED', async () => {
      vi.mocked(promotionBatchRepository.findByIdTx).mockResolvedValue({
        ...mockBatch,
        status: 'FINALIZED',
      } as any);

      await expect(
        promotionService.createPromotionDecision('user-1', 'batch-1', input),
      ).rejects.toThrow('Promotion decisions can only be recorded against a draft promotion batch');
    });

    it('creates decision successfully when batch is DRAFT', async () => {
      vi.mocked(promotionBatchRepository.findByIdTx).mockResolvedValue(mockBatch);
      vi.mocked(studentEnrollmentRepository.findByIdTx).mockResolvedValue({
        id: 'student-enr-1',
        status: 'ACTIVE',
        curriculumVersionId: 'curriculum-1',
      } as any);
      vi.mocked(semesterEnrollmentRepository.findByIdTx).mockResolvedValue({
        id: 'sem-enr-1',
        studentEnrollmentId: 'student-enr-1',
        semesterCatalogId: 'sem-cat-1',
        academicYearId: 'ay-1',
        status: 'IN_PROGRESS',
      } as any);
      vi.mocked(promotionDecisionRepository.findByBatchAndStudentTx).mockResolvedValue(null);
      vi.mocked(promotionDecisionRepository.create).mockResolvedValue(mockDecision);

      const result = await promotionService.createPromotionDecision('user-1', 'batch-1', input);
      expect(result.id).toBe('decision-1');
      expect(result.outcome).toBe('PROMOTE');
    });
  });

  describe('getPromotionDecisionById', () => {
    it('returns decision DTO when found', async () => {
      vi.mocked(promotionDecisionRepository.findById).mockResolvedValue(mockDecision);

      const result = await promotionService.getPromotionDecisionById('decision-1');
      expect(result.id).toBe('decision-1');
      expect(result.outcome).toBe('PROMOTE');
    });

    it('throws RECORD_NOT_FOUND when decision not found', async () => {
      vi.mocked(promotionDecisionRepository.findById).mockResolvedValue(null);

      await expect(promotionService.getPromotionDecisionById('nonexistent')).rejects.toThrow(
        'Promotion decision not found',
      );
    });
  });

  describe('listPromotionDecisions', () => {
    it('returns paginated decisions', async () => {
      vi.mocked(promotionDecisionRepository.list).mockResolvedValue({
        promotionDecisions: [mockDecision],
        total: 1,
      });

      const result = await promotionService.listPromotionDecisions(
        {},
        { page: 1, limit: 10, sortBy: 'createdAt', sortOrder: 'desc' },
      );
      expect(result.total).toBe(1);
      expect(result.promotionDecisions).toHaveLength(1);
    });
  });

  describe('finalizePromotionBatch', () => {
    it('throws RECORD_NOT_FOUND if batch not found', async () => {
      vi.mocked(promotionBatchRepository.findByIdTx).mockResolvedValue(null);

      await expect(promotionService.finalizePromotionBatch('user-1', 'batch-1')).rejects.toThrow(
        'Promotion batch not found',
      );
    });

    it('throws error if batch is already FINALIZED', async () => {
      vi.mocked(promotionBatchRepository.findByIdTx).mockResolvedValue({
        ...mockBatch,
        status: 'FINALIZED',
      } as any);

      await expect(promotionService.finalizePromotionBatch('user-1', 'batch-1')).rejects.toThrow(
        'This promotion batch has already been finalized',
      );
    });

    it('finalizes batch and transitions students successfully with GRADUATE outcome', async () => {
      vi.mocked(promotionBatchRepository.findByIdTx).mockResolvedValue(mockBatch);
      vi.mocked(promotionDecisionRepository.findAllByBatchIdTx).mockResolvedValue([
        {
          ...mockDecision,
          outcome: 'GRADUATE',
        } as any,
      ]);
      vi.mocked(studentEnrollmentRepository.findByIdTx).mockResolvedValue({
        id: 'student-enr-1',
        status: 'ACTIVE',
      } as any);
      vi.mocked(semesterEnrollmentRepository.findByIdTx).mockResolvedValue({
        id: 'sem-enr-1',
        studentEnrollmentId: 'student-enr-1',
        semesterCatalogId: 'sem-cat-1',
        academicYearId: 'ay-1',
        status: 'IN_PROGRESS',
      } as any);
      vi.mocked(academicYearRepository.findActiveTx).mockResolvedValue({
        id: 'ay-active',
      } as any);
      vi.mocked(semesterEnrollmentRepository.markGraduated).mockResolvedValue({
        id: 'sem-enr-1',
        status: 'GRADUATED',
      } as any);
      vi.mocked(studentEnrollmentRepository.graduate).mockResolvedValue({
        id: 'student-enr-1',
        status: 'GRADUATED',
      } as any);
      vi.mocked(promotionBatchRepository.finalize).mockResolvedValue({
        ...mockBatch,
        status: 'FINALIZED',
        finalizedAt: new Date(),
      } as any);

      const result = await promotionService.finalizePromotionBatch('user-1', 'batch-1');
      expect(result.status).toBe('FINALIZED');
    });

    it('finalizes batch with PROMOTE outcome', async () => {
      vi.mocked(promotionBatchRepository.findByIdTx).mockResolvedValue(mockBatch);
      vi.mocked(promotionDecisionRepository.findAllByBatchIdTx).mockResolvedValue([
        {
          ...mockDecision,
          outcome: 'PROMOTE',
        } as any,
      ]);
      vi.mocked(studentEnrollmentRepository.findByIdTx).mockResolvedValue({
        id: 'student-enr-1',
        status: 'ACTIVE',
        curriculumVersionId: 'curriculum-1',
      } as any);
      vi.mocked(semesterEnrollmentRepository.findByIdTx).mockResolvedValue({
        id: 'sem-enr-1',
        studentEnrollmentId: 'student-enr-1',
        semesterCatalogId: 'sem-cat-1',
        academicYearId: 'ay-1',
        status: 'IN_PROGRESS',
      } as any);
      vi.mocked(semesterCatalogRepository.findByIdTx).mockResolvedValue({
        id: 'sem-cat-1',
        curriculumVersionId: 'curriculum-1',
        number: 1,
      } as any);
      vi.mocked(semesterCatalogRepository.findByCurriculumVersionAndNumberTx).mockResolvedValue({
        id: 'sem-cat-2',
        curriculumVersionId: 'curriculum-1',
        number: 2,
      } as any);
      vi.mocked(academicYearRepository.findActiveTx).mockResolvedValue({
        id: 'ay-active',
      } as any);
      vi.mocked(semesterEnrollmentRepository.getNextAttemptNumberTx).mockResolvedValue(1);
      vi.mocked(semesterEnrollmentRepository.create).mockResolvedValue({
        id: 'sem-enr-2',
      } as any);
      vi.mocked(semesterEnrollmentRepository.markPromoted).mockResolvedValue({
        id: 'sem-enr-1',
        status: 'PROMOTED',
      } as any);
      vi.mocked(promotionDecisionRepository.attachTargetSemesterEnrollment).mockResolvedValue(
        mockDecision,
      );
      vi.mocked(promotionBatchRepository.finalize).mockResolvedValue({
        ...mockBatch,
        status: 'FINALIZED',
        finalizedAt: new Date(),
      } as any);

      const result = await promotionService.finalizePromotionBatch('user-1', 'batch-1');
      expect(result.status).toBe('FINALIZED');
    });

    it('finalizes batch with WITHDRAW outcome', async () => {
      vi.mocked(promotionBatchRepository.findByIdTx).mockResolvedValue(mockBatch);
      vi.mocked(promotionDecisionRepository.findAllByBatchIdTx).mockResolvedValue([
        {
          ...mockDecision,
          outcome: 'WITHDRAW',
        } as any,
      ]);
      vi.mocked(studentEnrollmentRepository.findByIdTx).mockResolvedValue({
        id: 'student-enr-1',
        status: 'ACTIVE',
      } as any);
      vi.mocked(semesterEnrollmentRepository.findByIdTx).mockResolvedValue({
        id: 'sem-enr-1',
        studentEnrollmentId: 'student-enr-1',
        semesterCatalogId: 'sem-cat-1',
        academicYearId: 'ay-1',
        status: 'IN_PROGRESS',
      } as any);
      vi.mocked(academicYearRepository.findActiveTx).mockResolvedValue({
        id: 'ay-active',
      } as any);
      vi.mocked(semesterEnrollmentRepository.markWithdrawn).mockResolvedValue({
        id: 'sem-enr-1',
        status: 'WITHDRAWN',
      } as any);
      vi.mocked(promotionBatchRepository.finalize).mockResolvedValue({
        ...mockBatch,
        status: 'FINALIZED',
        finalizedAt: new Date(),
      } as any);

      const result = await promotionService.finalizePromotionBatch('user-1', 'batch-1');
      expect(result.status).toBe('FINALIZED');
    });

    it('finalizes batch with REPEAT outcome', async () => {
      vi.mocked(promotionBatchRepository.findByIdTx).mockResolvedValue(mockBatch);
      vi.mocked(promotionDecisionRepository.findAllByBatchIdTx).mockResolvedValue([
        {
          ...mockDecision,
          outcome: 'REPEAT',
        } as any,
      ]);
      vi.mocked(studentEnrollmentRepository.findByIdTx).mockResolvedValue({
        id: 'student-enr-1',
        status: 'ACTIVE',
        curriculumVersionId: 'curriculum-1',
      } as any);
      vi.mocked(semesterEnrollmentRepository.findByIdTx).mockResolvedValue({
        id: 'sem-enr-1',
        studentEnrollmentId: 'student-enr-1',
        semesterCatalogId: 'sem-cat-1',
        academicYearId: 'ay-1',
        status: 'IN_PROGRESS',
      } as any);
      vi.mocked(academicYearRepository.findActiveTx).mockResolvedValue({
        id: 'ay-active',
      } as any);
      vi.mocked(semesterEnrollmentRepository.getNextAttemptNumberTx).mockResolvedValue(2);
      vi.mocked(semesterEnrollmentRepository.create).mockResolvedValue({
        id: 'sem-enr-repeat',
      } as any);
      vi.mocked(semesterEnrollmentRepository.markRepeated).mockResolvedValue({
        id: 'sem-enr-1',
        status: 'REPEATED',
      } as any);
      vi.mocked(promotionDecisionRepository.attachTargetSemesterEnrollment).mockResolvedValue(
        mockDecision,
      );
      vi.mocked(promotionBatchRepository.finalize).mockResolvedValue({
        ...mockBatch,
        status: 'FINALIZED',
        finalizedAt: new Date(),
      } as any);

      const result = await promotionService.finalizePromotionBatch('user-1', 'batch-1');
      expect(result.status).toBe('FINALIZED');
    });

    it('finalizes batch with DISCONTINUE outcome', async () => {
      vi.mocked(promotionBatchRepository.findByIdTx).mockResolvedValue(mockBatch);
      vi.mocked(promotionDecisionRepository.findAllByBatchIdTx).mockResolvedValue([
        {
          ...mockDecision,
          outcome: 'DISCONTINUE',
        } as any,
      ]);
      vi.mocked(studentEnrollmentRepository.findByIdTx).mockResolvedValue({
        id: 'student-enr-1',
        status: 'ACTIVE',
      } as any);
      vi.mocked(semesterEnrollmentRepository.findByIdTx).mockResolvedValue({
        id: 'sem-enr-1',
        studentEnrollmentId: 'student-enr-1',
        semesterCatalogId: 'sem-cat-1',
        academicYearId: 'ay-1',
        status: 'IN_PROGRESS',
      } as any);
      vi.mocked(academicYearRepository.findActiveTx).mockResolvedValue({
        id: 'ay-active',
      } as any);
      vi.mocked(semesterEnrollmentRepository.markDiscontinued).mockResolvedValue({
        id: 'sem-enr-1',
        status: 'DISCONTINUED',
      } as any);
      vi.mocked(studentEnrollmentRepository.discontinue).mockResolvedValue({
        id: 'student-enr-1',
        status: 'DISCONTINUED',
      } as any);
      vi.mocked(promotionBatchRepository.finalize).mockResolvedValue({
        ...mockBatch,
        status: 'FINALIZED',
        finalizedAt: new Date(),
      } as any);

      const result = await promotionService.finalizePromotionBatch('user-1', 'batch-1');
      expect(result.status).toBe('FINALIZED');
    });
  });

  describe('listPromotionBatches', () => {
    it('returns paginated batches', async () => {
      vi.mocked(promotionBatchRepository.list).mockResolvedValue({
        promotionBatches: [mockBatch],
        total: 1,
      });

      const result = await promotionService.listPromotionBatches(
        {},
        { page: 1, limit: 10, sortBy: 'createdAt', sortOrder: 'desc' },
      );
      expect(result.total).toBe(1);
      expect(result.promotionBatches).toHaveLength(1);
    });
  });
});
