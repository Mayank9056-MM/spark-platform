import { z } from 'zod';

import { ApiClientError } from './api-error';

/** Success envelope produced by ApiResponse in apps/api. */
const successEnvelopeSchema = z.object({
  success: z.literal(true),
  data: z.unknown(),
});

export interface PaginationMeta {
  readonly page: number;
  readonly limit: number;
  readonly total: number;
  readonly totalPages: number;
}

export interface PaginatedResult<T> {
  readonly items: T[];
  readonly pagination: PaginationMeta;
}

const paginatedEnvelopeSchema = z.object({
  success: z.literal(true),
  data: z.array(z.unknown()),
  meta: z
    .object({
      pagination: z.object({
        page: z.number(),
        limit: z.number(),
        total: z.number(),
        totalPages: z.number(),
      }),
    })
    .optional(),
});

/**
 * Unwraps `{ success: true, data }` and validates `data` against the caller's
 * schema. A contract change therefore fails loudly at the boundary as an
 * `invalid-response` error instead of surfacing later as `undefined` in the UI.
 */
export function parseSuccessEnvelope<TSchema extends z.ZodType>(
  payload: unknown,
  schema: TSchema,
  status: number,
): z.output<TSchema> {
  const envelope = successEnvelopeSchema.safeParse(payload);
  const result = envelope.success ? schema.safeParse(envelope.data.data) : undefined;

  if (!result?.success) {
    throw new ApiClientError({
      kind: 'invalid-response',
      status,
      message: 'The server returned an unexpected response',
    });
  }

  return result.data;
}

/**
 * Unwraps `{ success: true, data: T[], meta: { pagination } }` and validates each
 * item in `data` against `itemSchema`. Returns `{ items, pagination }`.
 */
export function parsePaginatedEnvelope<TSchema extends z.ZodType>(
  payload: unknown,
  itemSchema: TSchema,
  status: number,
): PaginatedResult<z.output<TSchema>> {
  const envelope = paginatedEnvelopeSchema.safeParse(payload);
  if (!envelope.success) {
    throw new ApiClientError({
      kind: 'invalid-response',
      status,
      message: 'The server returned an unexpected paginated response format',
    });
  }

  const items: z.output<TSchema>[] = [];
  for (const rawItem of envelope.data.data) {
    const parsedItem = itemSchema.safeParse(rawItem);
    if (!parsedItem.success) {
      throw new ApiClientError({
        kind: 'invalid-response',
        status,
        message: 'A record in the paginated response did not match the expected schema',
      });
    }
    items.push(parsedItem.data);
  }

  const pagination: PaginationMeta = envelope.data.meta?.pagination ?? {
    page: 1,
    limit: items.length || 20,
    total: items.length,
    totalPages: 1,
  };

  return { items, pagination };
}
