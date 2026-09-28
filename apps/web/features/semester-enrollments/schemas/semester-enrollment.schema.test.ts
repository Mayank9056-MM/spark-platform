import { describe, expect, it } from 'vitest';

import {
  createSemesterEnrollmentSchema,
  listSemesterEnrollmentsQuerySchema,
  semesterEnrollmentSchema,
} from './semester-enrollment.schema';

describe('Semester Enrollment Schemas', () => {
  describe('createSemesterEnrollmentSchema', () => {
    it('validates valid creation payload', () => {
      const valid = {
        studentEnrollmentId: '550e8400-e29b-41d4-a716-446655440000',
        semesterCatalogId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
        academicYearId: '7ca7b810-9dad-11d1-80b4-00c04fd430c9',
      };
      const result = createSemesterEnrollmentSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('rejects invalid UUIDs', () => {
      const invalid = {
        studentEnrollmentId: 'bad-id',
        semesterCatalogId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
        academicYearId: '7ca7b810-9dad-11d1-80b4-00c04fd430c9',
      };
      const result = createSemesterEnrollmentSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('semesterEnrollmentSchema', () => {
    it('validates a complete semester enrollment DTO', () => {
      const dto = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        studentEnrollmentId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
        semesterCatalogId: '7ca7b810-9dad-11d1-80b4-00c04fd430c9',
        academicYearId: '8da7b810-9dad-11d1-80b4-00c04fd430ca',
        status: 'IN_PROGRESS',
        attemptNumber: 1,
        createdAt: '2026-09-01T00:00:00.000Z',
        updatedAt: '2026-09-01T00:00:00.000Z',
      };
      const result = semesterEnrollmentSchema.safeParse(dto);
      expect(result.success).toBe(true);
    });
  });

  describe('listSemesterEnrollmentsQuerySchema', () => {
    it('applies defaults correctly', () => {
      const query = listSemesterEnrollmentsQuerySchema.parse({});
      expect(query.page).toBe(1);
      expect(query.limit).toBe(20);
      expect(query.sortBy).toBe('createdAt');
      expect(query.sortOrder).toBe('desc');
    });
  });
});
