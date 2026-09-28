/* eslint-disable @typescript-eslint/unbound-method, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    $transaction: vi.fn(async (cb: (tx: any) => Promise<any>) => cb({})),
  },
}));

vi.mock('../../lib/logger.js', () => ({
  admissionLogger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../audit/audit.service.js', () => ({
  recordAuditTx: vi.fn(),
}));

vi.mock('../user/user.repository.js', () => ({
  userRepository: {
    findById: vi.fn(),
  },
}));

vi.mock('../academic/curricula/curriculum.repository.js', () => ({
  curriculumVersionRepository: {
    findByIdTx: vi.fn(),
  },
}));

vi.mock('../academic/programs/program.repository.js', () => ({
  programRepository: {
    findByIdTx: vi.fn(),
  },
}));

vi.mock('../academic/SemesterCatalog/semester.repository.js', () => ({
  semesterCatalogRepository: {
    findByIdTx: vi.fn(),
  },
}));

vi.mock('./admission.repository.js', () => ({
  admissionRepository: {
    findById: vi.fn(),
    findByIdTx: vi.fn(),
    findByAdmissionNumber: vi.fn(),
    existsByAdmissionNumber: vi.fn(),
    create: vi.fn(),
    list: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    cancel: vi.fn(),
  },
}));

import { curriculumVersionRepository } from '../academic/curricula/curriculum.repository.js';
import { programRepository } from '../academic/programs/program.repository.js';
import { semesterCatalogRepository } from '../academic/SemesterCatalog/semester.repository.js';
import { userRepository } from '../user/user.repository.js';

import { admissionRepository } from './admission.repository.js';
import { admissionService } from './admission.service.js';
import type { CreateAdmissionInput } from './admission.types.js';

describe('AdmissionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockAdmissionRow = {
    id: 'admission-1',
    admissionNumber: 'ADM-2026-001',
    userId: 'user-student-1',
    initialProgramId: 'program-1',
    initialCurriculumId: 'curriculum-1',
    entrySemesterCatalogId: 'semester-1',
    admissionDate: new Date('2026-08-01T00:00:00Z'),
    admissionType: 'NORMAL' as const,
    admittedByUserId: 'admin-1',
    status: 'CONFIRMED' as const,
    quota: 'GOVERNMENT_QUOTA' as const,
    createdAt: new Date('2026-08-01T00:00:00Z'),
    updatedAt: new Date('2026-08-01T00:00:00Z'),
  };

  describe('getAdmissionById', () => {
    it('returns DTO when admission exists', async () => {
      vi.mocked(admissionRepository.findById).mockResolvedValue(mockAdmissionRow);

      const result = await admissionService.getAdmissionById('admission-1');
      expect(result.id).toBe('admission-1');
      expect(result.admissionNumber).toBe('ADM-2026-001');
    });

    it('throws RECORD_NOT_FOUND when admission does not exist', async () => {
      vi.mocked(admissionRepository.findById).mockResolvedValue(null);

      await expect(admissionService.getAdmissionById('nonexistent')).rejects.toThrow(
        'Admission not found',
      );
    });
  });

  describe('createAdmission', () => {
    const input: CreateAdmissionInput = {
      admissionNumber: 'ADM-2026-002',
      userId: 'user-student-2',
      initialProgramId: 'program-1',
      initialCurriculumId: 'curriculum-1',
      entrySemesterCatalogId: 'semester-1',
      admissionDate: '2026-08-01T00:00:00Z',
      admissionType: 'NORMAL',
      quota: 'MANAGEMENT_QUOTA',
    };

    it('throws USER_NOT_FOUND if user does not exist', async () => {
      vi.mocked(userRepository.findById).mockResolvedValue(null);

      await expect(admissionService.createAdmission('admin-1', input)).rejects.toThrow(
        'User not found',
      );
    });

    it('throws DUPLICATE_ADMISSION_NUMBER if admissionNumber is already in use', async () => {
      vi.mocked(userRepository.findById).mockResolvedValue({ id: 'user-student-2' } as any);
      vi.mocked(admissionRepository.existsByAdmissionNumber).mockResolvedValue(true);

      await expect(admissionService.createAdmission('admin-1', input)).rejects.toThrow(
        'An admission with this admission number already exists',
      );
    });

    it('throws CURRICULUM_VERSION_NOT_ADMITTABLE if curriculum version is not ACTIVE', async () => {
      vi.mocked(userRepository.findById).mockResolvedValue({ id: 'user-student-2' } as any);
      vi.mocked(admissionRepository.existsByAdmissionNumber).mockResolvedValue(false);
      vi.mocked(curriculumVersionRepository.findByIdTx).mockResolvedValue({
        id: 'curriculum-1',
        status: 'DRAFT',
        programId: 'program-1',
      } as any);

      await expect(admissionService.createAdmission('admin-1', input)).rejects.toThrow(
        'Admissions can only be created against an active curriculum version',
      );
    });

    it('throws ACADEMIC_HIERARCHY_MISMATCH if curriculum does not belong to specified program', async () => {
      vi.mocked(userRepository.findById).mockResolvedValue({ id: 'user-student-2' } as any);
      vi.mocked(admissionRepository.existsByAdmissionNumber).mockResolvedValue(false);
      vi.mocked(curriculumVersionRepository.findByIdTx).mockResolvedValue({
        id: 'curriculum-1',
        status: 'ACTIVE',
        programId: 'different-program',
      } as any);
      vi.mocked(programRepository.findByIdTx).mockResolvedValue({ id: 'program-1' } as any);

      await expect(admissionService.createAdmission('admin-1', input)).rejects.toThrow(
        'The selected curriculum version does not belong to the selected program',
      );
    });

    it('throws ACADEMIC_HIERARCHY_MISMATCH if entry semester does not belong to curriculum version', async () => {
      vi.mocked(userRepository.findById).mockResolvedValue({ id: 'user-student-2' } as any);
      vi.mocked(admissionRepository.existsByAdmissionNumber).mockResolvedValue(false);
      vi.mocked(curriculumVersionRepository.findByIdTx).mockResolvedValue({
        id: 'curriculum-1',
        status: 'ACTIVE',
        programId: 'program-1',
      } as any);
      vi.mocked(programRepository.findByIdTx).mockResolvedValue({ id: 'program-1' } as any);
      vi.mocked(semesterCatalogRepository.findByIdTx).mockResolvedValue({
        id: 'semester-1',
        curriculumVersionId: 'other-curriculum',
      } as any);

      await expect(admissionService.createAdmission('admin-1', input)).rejects.toThrow(
        'The selected entry semester does not belong to the selected curriculum version',
      );
    });

    it('creates admission successfully when all validations pass', async () => {
      vi.mocked(userRepository.findById).mockResolvedValue({ id: 'user-student-2' } as any);
      vi.mocked(admissionRepository.existsByAdmissionNumber).mockResolvedValue(false);
      vi.mocked(curriculumVersionRepository.findByIdTx).mockResolvedValue({
        id: 'curriculum-1',
        status: 'ACTIVE',
        programId: 'program-1',
      } as any);
      vi.mocked(programRepository.findByIdTx).mockResolvedValue({ id: 'program-1' } as any);
      vi.mocked(semesterCatalogRepository.findByIdTx).mockResolvedValue({
        id: 'semester-1',
        curriculumVersionId: 'curriculum-1',
      } as any);
      vi.mocked(admissionRepository.create).mockResolvedValue({
        ...mockAdmissionRow,
        id: 'admission-2',
        admissionNumber: 'ADM-2026-002',
      });

      const result = await admissionService.createAdmission('admin-1', input);
      expect(result.id).toBe('admission-2');
      expect(result.admissionNumber).toBe('ADM-2026-002');
    });
  });

  describe('listAdmissions', () => {
    it('returns paginated admissions result', async () => {
      vi.mocked(admissionRepository.findMany).mockResolvedValue({
        admissions: [mockAdmissionRow],
        total: 1,
      });

      const result = await admissionService.listAdmissions(
        {},
        { page: 1, limit: 10, sortBy: 'admissionNumber', sortOrder: 'asc' },
      );
      expect(result.total).toBe(1);
      expect(result.admissions).toHaveLength(1);
      expect(result.admissions[0]?.id).toBe('admission-1');
    });
  });

  describe('updateAdmission', () => {
    it('throws RECORD_NOT_FOUND when admission does not exist', async () => {
      vi.mocked(admissionRepository.findByIdTx).mockResolvedValue(null);

      await expect(
        admissionService.updateAdmission('admin-1', 'nonexistent', { quota: 'MANAGEMENT_QUOTA' }),
      ).rejects.toThrow('Admission not found');
    });

    it('throws conflict if admission is CANCELLED', async () => {
      vi.mocked(admissionRepository.findByIdTx).mockResolvedValue({
        ...mockAdmissionRow,
        status: 'CANCELLED',
      } as any);

      await expect(
        admissionService.updateAdmission('admin-1', 'admission-1', { quota: 'MANAGEMENT_QUOTA' }),
      ).rejects.toThrow(
        'A cancelled admission is a permanent historical record and cannot be updated',
      );
    });

    it('updates admission successfully when CONFIRMED', async () => {
      vi.mocked(admissionRepository.findByIdTx).mockResolvedValue(mockAdmissionRow);
      vi.mocked(admissionRepository.update).mockResolvedValue({
        ...mockAdmissionRow,
        quota: 'MANAGEMENT_QUOTA',
      } as any);

      const result = await admissionService.updateAdmission('admin-1', 'admission-1', {
        quota: 'MANAGEMENT_QUOTA',
      });
      expect(result.quota).toBe('MANAGEMENT_QUOTA');
    });
  });

  describe('cancelAdmission', () => {
    it('throws RECORD_NOT_FOUND when admission does not exist', async () => {
      vi.mocked(admissionRepository.findByIdTx).mockResolvedValue(null);

      await expect(admissionService.cancelAdmission('admin-1', 'nonexistent')).rejects.toThrow(
        'Admission not found',
      );
    });

    it('throws ADMISSION_ALREADY_CANCELLED if admission is already cancelled', async () => {
      vi.mocked(admissionRepository.findByIdTx).mockResolvedValue({
        ...mockAdmissionRow,
        status: 'CANCELLED',
      } as any);

      await expect(admissionService.cancelAdmission('admin-1', 'admission-1')).rejects.toThrow(
        'Admission is already cancelled',
      );
    });

    it('cancels admission successfully', async () => {
      vi.mocked(admissionRepository.findByIdTx).mockResolvedValue(mockAdmissionRow);
      vi.mocked(admissionRepository.cancel).mockResolvedValue({
        ...mockAdmissionRow,
        status: 'CANCELLED',
      } as any);

      const result = await admissionService.cancelAdmission('admin-1', 'admission-1');
      expect(result.status).toBe('CANCELLED');
    });
  });
});
