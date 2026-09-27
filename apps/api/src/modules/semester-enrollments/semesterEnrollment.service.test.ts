/* eslint-disable @typescript-eslint/unbound-method, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    $transaction: vi.fn(async (cb: (tx: any) => Promise<any>) => cb({})),
  },
}));

vi.mock('../../lib/logger.js', () => ({
  semesterEnrollmentLogger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../audit/audit.service.js', () => ({
  recordAuditTx: vi.fn(),
}));

vi.mock('../student-enrollments/studentEnrollment.repository.js', () => ({
  studentEnrollmentRepository: {
    findByIdTx: vi.fn(),
  },
}));

vi.mock('../academic/SemesterCatalog/semester.repository.js', () => ({
  semesterCatalogRepository: {
    findByIdTx: vi.fn(),
  },
}));

vi.mock('../academic-years/academic-year.repository.js', () => ({
  academicYearRepository: {
    findByIdTx: vi.fn(),
  },
}));

vi.mock('../academic/programs/program.repository.js', () => ({
  programRepository: {
    findByIdTx: vi.fn(),
  },
}));

vi.mock('../admissions/admission.repository.js', () => ({
  admissionRepository: {
    findByIdTx: vi.fn(),
  },
}));

vi.mock('./semesterEnrollment.repository.js', () => ({
  semesterEnrollmentRepository: {
    findById: vi.fn(),
    list: vi.fn(),
    findByStudentEnrollmentIdAndSemesterCatalogIdTx: vi.fn(),
    getNextAttemptNumberTx: vi.fn(),
    create: vi.fn(),
  },
}));

import { programRepository } from '../academic/programs/program.repository.js';
import { semesterCatalogRepository } from '../academic/SemesterCatalog/semester.repository.js';
import { academicYearRepository } from '../academic-years/academic-year.repository.js';
import { admissionRepository } from '../admissions/admission.repository.js';
import { studentEnrollmentRepository } from '../student-enrollments/studentEnrollment.repository.js';

import { semesterEnrollmentRepository } from './semesterEnrollment.repository.js';
import { semesterEnrollmentService } from './semesterEnrollment.service.js';

describe('SemesterEnrollmentService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockStudentEnrollment = {
    id: 'student-enr-1',
    admissionId: 'adm-1',
    userId: 'user-1',
    programId: 'prog-1',
    curriculumVersionId: 'curriculum-1',
    rollNumber: 'CS-001',
    status: 'ACTIVE' as const,
  };

  const mockSemesterCatalog = {
    id: 'sem-cat-1',
    curriculumVersionId: 'curriculum-1',
    number: 1,
  };

  const mockAcademicYear = {
    id: 'ay-1',
    label: '2026-2027',
    isActive: true,
  };

  const mockProgram = {
    id: 'prog-1',
    totalSemesters: 8,
  };

  const mockAdmission = {
    id: 'adm-1',
    entrySemesterCatalogId: 'sem-cat-1',
  };

  const mockSemesterEnrollment = {
    id: 'sem-enr-1',
    studentEnrollmentId: 'student-enr-1',
    semesterCatalogId: 'sem-cat-1',
    academicYearId: 'ay-1',
    attemptNumber: 1,
    status: 'IN_PROGRESS' as const,
    createdAt: new Date('2026-09-01T00:00:00Z'),
    updatedAt: new Date('2026-09-01T00:00:00Z'),
  };

  describe('getSemesterEnrollmentById', () => {
    it('returns DTO when semester enrollment exists', async () => {
      vi.mocked(semesterEnrollmentRepository.findById).mockResolvedValue(mockSemesterEnrollment);

      const result = await semesterEnrollmentService.getSemesterEnrollmentById('sem-enr-1');
      expect(result.id).toBe('sem-enr-1');
      expect(result.attemptNumber).toBe(1);
    });

    it('throws RECORD_NOT_FOUND when semester enrollment does not exist', async () => {
      vi.mocked(semesterEnrollmentRepository.findById).mockResolvedValue(null);

      await expect(
        semesterEnrollmentService.getSemesterEnrollmentById('nonexistent'),
      ).rejects.toThrow('Semester enrollment not found');
    });
  });

  describe('createSemesterEnrollment', () => {
    const input = {
      studentEnrollmentId: 'student-enr-1',
      semesterCatalogId: 'sem-cat-1',
      academicYearId: 'ay-1',
    };

    it('throws RECORD_NOT_FOUND if student enrollment does not exist', async () => {
      vi.mocked(studentEnrollmentRepository.findByIdTx).mockResolvedValue(null);

      await expect(
        semesterEnrollmentService.createSemesterEnrollment('admin-1', input),
      ).rejects.toThrow('Student enrollment not found');
    });

    it('throws error if student enrollment is not ACTIVE', async () => {
      vi.mocked(studentEnrollmentRepository.findByIdTx).mockResolvedValue({
        ...mockStudentEnrollment,
        status: 'WITHDRAWN',
      } as any);

      await expect(
        semesterEnrollmentService.createSemesterEnrollment('admin-1', input),
      ).rejects.toThrow('Only an active student enrollment can open a new semester enrollment');
    });

    it('throws RECORD_NOT_FOUND if semester catalog does not exist', async () => {
      vi.mocked(studentEnrollmentRepository.findByIdTx).mockResolvedValue(
        mockStudentEnrollment as any,
      );
      vi.mocked(semesterCatalogRepository.findByIdTx).mockResolvedValue(null);

      await expect(
        semesterEnrollmentService.createSemesterEnrollment('admin-1', input),
      ).rejects.toThrow('Semester catalog not found');
    });

    it('throws error if semester catalog belongs to different curriculum version', async () => {
      vi.mocked(studentEnrollmentRepository.findByIdTx).mockResolvedValue(
        mockStudentEnrollment as any,
      );
      vi.mocked(semesterCatalogRepository.findByIdTx).mockResolvedValue({
        ...mockSemesterCatalog,
        curriculumVersionId: 'other-curriculum',
      } as any);

      await expect(
        semesterEnrollmentService.createSemesterEnrollment('admin-1', input),
      ).rejects.toThrow('This semester does not belong to the student’s curriculum version');
    });

    it('throws RECORD_NOT_FOUND if academic year does not exist', async () => {
      vi.mocked(studentEnrollmentRepository.findByIdTx).mockResolvedValue(
        mockStudentEnrollment as any,
      );
      vi.mocked(semesterCatalogRepository.findByIdTx).mockResolvedValue(mockSemesterCatalog as any);
      vi.mocked(academicYearRepository.findByIdTx).mockResolvedValue(null);

      await expect(
        semesterEnrollmentService.createSemesterEnrollment('admin-1', input),
      ).rejects.toThrow('Academic year not found');
    });

    it('throws error if semester catalog number exceeds program total semesters', async () => {
      vi.mocked(studentEnrollmentRepository.findByIdTx).mockResolvedValue(
        mockStudentEnrollment as any,
      );
      vi.mocked(semesterCatalogRepository.findByIdTx).mockResolvedValue({
        ...mockSemesterCatalog,
        number: 9,
      } as any);
      vi.mocked(academicYearRepository.findByIdTx).mockResolvedValue(mockAcademicYear as any);
      vi.mocked(programRepository.findByIdTx).mockResolvedValue(mockProgram as any);

      await expect(
        semesterEnrollmentService.createSemesterEnrollment('admin-1', input),
      ).rejects.toThrow('This semester exceeds the program’s total semester count');
    });

    it('creates initial entry semester enrollment successfully', async () => {
      vi.mocked(studentEnrollmentRepository.findByIdTx).mockResolvedValue(
        mockStudentEnrollment as any,
      );
      vi.mocked(semesterCatalogRepository.findByIdTx).mockResolvedValue(mockSemesterCatalog as any);
      vi.mocked(academicYearRepository.findByIdTx).mockResolvedValue(mockAcademicYear as any);
      vi.mocked(programRepository.findByIdTx).mockResolvedValue(mockProgram as any);
      vi.mocked(
        semesterEnrollmentRepository.findByStudentEnrollmentIdAndSemesterCatalogIdTx,
      ).mockResolvedValue(null);
      vi.mocked(admissionRepository.findByIdTx).mockResolvedValue(mockAdmission as any);
      vi.mocked(semesterEnrollmentRepository.getNextAttemptNumberTx).mockResolvedValue(1);
      vi.mocked(semesterEnrollmentRepository.create).mockResolvedValue(mockSemesterEnrollment);

      const result = await semesterEnrollmentService.createSemesterEnrollment('admin-1', input);
      expect(result.id).toBe('sem-enr-1');
      expect(result.attemptNumber).toBe(1);
    });

    it('allows repeat attempt when previous attempt is finalized', async () => {
      vi.mocked(studentEnrollmentRepository.findByIdTx).mockResolvedValue(
        mockStudentEnrollment as any,
      );
      vi.mocked(semesterCatalogRepository.findByIdTx).mockResolvedValue(mockSemesterCatalog as any);
      vi.mocked(academicYearRepository.findByIdTx).mockResolvedValue(mockAcademicYear as any);
      vi.mocked(programRepository.findByIdTx).mockResolvedValue(mockProgram as any);
      vi.mocked(
        semesterEnrollmentRepository.findByStudentEnrollmentIdAndSemesterCatalogIdTx,
      ).mockResolvedValue({
        ...mockSemesterEnrollment,
        attemptNumber: 1,
        status: 'REPEATED',
      } as any);
      vi.mocked(semesterEnrollmentRepository.getNextAttemptNumberTx).mockResolvedValue(2);
      vi.mocked(semesterEnrollmentRepository.create).mockResolvedValue({
        ...mockSemesterEnrollment,
        attemptNumber: 2,
      });

      const result = await semesterEnrollmentService.createSemesterEnrollment('admin-1', input);
      expect(result.attemptNumber).toBe(2);
    });
  });

  describe('listSemesterEnrollments', () => {
    it('returns paginated results', async () => {
      vi.mocked(semesterEnrollmentRepository.list).mockResolvedValue({
        semesterEnrollments: [mockSemesterEnrollment],
        total: 1,
      });

      const result = await semesterEnrollmentService.listSemesterEnrollments(
        {},
        { page: 1, limit: 20, sortBy: 'createdAt', sortOrder: 'desc' },
      );
      expect(result.total).toBe(1);
      expect(result.semesterEnrollments).toHaveLength(1);
    });
  });
});
