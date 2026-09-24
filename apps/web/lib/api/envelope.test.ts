import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { parsePaginatedEnvelope, parseSuccessEnvelope } from './envelope';

describe('envelope parsing', () => {
  const itemSchema = z.object({
    id: z.string(),
    name: z.string(),
  });

  it('unwraps and validates standard success envelopes', () => {
    const payload = {
      success: true,
      data: { id: 'test-1', name: 'HVPM' },
    };

    const result = parseSuccessEnvelope(payload, itemSchema, 200);
    expect(result).toEqual({ id: 'test-1', name: 'HVPM' });
  });

  it('unwraps and validates paginated envelopes with metadata', () => {
    const payload = {
      success: true,
      data: [
        { id: '1', name: 'First' },
        { id: '2', name: 'Second' },
      ],
      meta: {
        pagination: {
          page: 1,
          limit: 20,
          total: 2,
          totalPages: 1,
        },
      },
    };

    const result = parsePaginatedEnvelope(payload, itemSchema, 200);
    expect(result.items).toHaveLength(2);
    expect(result.pagination.total).toBe(2);
    expect(result.items[0]).toEqual({ id: '1', name: 'First' });
  });

  it('handles paginated envelopes without meta object (fallback defaults)', () => {
    const payload = {
      success: true,
      data: [{ id: '1', name: 'First' }],
    };

    const result = parsePaginatedEnvelope(payload, itemSchema, 200);
    expect(result.items).toHaveLength(1);
    expect(result.pagination.total).toBe(1);
    expect(result.pagination.limit).toBe(1);
  });

  it('handles empty data array without meta object', () => {
    const payload = {
      success: true,
      data: [],
    };

    const result = parsePaginatedEnvelope(payload, itemSchema, 200);
    expect(result.items).toHaveLength(0);
    expect(result.pagination.limit).toBe(20);
  });

  it('throws ApiClientError when envelope is invalid', () => {
    const payload = {
      success: false,
      error: { message: 'Failed' },
    };

    expect(() => parseSuccessEnvelope(payload, itemSchema, 400)).toThrow();
  });

  it('throws ApiClientError when paginated envelope root is invalid', () => {
    const payload = {
      success: false,
    };

    expect(() => parsePaginatedEnvelope(payload, itemSchema, 400)).toThrow();
  });

  it('throws ApiClientError when an item in paginated data violates schema', () => {
    const payload = {
      success: true,
      data: [{ id: '1', invalidField: true }],
    };

    expect(() => parsePaginatedEnvelope(payload, itemSchema, 200)).toThrow();
  });
});
