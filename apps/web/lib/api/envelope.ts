import { z } from 'zod';

import { ApiClientError } from './api-error';

/** Success envelope produced by ApiResponse in apps/api. */
const successEnvelopeSchema = z.object({
  success: z.literal(true),
  data: z.unknown(),
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
