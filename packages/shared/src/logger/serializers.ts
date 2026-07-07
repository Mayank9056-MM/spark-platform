// Sensitive Field Masking
/**
 * Fields whose values must never appear in logs at any log level.
 * Log aggregators have long retention and are often shared across teams —
 * treat this list as a security boundary, not a hint.
 */
const SENSITIVE_KEYS = new Set([
  'password',
  'passwordHash',
  'hashedPassword',
  'token',
  'accessToken',
  'refreshToken',
  'idToken',
  'secret',
  'clientSecret',
  'apiKey',
  'apiSecret',
  'authorization',
  'cookie',
  'cookies',
  'creditCard',
  'cardNumber',
  'cvv',
  'ssn',
  'aadhaar', // SPARK-specific: student/faculty govt ID, never log
  'otp',
  'pin',
  'resetToken',
  'verifyToken',
  'confirmToken',
  'privateKey',
  'publicKey',
  'smtp_pass',
  'SMTP_PASS',
  'smtp_password',
  'DATABASE_URL',
  'REDIS_URL',
]);

const emailPattern = () => /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

function maskEmail(value: string): string {
  return value.replace(emailPattern(), (match) => {
    const atIdx = match.indexOf('@');
    const local = match.slice(0, atIdx);
    const domain = match.slice(atIdx + 1);
    return `${local.slice(0, 2)}***@${domain}`;
  });
}

function maskValue(key: string, value: unknown): unknown {
  if (SENSITIVE_KEYS.has(key)) return '[REDACTED]';
  if (typeof value === 'string' && emailPattern().test(value)) {
    return maskEmail(value);
  }
  return value;
}

// Circular-Safe Deep Cloner
function safeClone(value: unknown, seen = new WeakSet(), depth = 0): unknown {
  if (depth > 10) return '[MaxDepthExceeded]';

  if (value === null || value === undefined) return value;
  if (typeof value === 'bigint') return `${value.toString()}n`;
  if (typeof value === 'function') return `[Function: ${value.name || 'anonymous'}]`;
  if (typeof value === 'symbol') return value.toString();

  if (value instanceof Error) {
    return serializeError(value, seen, depth);
  }

  if (typeof value !== 'object') return value;

  if (seen.has(value)) return '[Circular]';
  seen.add(value);

  if (Array.isArray(value)) {
    return value.map((item) => safeClone(item, seen, depth + 1));
  }

  const result: Record<string, unknown> = {};
  for (const key of Object.keys(value)) {
    const raw = (value as Record<string, unknown>)[key];
    const masked = maskValue(key, raw);
    result[key] = safeClone(masked, seen, depth + 1);
  }
  return result;
}

// Error Serializer
/**
 * Converts an Error (or anything thrown) into a plain loggable object.
 * Error.message/stack/custom props are non-enumerable — JSON.stringify(err)
 * produces "{}" without this explicit extraction.
 */
export function serializeError(
  err: unknown,
  seen = new WeakSet(),
  depth = 0,
): Record<string, unknown> {
  if (!(err instanceof Error)) {
    return { type: typeof err, value: safeClone(err, seen, depth) };
  }

  const serialized: Record<string, unknown> = {
    type: err.constructor?.name ?? 'Error',
    message: err.message,
    stack: err.stack,
  };

  // Node.js system errors (ENOENT, ECONNREFUSED ...)
  const nodeErr = err as NodeJS.ErrnoException;
  if (nodeErr.code !== undefined) serialized.code = nodeErr.code;
  if (nodeErr.errno !== undefined) serialized.errno = nodeErr.errno;
  if (nodeErr.syscall !== undefined) serialized.syscall = nodeErr.syscall;
  if (nodeErr.path !== undefined) serialized.path = nodeErr.path;

  // Prisma errors — duck-typed by constructor name to avoid packages/shared
  // depending on @prisma/client directly. Covers the error classes you'll
  // actually hit: known request errors (unique constraint, FK violation),
  // validation errors, and initialization errors.
  const prismaErr = err as Error & {
    code?: string;
    meta?: unknown;
    clientVersion?: string;
  };
  const errName = err.constructor?.name ?? '';
  if (errName.startsWith('Prisma')) {
    serialized.prismaErrorType = errName;
    if (prismaErr.code !== undefined) serialized.code = prismaErr.code;
    if (prismaErr.clientVersion !== undefined) {
      serialized.clientVersion = prismaErr.clientVersion;
    }
    if (prismaErr.meta !== undefined) {
      // meta often contains the offending field/table name — safe to log,
      // but still run through safeClone in case it nests unexpected values.
      serialized.meta = safeClone(prismaErr.meta, seen, depth + 1);
    }
  }

  // Axios / fetch errors
  const httpErr = err as Error & {
    response?: { status?: number; data?: unknown };
    config?: { url?: string; method?: string };
  };
  if (httpErr.response !== undefined) {
    serialized.response = { status: httpErr.response.status };
  }
  if (httpErr.config !== undefined) {
    serialized.request = {
      url: httpErr.config.url,
      method: httpErr.config.method,
    };
  }

  for (const key of Object.keys(err)) {
    if (!(key in serialized)) {
      const masked = maskValue(key, (err as unknown as Record<string, unknown>)[key]);
      serialized[key] = safeClone(masked, seen, depth + 1);
    }
  }

  return serialized;
}

// Meta Normalizer
export function normalizeMeta(meta: Record<string, unknown>): Record<string, unknown> {
  const seen = new WeakSet();
  const result: Record<string, unknown> = {};

  for (const key of Object.keys(meta)) {
    if (meta[key] === undefined) continue;

    if ((key === 'err' || key === 'reason' || key === 'error') && meta[key] instanceof Error) {
      result[key] = serializeError(meta[key], seen);
      continue;
    }

    if (key === 'timeout_ms' && !('timeoutMs' in meta)) {
      result.timeoutMs = meta[key];
      continue;
    }

    result[key] = safeClone(maskValue(key, meta[key]), seen);
  }

  return result;
}
