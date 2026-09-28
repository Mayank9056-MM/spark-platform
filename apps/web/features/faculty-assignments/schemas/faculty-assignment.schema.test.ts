import { describe, expect, it } from 'vitest';

import {
  createFacultyAssignmentSchema,
  facultyAssignmentSchema,
  listFacultyAssignmentsQuerySchema,
} from './faculty-assignment.schema';

describe('Faculty Assignment Schemas', () => {
  describe('createFacultyAssignmentSchema', () => {
    it('validates a valid faculty assignment payload', () => {
      const valid = {
        subjectOfferingId: '550e8400-e29b-41d4-a716-446655440000',
        subjectComponentId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
        facultyUserId: '7ca7b810-9dad-11d1-80b4-00c04fd430c9',
      };
      const result = createFacultyAssignmentSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('rejects invalid UUIDs', () => {
      const invalid = {
        subjectOfferingId: 'not-valid',
        subjectComponentId: '123',
        facultyUserId: '',
      };
      const result = createFacultyAssignmentSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('facultyAssignmentSchema', () => {
    it('validates an assignment DTO from the server', () => {
      const dto = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        subjectOfferingId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
        subjectComponentId: '7ca7b810-9dad-11d1-80b4-00c04fd430c9',
        facultyUserId: '8da7b810-9dad-11d1-80b4-00c04fd430ca',
        createdAt: '2026-09-01T10:00:00.000Z',
        updatedAt: '2026-09-01T10:00:00.000Z',
      };
      const result = facultyAssignmentSchema.safeParse(dto);
      expect(result.success).toBe(true);
    });
  });

  describe('listFacultyAssignmentsQuerySchema', () => {
    it('applies defaults correctly', () => {
      const query = listFacultyAssignmentsQuerySchema.parse({});
      expect(query.page).toBe(1);
      expect(query.limit).toBe(20);
      expect(query.sortBy).toBe('createdAt');
      expect(query.sortOrder).toBe('desc');
    });
  });
});
