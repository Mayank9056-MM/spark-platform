import { describe, expect, it } from 'vitest';

import {
  createPromotionBatchSchema,
  createPromotionDecisionSchema,
  listPromotionBatchesQuerySchema,
  promotionBatchSchema,
  promotionDecisionSchema,
} from './promotion.schema';

describe('Promotion Schemas', () => {
  describe('createPromotionBatchSchema', () => {
    it('validates valid batch creation input', () => {
      const valid = {
        semesterCatalogId: '550e8400-e29b-41d4-a716-446655440000',
        academicYearId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      };
      const result = createPromotionBatchSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('rejects invalid UUIDs', () => {
      const invalid = {
        semesterCatalogId: 'not-a-uuid',
        academicYearId: 'also-not-a-uuid',
      };
      const result = createPromotionBatchSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('promotionBatchSchema', () => {
    it('validates a valid draft batch DTO', () => {
      const batch = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        semesterCatalogId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
        academicYearId: '7ca7b810-9dad-11d1-80b4-00c04fd430c9',
        initiatedByUserId: 'user-123',
        status: 'DRAFT',
        finalizedAt: null,
        createdAt: '2026-09-01T00:00:00.000Z',
        updatedAt: '2026-09-01T00:00:00.000Z',
      };
      const result = promotionBatchSchema.safeParse(batch);
      expect(result.success).toBe(true);
    });

    it('validates a finalized batch DTO', () => {
      const batch = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        semesterCatalogId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
        academicYearId: '7ca7b810-9dad-11d1-80b4-00c04fd430c9',
        initiatedByUserId: 'user-123',
        status: 'FINALIZED',
        finalizedAt: '2026-09-02T00:00:00.000Z',
        createdAt: '2026-09-01T00:00:00.000Z',
        updatedAt: '2026-09-02T00:00:00.000Z',
      };
      const result = promotionBatchSchema.safeParse(batch);
      expect(result.success).toBe(true);
    });
  });

  describe('createPromotionDecisionSchema', () => {
    it('validates valid promotion decision input', () => {
      const valid = {
        studentEnrollmentId: '550e8400-e29b-41d4-a716-446655440000',
        fromSemesterEnrollmentId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
        outcome: 'PROMOTE',
        remarks: 'Cleared all courses with first class',
      };
      const result = createPromotionDecisionSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('rejects invalid outcome value', () => {
      const invalid = {
        studentEnrollmentId: '550e8400-e29b-41d4-a716-446655440000',
        fromSemesterEnrollmentId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
        outcome: 'INVALID_OUTCOME',
      };
      const result = createPromotionDecisionSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('promotionDecisionSchema', () => {
    it('validates valid decision DTO with nullable target semester', () => {
      const decision = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        promotionBatchId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
        studentEnrollmentId: '7ca7b810-9dad-11d1-80b4-00c04fd430c9',
        fromSemesterEnrollmentId: '8da7b810-9dad-11d1-80b4-00c04fd430ca',
        toSemesterEnrollmentId: null,
        outcome: 'WITHDRAW',
        remarks: null,
        decidedByUserId: 'user-admin',
        decidedAt: '2026-09-02T00:00:00.000Z',
        createdAt: '2026-09-02T00:00:00.000Z',
      };
      const result = promotionDecisionSchema.safeParse(decision);
      expect(result.success).toBe(true);
    });
  });

  describe('listPromotionBatchesQuerySchema', () => {
    it('applies defaults for pagination and sorting', () => {
      const parsed = listPromotionBatchesQuerySchema.parse({});
      expect(parsed.page).toBe(1);
      expect(parsed.limit).toBe(20);
      expect(parsed.sortBy).toBe('createdAt');
      expect(parsed.sortOrder).toBe('desc');
    });
  });
});
