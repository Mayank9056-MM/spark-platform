/* eslint-disable @typescript-eslint/unbound-method, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return */
import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    $transaction: vi.fn(async (cb: (tx: any) => Promise<any>) => cb({})),
    facultyAssignment: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('../audit/audit.service.js', () => ({
  recordAuditTx: vi.fn(),
}));

vi.mock('../rbac/authorization/authorization.service.js', () => ({
  authorizationService: {
    check: vi.fn(),
  },
}));

vi.mock('./facultyAssignment.repository.js', () => ({
  facultyAssignmentRepository: {
    findByIdWithDetails: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    list: vi.fn(),
  },
}));

import { ErrorCode } from '../../common/errors/ErrorCodes.js';
import { authorizationService } from '../rbac/authorization/authorization.service.js';

import { facultyAssignmentRepository } from './facultyAssignment.repository.js';
import { facultyAssignmentService } from './facultyAssignment.service.js';

describe('FacultyAssignmentService - getFacultyAssignmentById', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockAssignment = {
    id: 'assignment-dept-a-1',
    subjectOfferingId: 'offering-1',
    subjectComponentId: 'component-1',
    facultyUserId: 'faculty-user-a',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    subjectOffering: {
      subject: {
        semesterCatalog: {
          curriculumVersion: {
            program: {
              departmentId: 'dept-a',
            },
          },
        },
      },
    },
  };

  it('throws 404 when faculty assignment does not exist', async () => {
    vi.mocked(facultyAssignmentRepository.findByIdWithDetails).mockResolvedValue(null);

    await expect(
      facultyAssignmentService.getFacultyAssignmentById('user-1', 'nonexistent'),
    ).rejects.toThrow('Faculty assignment not found');
  });

  it('allows access when actor has COLLEGE scope (e.g. Principal / Admin / Super Admin)', async () => {
    vi.mocked(facultyAssignmentRepository.findByIdWithDetails).mockResolvedValue(
      mockAssignment as any,
    );
    vi.mocked(authorizationService.check).mockResolvedValueOnce({
      decision: { allowed: true },
    } as any);

    const result = await facultyAssignmentService.getFacultyAssignmentById(
      'admin-user',
      'assignment-dept-a-1',
    );

    expect(result.id).toBe('assignment-dept-a-1');
    expect(authorizationService.check).toHaveBeenCalledWith({
      subject: { userId: 'admin-user' },
      resource: 'facultyAssignment',
      action: 'read',
      scope: { type: 'COLLEGE' },
    });
  });

  it('allows HOD to access assignments within their department', async () => {
    vi.mocked(facultyAssignmentRepository.findByIdWithDetails).mockResolvedValue(
      mockAssignment as any,
    );
    // College check -> false
    vi.mocked(authorizationService.check).mockResolvedValueOnce({
      decision: { allowed: false, reason: ErrorCode.INSUFFICIENT_ROLE },
    } as any);
    // Dept read check -> true
    vi.mocked(authorizationService.check).mockResolvedValueOnce({
      decision: { allowed: true },
    } as any);
    // Dept create check (management authority) -> true
    vi.mocked(authorizationService.check).mockResolvedValueOnce({
      decision: { allowed: true },
    } as any);

    const result = await facultyAssignmentService.getFacultyAssignmentById(
      'hod-dept-a',
      'assignment-dept-a-1',
    );

    expect(result.id).toBe('assignment-dept-a-1');
  });

  it('denies HOD access to assignments in another department (cross-department BOLA)', async () => {
    vi.mocked(facultyAssignmentRepository.findByIdWithDetails).mockResolvedValue(
      mockAssignment as any,
    );
    // College check -> false
    vi.mocked(authorizationService.check).mockResolvedValueOnce({
      decision: { allowed: false, reason: ErrorCode.INSUFFICIENT_ROLE },
    } as any);
    // Dept read check on dept-a for HOD-B -> false
    vi.mocked(authorizationService.check).mockResolvedValueOnce({
      decision: { allowed: false, reason: ErrorCode.FORBIDDEN_SCOPE },
    } as any);

    await expect(
      facultyAssignmentService.getFacultyAssignmentById('hod-dept-b', 'assignment-dept-a-1'),
    ).rejects.toMatchObject({
      statusCode: 403,
      code: ErrorCode.FORBIDDEN_SCOPE,
    });
  });

  it('allows faculty to access their OWN assignment in their department', async () => {
    vi.mocked(facultyAssignmentRepository.findByIdWithDetails).mockResolvedValue(
      mockAssignment as any,
    );
    // College check -> false
    vi.mocked(authorizationService.check).mockResolvedValueOnce({
      decision: { allowed: false, reason: ErrorCode.INSUFFICIENT_ROLE },
    } as any);
    // Dept read check -> true
    vi.mocked(authorizationService.check).mockResolvedValueOnce({
      decision: { allowed: true },
    } as any);
    // Dept create check (manage) -> false (regular faculty cannot manage)
    vi.mocked(authorizationService.check).mockResolvedValueOnce({
      decision: { allowed: false, reason: ErrorCode.INSUFFICIENT_ROLE },
    } as any);

    const result = await facultyAssignmentService.getFacultyAssignmentById(
      'faculty-user-a',
      'assignment-dept-a-1',
    );

    expect(result.id).toBe('assignment-dept-a-1');
  });

  it('denies faculty member from accessing ANOTHER faculty assignment in the same department (IDOR)', async () => {
    vi.mocked(facultyAssignmentRepository.findByIdWithDetails).mockResolvedValue(
      mockAssignment as any,
    );
    // College check -> false
    vi.mocked(authorizationService.check).mockResolvedValueOnce({
      decision: { allowed: false, reason: ErrorCode.INSUFFICIENT_ROLE },
    } as any);
    // Dept read check -> true (both are in dept-a)
    vi.mocked(authorizationService.check).mockResolvedValueOnce({
      decision: { allowed: true },
    } as any);
    // Dept create check (manage) -> false (regular faculty cannot manage)
    vi.mocked(authorizationService.check).mockResolvedValueOnce({
      decision: { allowed: false, reason: ErrorCode.INSUFFICIENT_ROLE },
    } as any);

    // faculty-user-b tries to access assignment belonging to faculty-user-a
    await expect(
      facultyAssignmentService.getFacultyAssignmentById('faculty-user-b', 'assignment-dept-a-1'),
    ).rejects.toMatchObject({
      statusCode: 403,
      code: ErrorCode.FORBIDDEN_SCOPE,
    });
  });

  it('denies faculty member from accessing assignment in ANOTHER department', async () => {
    vi.mocked(facultyAssignmentRepository.findByIdWithDetails).mockResolvedValue(
      mockAssignment as any,
    );
    // College check -> false
    vi.mocked(authorizationService.check).mockResolvedValueOnce({
      decision: { allowed: false, reason: ErrorCode.INSUFFICIENT_ROLE },
    } as any);
    // Dept read check -> false
    vi.mocked(authorizationService.check).mockResolvedValueOnce({
      decision: { allowed: false, reason: ErrorCode.FORBIDDEN_SCOPE },
    } as any);

    await expect(
      facultyAssignmentService.getFacultyAssignmentById(
        'faculty-user-other-dept',
        'assignment-dept-a-1',
      ),
    ).rejects.toThrow(ApiError);
  });
});
