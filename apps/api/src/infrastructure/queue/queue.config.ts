import type { JobsOptions, QueueOptions, WorkerOptions } from 'bullmq';

/**
 * Generic BullMQ defaults shared by every queue and worker.
 *
 * Not here on purpose: Redis connections (redis.connection.ts), queue names and
 * job payload types (each module owns its own), Queue/Worker instances, logging,
 * and shutdown. A module combines these defaults with a connection:
 *
 *   new Queue(NAME, {
 *     connection: createRedisConnection('queueProducer'),
 *     ...DEFAULT_QUEUE_OPTIONS,
 *   });
 *   new Worker(NAME, processor, {
 *     connection: createRedisConnection('queueWorker'),
 *     ...DEFAULT_WORKER_OPTIONS,
 *   });
 *
 * The option types below omit `connection`, so this file cannot grow its own
 * Redis settings. They use `satisfies` rather than a type annotation so the
 * inferred narrow types are kept (see the exactOptionalPropertyTypes note in
 * redis.config.ts) while every key and value is still checked against BullMQ.
 */

/**
 * Redis key namespace for every BullMQ key (`spark:queue:<queueName>:...`).
 * Queue, Worker, QueueEvents and FlowProducer for the same queue MUST share it,
 * or they will silently talk to different keys. Do not use an ioredis
 * `keyPrefix` for this: BullMQ rejects connections that set one.
 */
export const QUEUE_PREFIX = 'spark:queue';

// Retries. 5 attempts = 1 initial run + 4 retries. Finite on purpose: permanent
// failures (bad payload, deleted user) must end up as failed jobs, not loop.
const JOB_ATTEMPTS = 5;

// Exponential: the delay doubles each retry (5s, 10s, 20s, 40s before jitter),
// so a struggling dependency gets breathing room. Jitter spreads retries so
// jobs that failed together do not all retry in the same instant.
const BACKOFF_BASE_DELAY_MS = 5_000;
const BACKOFF_JITTER = 0.5;

// Retention. BullMQ `age` is in SECONDS (unlike `delay`, which is milliseconds).
// Redis is a work queue, not an audit store; business history belongs in the
// audit module.
const COMPLETED_JOBS_MAX_COUNT = 100;
const COMPLETED_JOBS_MAX_AGE_SECONDS = 24 * 60 * 60; // 1 day
const FAILED_JOBS_MAX_COUNT = 1_000;
const FAILED_JOBS_MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // 7 days

// I/O-bound default. CPU-heavy queues should override this down to 1.
const WORKER_CONCURRENCY = 5;

/**
 * Per-job defaults. Exported separately because overrides are SHALLOW: passing
 * `defaultJobOptions: { attempts: 3 }` replaces this whole object and drops the
 * backoff and retention. Override with a spread instead:
 *   defaultJobOptions: { ...DEFAULT_JOB_OPTIONS, attempts: 3 }
 */
export const DEFAULT_JOB_OPTIONS = {
  attempts: JOB_ATTEMPTS,
  backoff: {
    type: 'exponential',
    delay: BACKOFF_BASE_DELAY_MS,
    jitter: BACKOFF_JITTER,
  },
  removeOnComplete: {
    count: COMPLETED_JOBS_MAX_COUNT,
    age: COMPLETED_JOBS_MAX_AGE_SECONDS,
  },
  removeOnFail: {
    count: FAILED_JOBS_MAX_COUNT,
    age: FAILED_JOBS_MAX_AGE_SECONDS,
  },
} satisfies JobsOptions;

/** Spread into `new Queue(name, { connection, ...DEFAULT_QUEUE_OPTIONS })`. */
export const DEFAULT_QUEUE_OPTIONS = {
  prefix: QUEUE_PREFIX,
  defaultJobOptions: DEFAULT_JOB_OPTIONS,
} satisfies Omit<QueueOptions, 'connection'>;

/**
 * Spread into `new Worker(name, processor, { connection, ...DEFAULT_WORKER_OPTIONS })`.
 * autorun is left at BullMQ's default (true): a Worker starts when constructed,
 * so worker.bootstrap.ts should construct workers only after verifying Redis.
 */
export const DEFAULT_WORKER_OPTIONS = {
  prefix: QUEUE_PREFIX,
  concurrency: WORKER_CONCURRENCY,
} satisfies Omit<WorkerOptions, 'connection'>;
