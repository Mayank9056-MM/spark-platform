/* eslint-disable @typescript-eslint/unbound-method, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    $transaction: vi.fn(async (cb: (tx: any) => Promise<any>) => cb({})),
  },
}));

vi.mock('../../lib/logger.js', () => ({
  subjectOfferingLogger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../audit/audit.service.js', () => ({
  recordAuditTx: vi.fn(),
}));

vi.mock('../academic/subjects/subject.repository.js', () => ({
  subjectRepository: {
    findByIdTx: vi.fn(),
  },
}));

vi.mock('../academic-years/academic-year.repository.js', () => ({
  academicYearRepository: {
    findByIdTx: vi.fn(),
  },
}));

vi.mock('./subjectOffering.repository.js', () => ({
  subjectOfferingRepository: {
    findById: vi.fn(),
    findBySubjectIdAndAcademicYearIdTx: vi.fn(),
    create: vi.fn(),
    list: vi.fn(),
  },
}));

import { subjectRepository } from '../academic/subjects/subject.repository.js';
import { academicYearRepository } from '../academic-years/academic-year.repository.js';

import { subjectOfferingRepository } from './subjectOffering.repository.js';
import { subjectOfferingService } from './subjectOffering.service.js';

describe('SubjectOfferingService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockOffering = {
    id: 'offering-1',
    subjectId: 'subject-1',
    academicYearId: 'ay-1',
    createdAt: new Date('2026-08-01T00:00:00Z'),
    updatedAt: new Date('2026-08-01T00:00:00Z'),
  };

  describe('getSubjectOfferingById', () => {
    it('returns DTO when offering exists', async () => {
      vi.mocked(subjectOfferingRepository.findById).mockResolvedValue(mockOffering);

      const result = await subjectOfferingService.getSubjectOfferingById('offering-1');
      expect(result.id).toBe('offering-1');
      expect(result.subjectId).toBe('subject-1');
    });

    it('throws RECORD_NOT_FOUND when offering does not exist', async () => {
      vi.mocked(subjectOfferingRepository.findById).mockResolvedValue(null);

      await expect(subjectOfferingService.getSubjectOfferingById('nonexistent')).rejects.toThrow(
        'Subject offering not found',
      );
    });
  });

  describe('createSubjectOffering', () => {
    const input = {
      subjectId: 'subject-1',
      academicYearId: 'ay-1',
    };

    it('throws RECORD_NOT_FOUND if subject does not exist', async () => {
      vi.mocked(subjectRepository.findByIdTx).mockResolvedValue(null);

      await expect(subjectOfferingService.createSubjectOffering('admin-1', input)).rejects.toThrow(
        'Subject not found',
      );
    });

    it('throws RECORD_NOT_FOUND if academic year does not exist', async () => {
      vi.mocked(subjectRepository.findByIdTx).mockResolvedValue({ id: 'subject-1' } as any);
      vi.mocked(academicYearRepository.findByIdTx).mockResolvedValue(null);

      await expect(subjectOfferingService.createSubjectOffering('admin-1', input)).rejects.toThrow(
        'Academic year not found',
      );
    });

    it('throws DUPLICATE_ENTRY if offering already exists for subject and academic year', async () => {
      vi.mocked(subjectRepository.findByIdTx).mockResolvedValue({ id: 'subject-1' } as any);
      vi.mocked(academicYearRepository.findByIdTx).mockResolvedValue({ id: 'ay-1' } as any);
      vi.mocked(subjectOfferingRepository.findBySubjectIdAndAcademicYearIdTx).mockResolvedValue(
        mockOffering,
      );

      await expect(subjectOfferingService.createSubjectOffering('admin-1', input)).rejects.toThrow(
        'A subject offering already exists for this subject and academic year',
      );
    });

    it('creates offering successfully', async () => {
      vi.mocked(subjectRepository.findByIdTx).mockResolvedValue({ id: 'subject-1' } as any);
      vi.mocked(academicYearRepository.findByIdTx).mockResolvedValue({ id: 'ay-1' } as any);
      vi.mocked(subjectOfferingRepository.findBySubjectIdAndAcademicYearIdTx).mockResolvedValue(
        null,
      );
      vi.mocked(subjectOfferingRepository.create).mockResolvedValue(mockOffering);

      const result = await subjectOfferingService.createSubjectOffering('admin-1', input);
      expect(result.id).toBe('offering-1');
      expect(result.subjectId).toBe('subject-1');
    });
  });

  describe('listSubjectOfferings', () => {
    it('returns paginated offerings', async () => {
      vi.mocked(subjectOfferingRepository.list).mockResolvedValue({
        subjectOfferings: [mockOffering],
        total: 1,
      });

      const result = await subjectOfferingService.listSubjectOfferings(
        {},
        { page: 1, limit: 10, sortBy: 'createdAt', sortOrder: 'desc' },
      );
      expect(result.total).toBe(1);
      expect(result.subjectOfferings).toHaveLength(1);
    });
  });
});
