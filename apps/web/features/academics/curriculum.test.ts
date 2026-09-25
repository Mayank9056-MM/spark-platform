import { describe, expect, it } from 'vitest';

import {
  createCurriculumVersionSchema,
  createElectiveGroupSchema,
  createSubjectSchema,
  curriculumStructureSchema,
  curriculumVersionSchema,
  updateCurriculumVersionSchema,
} from './schemas/academic.schema';

describe('Curriculum Domain Schemas & Invariants', () => {
  describe('curriculumVersionSchema', () => {
    it('accepts valid curriculum versions in all allowed lifecycle states', () => {
      const base = {
        id: '11111111-1111-1111-1111-111111111111',
        programId: '22222222-2222-2222-2222-222222222222',
        label: 'R22-CSE',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      };

      expect(curriculumVersionSchema.safeParse({ ...base, status: 'DRAFT' }).success).toBe(true);
      expect(curriculumVersionSchema.safeParse({ ...base, status: 'ACTIVE' }).success).toBe(true);
      expect(curriculumVersionSchema.safeParse({ ...base, status: 'RETIRED' }).success).toBe(true);
    });

    it('rejects unrecognized curriculum status', () => {
      const invalid = {
        id: '11111111-1111-1111-1111-111111111111',
        programId: '22222222-2222-2222-2222-222222222222',
        label: 'R22-CSE',
        status: 'ARCHIVED',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      };

      const result = curriculumVersionSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('createCurriculumVersionSchema', () => {
    it('validates program UUID and non-empty trimmed label', () => {
      const valid = {
        programId: '123e4567-e89b-12d3-a456-426614174000',
        label: '  NEP-2024-ME  ',
      };

      const result = createCurriculumVersionSchema.safeParse(valid);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.label).toBe('NEP-2024-ME');
      }
    });

    it('rejects invalid program UUID or empty label', () => {
      expect(
        createCurriculumVersionSchema.safeParse({
          programId: 'not-a-uuid',
          label: 'R22',
        }).success,
      ).toBe(false);

      expect(
        createCurriculumVersionSchema.safeParse({
          programId: '123e4567-e89b-12d3-a456-426614174000',
          label: '   ',
        }).success,
      ).toBe(false);
    });
  });

  describe('updateCurriculumVersionSchema', () => {
    it('accepts trimmed label', () => {
      const result = updateCurriculumVersionSchema.safeParse({ label: '  CBCS-2025  ' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.label).toBe('CBCS-2025');
      }
    });

    it('rejects empty label', () => {
      expect(updateCurriculumVersionSchema.safeParse({ label: '' }).success).toBe(false);
    });
  });

  describe('curriculumStructureSchema', () => {
    it('parses full curriculum structure with program, department, and semester catalog', () => {
      const structure = {
        id: '11111111-1111-1111-1111-111111111111',
        label: 'R22-CSE',
        status: 'ACTIVE',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        program: {
          id: 'prog-1',
          name: 'Computer Science and Engineering',
          code: 'CSE',
          durationYears: 4,
          totalSemesters: 8,
        },
        department: {
          id: 'dept-1',
          name: 'Computer Engineering',
          code: 'COMP',
        },
        semesters: [
          {
            id: 'sem-1',
            number: 1,
            subjects: [
              {
                id: 'sub-1',
                code: 'CS101',
                name: 'Programming Basics',
                isElective: false,
                electiveGroupId: null,
              },
            ],
            electiveGroups: [],
          },
          {
            id: 'sem-2',
            number: 2,
            subjects: [
              {
                id: 'sub-2',
                code: 'CS201',
                name: 'Data Structures',
                isElective: false,
                electiveGroupId: null,
              },
              {
                id: 'sub-3',
                code: 'CS202',
                name: 'Cloud Foundations',
                isElective: true,
                electiveGroupId: 'eg-1',
              },
            ],
            electiveGroups: [
              {
                id: 'eg-1',
                name: 'Professional Elective I',
                minSelect: 1,
                maxSelect: 1,
              },
            ],
          },
        ],
      };

      const result = curriculumStructureSchema.safeParse(structure);
      expect(result.success).toBe(true);
    });
  });

  describe('Subject and Elective Group Schemas', () => {
    it('validates createSubjectSchema with required fields', () => {
      const valid = {
        semesterCatalogId: '123e4567-e89b-12d3-a456-426614174000',
        code: 'CS301',
        name: 'Database Management Systems',
      };
      expect(createSubjectSchema.safeParse(valid).success).toBe(true);
    });

    it('validates createElectiveGroupSchema with min and max select', () => {
      const valid = {
        semesterCatalogId: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Elective Bucket A',
        minSelect: 1,
        maxSelect: 2,
      };
      expect(createElectiveGroupSchema.safeParse(valid).success).toBe(true);
    });
  });
});
