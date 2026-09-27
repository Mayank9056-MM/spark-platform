/* eslint-disable @typescript-eslint/unbound-method, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockTx = {
  semesterEnrollment: {
    count: vi.fn().mockResolvedValue(0),
  },
};

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    $transaction: vi.fn(async (cb: (tx: any) => Promise<any>) => cb(mockTx)),
  },
}));

vi.mock('../../lib/logger.js', () => ({
  studentEnrollmentLogger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../audit/audit.service.js', () => ({
  recordAuditTx: vi.fn(),
}));

vi.mock('../admissions/admission.repository.js', () => ({
  admissionRepository: {
    findByIdTx: vi.fn(),
  },
}));

vi.mock('./studentEnrollment.repository.js', () => ({
  studentEnrollmentRepository: {
    findById: vi.fn(),
    findByIdTx: vi.fn(),
    findByAdmissionIdTx: vi.fn(),
    findActiveByUserIdTx: vi.fn(),
    findByRollNumberTx: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    cancel: vi.fn(),
    withdraw: vi.fn(),
    list: vi.fn(),
  },
}));

import { admissionRepository } from '../admissions/admission.repository.js';

import { studentEnrollmentRepository } from './studentEnrollment.repository.js';
import { studentEnrollmentService } from './studentEnrollment.service.js';

describe('StudentEnrollmentService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTx.semesterEnrollment.count.mockResolvedValue(0);
  });

  const mockAdmission = {
    id: 'admission-1',
    userId: 'user-1',
    initialProgramId: 'program-1',
    initialCurriculumId: 'curriculum-1',
    admissionDate: new Date('2026-08-01T00:00:00Z'),
    status: 'CONFIRMED' as const,
  };

  const mockEnrollment = {
    id: 'enrollment-1',
    admissionId: 'admission-1',
    userId: 'user-1',
    programId: 'program-1',
    curriculumVersionId: 'curriculum-1',
    rollNumber: 'CS-001',
    admissionDate: new Date('2026-08-01T00:00:00Z'),
    status: 'ACTIVE' as const,
    statusReason: null,
    statusChangedAt: null,
    createdAt: new Date('2026-08-01T00:00:00Z'),
    updatedAt: new Date('2026-08-01T00:00:00Z'),
  };

  describe('getStudentEnrollmentById', () => {
    it('returns enrollment DTO when found', async () => {
      vi.mocked(studentEnrollmentRepository.findById).mockResolvedValue(mockEnrollment);

      const result = await studentEnrollmentService.getStudentEnrollmentById('enrollment-1');
      expect(result.id).toBe('enrollment-1');
      expect(result.rollNumber).toBe('CS-001');
    });

    it('throws RECORD_NOT_FOUND when not found', async () => {
      vi.mocked(studentEnrollmentRepository.findById).mockResolvedValue(null);

      await expect(
        studentEnrollmentService.getStudentEnrollmentById('nonexistent'),
      ).rejects.toThrow('Student enrollment not found');
    });
  });

  describe('createStudentEnrollment', () => {
    const input = {
      admissionId: 'admission-1',
      rollNumber: 'CS-001',
    };

    it('throws ADMISSION_NOT_FOUND if admission does not exist', async () => {
      vi.mocked(admissionRepository.findByIdTx).mockResolvedValue(null);

      await expect(
        studentEnrollmentService.createStudentEnrollment('admin-1', input),
      ).rejects.toThrow('Admission not found');
    });

    it('throws ADMISSION_NOT_CONFIRMED if admission is CANCELLED', async () => {
      vi.mocked(admissionRepository.findByIdTx).mockResolvedValue({
        ...mockAdmission,
        status: 'CANCELLED',
      } as any);

      await expect(
        studentEnrollmentService.createStudentEnrollment('admin-1', input),
      ).rejects.toThrow('A cancelled admission cannot produce a student enrollment');
    });

    it('throws ADMISSION_ALREADY_ENROLLED if enrollment already exists for admission', async () => {
      vi.mocked(admissionRepository.findByIdTx).mockResolvedValue(mockAdmission as any);
      vi.mocked(studentEnrollmentRepository.findByAdmissionIdTx).mockResolvedValue(mockEnrollment);

      await expect(
        studentEnrollmentService.createStudentEnrollment('admin-1', input),
      ).rejects.toThrow('This admission has already produced a student enrollment');
    });

    it('throws error if user already has an active enrollment', async () => {
      vi.mocked(admissionRepository.findByIdTx).mockResolvedValue(mockAdmission as any);
      vi.mocked(studentEnrollmentRepository.findByAdmissionIdTx).mockResolvedValue(null);
      vi.mocked(studentEnrollmentRepository.findActiveByUserIdTx).mockResolvedValue(mockEnrollment);

      await expect(
        studentEnrollmentService.createStudentEnrollment('admin-1', input),
      ).rejects.toThrow('This user already has an active student enrollment');
    });

    it('throws DUPLICATE_ROLL_NUMBER if roll number already taken', async () => {
      vi.mocked(admissionRepository.findByIdTx).mockResolvedValue(mockAdmission as any);
      vi.mocked(studentEnrollmentRepository.findByAdmissionIdTx).mockResolvedValue(null);
      vi.mocked(studentEnrollmentRepository.findActiveByUserIdTx).mockResolvedValue(null);
      vi.mocked(studentEnrollmentRepository.findByRollNumberTx).mockResolvedValue(mockEnrollment);

      await expect(
        studentEnrollmentService.createStudentEnrollment('admin-1', input),
      ).rejects.toThrow('This roll number is already assigned to another student enrollment');
    });

    it('creates student enrollment successfully', async () => {
      vi.mocked(admissionRepository.findByIdTx).mockResolvedValue(mockAdmission as any);
      vi.mocked(studentEnrollmentRepository.findByAdmissionIdTx).mockResolvedValue(null);
      vi.mocked(studentEnrollmentRepository.findActiveByUserIdTx).mockResolvedValue(null);
      vi.mocked(studentEnrollmentRepository.findByRollNumberTx).mockResolvedValue(null);
      vi.mocked(studentEnrollmentRepository.create).mockResolvedValue(mockEnrollment);

      const result = await studentEnrollmentService.createStudentEnrollment('admin-1', input);
      expect(result.id).toBe('enrollment-1');
      expect(result.rollNumber).toBe('CS-001');
    });
  });

  describe('updateStudentEnrollment', () => {
    it('throws RECORD_NOT_FOUND when enrollment not found', async () => {
      vi.mocked(studentEnrollmentRepository.findByIdTx).mockResolvedValue(null);

      await expect(
        studentEnrollmentService.updateStudentEnrollment('admin-1', 'nonexistent', {
          rollNumber: 'CS-002',
        }),
      ).rejects.toThrow('Student enrollment not found');
    });

    it('returns existing unchanged if roll number is identical', async () => {
      vi.mocked(studentEnrollmentRepository.findByIdTx).mockResolvedValue(mockEnrollment);

      const result = await studentEnrollmentService.updateStudentEnrollment(
        'admin-1',
        'enrollment-1',
        { rollNumber: 'CS-001' },
      );
      expect(result.rollNumber).toBe('CS-001');
      expect(studentEnrollmentRepository.update).not.toHaveBeenCalled();
    });

    it('throws conflict if roll number taken by another enrollment', async () => {
      vi.mocked(studentEnrollmentRepository.findByIdTx).mockResolvedValue(mockEnrollment);
      vi.mocked(studentEnrollmentRepository.findByRollNumberTx).mockResolvedValue({
        ...mockEnrollment,
        id: 'different-enrollment',
      });

      await expect(
        studentEnrollmentService.updateStudentEnrollment('admin-1', 'enrollment-1', {
          rollNumber: 'CS-002',
        }),
      ).rejects.toThrow('This roll number is already assigned to another student enrollment');
    });

    it('updates rollNumber successfully', async () => {
      vi.mocked(studentEnrollmentRepository.findByIdTx).mockResolvedValue(mockEnrollment);
      vi.mocked(studentEnrollmentRepository.findByRollNumberTx).mockResolvedValue(null);
      vi.mocked(studentEnrollmentRepository.update).mockResolvedValue({
        ...mockEnrollment,
        rollNumber: 'CS-002',
      });

      const result = await studentEnrollmentService.updateStudentEnrollment(
        'admin-1',
        'enrollment-1',
        { rollNumber: 'CS-002' },
      );
      expect(result.rollNumber).toBe('CS-002');
    });
  });

  describe('cancelStudentEnrollment', () => {
    it('throws RECORD_NOT_FOUND if enrollment does not exist', async () => {
      vi.mocked(studentEnrollmentRepository.findByIdTx).mockResolvedValue(null);

      await expect(
        studentEnrollmentService.cancelStudentEnrollment('admin-1', 'nonexistent', {
          reason: 'Valid reason',
        }),
      ).rejects.toThrow('Student enrollment not found');
    });

    it('throws error if academic activity already exists', async () => {
      vi.mocked(studentEnrollmentRepository.findByIdTx).mockResolvedValue(mockEnrollment);
      mockTx.semesterEnrollment.count.mockResolvedValueOnce(1);

      await expect(
        studentEnrollmentService.cancelStudentEnrollment('admin-1', 'enrollment-1', {
          reason: 'Valid reason',
        }),
      ).rejects.toThrow(
        'This student enrollment already has academic records and can no longer be cancelled',
      );
    });

    it('cancels enrollment successfully when active with no academic activity', async () => {
      vi.mocked(studentEnrollmentRepository.findByIdTx).mockResolvedValue(mockEnrollment);
      mockTx.semesterEnrollment.count.mockResolvedValueOnce(0);
      vi.mocked(studentEnrollmentRepository.cancel).mockResolvedValue({
        ...mockEnrollment,
        status: 'CANCELLED',
        statusReason: 'Administrative error',
      } as any);

      const result = await studentEnrollmentService.cancelStudentEnrollment(
        'admin-1',
        'enrollment-1',
        { reason: 'Administrative error' },
      );
      expect(result.status).toBe('CANCELLED');
    });
  });

  describe('withdrawStudentEnrollment', () => {
    it('withdraws active enrollment successfully', async () => {
      vi.mocked(studentEnrollmentRepository.findByIdTx).mockResolvedValue(mockEnrollment);
      vi.mocked(studentEnrollmentRepository.withdraw).mockResolvedValue({
        ...mockEnrollment,
        status: 'WITHDRAWN',
        statusReason: 'Relocation',
      } as any);

      const result = await studentEnrollmentService.withdrawStudentEnrollment(
        'admin-1',
        'enrollment-1',
        { reason: 'Relocation' },
      );
      expect(result.status).toBe('WITHDRAWN');
    });
  });

  describe('listStudentEnrollments', () => {
    it('returns paginated list', async () => {
      vi.mocked(studentEnrollmentRepository.list).mockResolvedValue({
        studentEnrollments: [mockEnrollment],
        total: 1,
      });

      const result = await studentEnrollmentService.listStudentEnrollments(
        {},
        { page: 1, limit: 20, sortBy: 'rollNumber', sortOrder: 'asc' },
      );
      expect(result.total).toBe(1);
      expect(result.studentEnrollments).toHaveLength(1);
    });
  });
});
