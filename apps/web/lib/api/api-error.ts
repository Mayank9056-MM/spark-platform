import { z } from 'zod';

/**
 * Machine-readable codes the API attaches to errors, limited to the ones the
 * web app currently reacts to. Values mirror `ErrorCode` in
 * apps/api/src/common/errors/ErrorCodes.ts — the frontend switches on `code`,
 * humans read `message`.
 */
export const API_ERROR_CODE = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
  ACCOUNT_PENDING_ACTIVATION: 'ACCOUNT_PENDING_ACTIVATION',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
} as const;

/**
 * - `http`: the API answered with a non-2xx status.
 * - `network`: no response was received (offline, DNS, CORS failure, ...).
 * - `timeout`: the request exceeded its time budget.
 * - `invalid-response`: the API answered 2xx but the body broke the contract.
 */
export type ApiErrorKind = 'http' | 'network' | 'timeout' | 'invalid-response';

interface ApiClientErrorInit {
  kind: ApiErrorKind;
  message: string;
  status?: number;
  code?: string | undefined;
  requestId?: string | undefined;
  cause?: unknown;
}

/**
 * The single error type every API failure is normalised into, so callers never
 * have to distinguish axios errors, non-2xx bodies and malformed payloads.
 */
export class ApiClientError extends Error {
  readonly kind: ApiErrorKind;
  /** HTTP status, or 0 when no response was received. */
  readonly status: number;
  readonly code: string | undefined;
  readonly requestId: string | undefined;

  constructor({ kind, message, status = 0, code, requestId, cause }: ApiClientErrorInit) {
    super(message, { cause });
    this.name = 'ApiClientError';
    this.kind = kind;
    this.status = status;
    this.code = code;
    this.requestId = requestId;
  }
}

/**
 * The API has two failure body shapes today:
 *
 *   1. Everything raised through ApiError, rendered by errorResponderMiddleware:
 *        { success: false, error: { message, code, requestId } }
 *   2. Rate-limiter rejections (express-rate-limit), which answer before the
 *      error pipeline is reached:
 *        { success: false, message }
 *
 * Both are accepted so a 429 is reported as faithfully as any other error.
 * Anything else (an HTML 502 page from a proxy, an empty body) falls back to a
 * status-based message instead of throwing while handling a failure.
 */
const errorBodySchema = z.object({
  message: z.string().optional(),
  error: z
    .object({
      message: z.string().optional(),
      code: z.string().optional(),
      requestId: z.string().optional(),
    })
    .optional(),
});

export function apiErrorFromResponse(
  status: number,
  body: unknown,
  cause?: unknown,
): ApiClientError {
  const parsed = errorBodySchema.safeParse(body);
  const details = parsed.success ? parsed.data : undefined;

  return new ApiClientError({
    kind: 'http',
    status,
    message: details?.error?.message ?? details?.message ?? `Request failed with status ${status}`,
    code: details?.error?.code,
    requestId: details?.error?.requestId,
    cause,
  });
}
