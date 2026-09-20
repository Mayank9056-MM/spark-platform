import { serializeError } from '@spark/shared/logger';
import { Redis } from 'ioredis';

import { redisLogger } from '../../lib/logger.js';

import { redisConfig, type RedisConnectionRole } from './redis.config.js';

/** Re-exported so consumers type against this module, not ioredis directly. */
export type RedisClient = Redis;

const CLOSE_TIMEOUT_MS = 3_000;
const ERROR_LOG_INTERVAL_MS = 30_000;

const connections = new Set<Redis>();
let appConnection: Redis | undefined;
let isClosing = false;

function attachLifecycleLogging(client: Redis, role: RedisConnectionRole): void {
  const log = redisLogger.child({ role, ...redisConfig.target });

  // Per-connection state so an outage produces a handful of lines, not one per retry.
  let degraded = false;
  let lastErrorLoggedAt = 0;
  let suppressedErrors = 0;

  client.on('connect', () => {
    log.debug('Redis socket connected');
  });

  client.on('ready', () => {
    log.info(degraded ? 'Redis connection recovered' : 'Redis ready');
    degraded = false;
    lastErrorLoggedAt = 0;
    suppressedErrors = 0;
  });

  client.on('error', (err: Error) => {
    const now = Date.now();
    if (now - lastErrorLoggedAt >= ERROR_LOG_INTERVAL_MS) {
      log.error('Redis connection error', { err: serializeError(err), suppressedErrors });
      lastErrorLoggedAt = now;
      suppressedErrors = 0;
    } else {
      suppressedErrors += 1;
    }
  });

  client.on('close', () => {
    if (isClosing || degraded) return;
    degraded = true;
    log.warn('Redis connection closed, reconnecting with backoff');
  });

  client.on('reconnecting', (delayMs: number) => {
    log.debug('Redis reconnecting', { delayMs });
  });

  client.on('end', () => {
    log.info('Redis connection ended');
  });
}

/**
 * Creates a NEW Redis connection for the given role. Nothing is created at
 * import time; the connection starts when this is called. Every connection is
 * tracked so closeRedisConnections() can close all of them at shutdown.
 *
 * Intended callers: getRedisClient() below, and queue.connection.ts later
 * (queueProducer for API, queueWorker for the worker process). Business
 * modules should not call this.
 */
export function createRedisConnection(role: RedisConnectionRole): Redis {
  if (isClosing) {
    throw new Error(`Cannot create Redis connection "${role}": shutdown in progress`);
  }

  const client = new Redis(redisConfig.url, redisConfig.options[role]);
  connections.add(client);
  attachLifecycleLogging(client, role);

  client.once('end', () => {
    connections.delete(client);
    if (client === appConnection) appConnection = undefined;
  });

  return client;
}

/**
 * Shared application-level client (cache, rate limiting, locks).
 * Created lazily on first use, then reused. Do NOT hand this to BullMQ — use
 * createRedisConnection('queueProducer' | 'queueWorker').
 */
export function getRedisClient(): Redis {
  appConnection ??= createRedisConnection('app');
  return appConnection;
}

/**
 * True when the app connection is connected and ready. Intended for a future
 * /health/ready. Calling it creates the app connection if it doesn't exist yet.
 */
export function isRedisReady(): boolean {
  return !isClosing && getRedisClient().status === 'ready';
}

async function closeClient(client: Redis): Promise<void> {
  if (client.status === 'end') return;

  // QUIT needs a live connection; if we're mid-reconnect, just stop.
  if (client.status !== 'ready') {
    client.disconnect();
    return;
  }

  let timer: NodeJS.Timeout | undefined;
  const timedOut = new Promise<'timeout'>((resolve) => {
    timer = setTimeout(() => resolve('timeout'), CLOSE_TIMEOUT_MS);
  });

  try {
    if ((await Promise.race([client.quit(), timedOut])) === 'timeout') {
      redisLogger.warn('Redis QUIT timed out, forcing disconnect', {
        timeoutMs: CLOSE_TIMEOUT_MS,
      });
      client.disconnect();
    }
  } catch (err) {
    redisLogger.warn('Redis QUIT failed, forcing disconnect', { err: serializeError(err) });
    client.disconnect();
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Gracefully closes every connection created through this module. Never
 * rejects. Call once from the central shutdown handler (server.ts / worker
 * bootstrap). After this, new connections can no longer be created.
 */
export async function closeRedisConnections(): Promise<void> {
  isClosing = true;
  await Promise.allSettled([...connections].map((client) => closeClient(client)));
}
