import { z } from 'zod';

const envSchema = z.object({
  // Trailing slashes are stripped so callers can safely append "/api/v1/...".
  NEXT_PUBLIC_API_URL: z.url().transform((value) => value.replace(/\/+$/, '')),
});

/**
 * Public (browser-exposed) environment.
 *
 * Next.js only inlines `process.env.NEXT_PUBLIC_*` when the property is
 * referenced literally, so each variable is read explicitly below instead of
 * passing `process.env` wholesale. Misconfiguration fails fast at import time
 * with a readable message rather than surfacing later as a broken request.
 */
const parsed = envSchema.safeParse({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
});

if (!parsed.success) {
  throw new Error(`Invalid public environment configuration:\n${z.prettifyError(parsed.error)}`);
}

export const env = parsed.data;
