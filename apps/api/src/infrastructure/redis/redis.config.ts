import type { RedisOptions } from 'ioredis';

import { env } from '../../config/env.js';

/**
 * What a connection is used for. Each role has different failure semantics,
 * so options differ per role while sharing one URL and one set of base options.
 *  - app:           cache, rate limiting, locks — bounded waiting, never hangs a request
 *  - queueProducer: BullMQ Queue used from API requests — fail fast
 *  - queueWorker:   BullMQ Worker / QueueEvents — blocking commands, retry forever
 */
export type RedisConnectionRole = 'app' | 'queueProducer' | 'queueWorker';

/** Non-secret description of the Redis target, safe to log. */
export interface RedisTarget {
  readonly host: string;
  readonly port: number;
  readonly tls: boolean;
}

const DEFAULT_REDIS_PORT = 6379;
const CONNECT_TIMEOUT_MS = 10_000;
const COMMAND_TIMEOUT_MS = 5_000;
const RECONNECT_BASE_DELAY_MS = 200;
const RECONNECT_MAX_DELAY_MS = 10_000;

function parseRedisTarget(url: string): RedisTarget {
  // env.ts already validated this as a redis:// or rediss:// URL.
  // hostname/port exclude credentials, so this is safe to expose.
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: parsed.port === '' ? DEFAULT_REDIS_PORT : Number.parseInt(parsed.port, 10),
    tls: parsed.protocol === 'rediss:',
  };
}

/** Exponential backoff (200ms → 10s cap) with 20% jitter. Never gives up. */
function reconnectDelayMs(attempt: number): number {
  const backoff = Math.min(RECONNECT_BASE_DELAY_MS * 2 ** attempt, RECONNECT_MAX_DELAY_MS);
  return backoff + Math.floor(Math.random() * backoff * 0.2);
}

// Host, port, credentials, db and TLS are deliberately NOT set here: they come
// from the URL, and ioredis derives TLS from rediss://. Options passed after
// the URL would override it, so setting them here could silently conflict.
//
// These objects use `satisfies` instead of a `: RedisOptions` annotation on
// purpose. With exactOptionalPropertyTypes, a value typed as the full
// RedisOptions is not assignable to the Redis constructor's parameter.
// `satisfies` still checks every key and value against RedisOptions but keeps
// the narrow inferred type, which the constructor accepts.
const baseOptions = {
  connectTimeout: CONNECT_TIMEOUT_MS,
  retryStrategy: reconnectDelayMs,
} satisfies RedisOptions;

const options = {
  app: {
    ...baseOptions,
    connectionName: 'spark:app',
    maxRetriesPerRequest: 2,
    commandTimeout: COMMAND_TIMEOUT_MS,
  },
  queueProducer: {
    ...baseOptions,
    connectionName: 'spark:queue-producer',
    maxRetriesPerRequest: 2,
    commandTimeout: COMMAND_TIMEOUT_MS,
    // Reject enqueue calls immediately while disconnected instead of buffering
    // them in memory behind an HTTP request. Callers must handle the rejection.
    enableOfflineQueue: false,
  },
  queueWorker: {
    ...baseOptions,
    connectionName: 'spark:queue-worker',
    // Required by BullMQ for blocking connections: a worker must retry forever.
    maxRetriesPerRequest: null,
    // No commandTimeout: BullMQ uses long-blocking commands that a timeout
    // would kill. Offline queue stays on so commands survive a reconnect.
  },
} satisfies Record<RedisConnectionRole, RedisOptions>;

/**
 * `url` may contain credentials — pass it only to the client constructor
 * (redis.connection.ts). Log `target`, never `url`.
 */
export const redisConfig = {
  url: env.REDIS_URL,
  target: parseRedisTarget(env.REDIS_URL),
  options,
} as const;
