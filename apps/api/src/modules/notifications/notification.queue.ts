import { serializeError } from '@spark/shared/logger';
import { Queue } from 'bullmq';

import { DEFAULT_QUEUE_OPTIONS } from '../../infrastructure/queue/queue.config.js';
import { createRedisConnection } from '../../infrastructure/redis/redis.connection.js';
import { logger } from '../../lib/logger.js';

import { NOTIFICATION_QUEUE_NAME, type NOTIFICATION_JOB_NAME } from './notification.constants.js';
import type { NotificationJobData } from './notification.types.js';

/**
 * The notification domain's BullMQ Queue (producer side).
 *
 * - Connection: the 'queueProducer' Redis role, which fails fast while Redis is
 *   down. Lifecycle and reconnects belong to redis.connection.ts.
 * - Defaults (prefix, attempts, backoff, retention) come from queue.config.ts.
 * - Data is typed as NotificationJobData, so `type` selects the exact payload.
 *   The job name is the notification type (`add(data.type, data)`). Workers must
 *   switch on `job.data.type`, never on `job.name`.
 * - No Worker here (notification.worker.ts). Only the API process should import
 *   this module: importing it opens the producer connection.
 * - Shutdown: `notificationQueue.close()` must run BEFORE closeRedisConnections().
 *
 * Job data can contain raw activation/reset tokens: never log it.
 */
export const notificationQueue = new Queue<NotificationJobData, void, typeof NOTIFICATION_JOB_NAME>(
  NOTIFICATION_QUEUE_NAME,
  {
    connection: createRedisConnection('queueProducer'),
    ...DEFAULT_QUEUE_OPTIONS,
  },
);
// BullMQ re-emits connection and internal errors on the Queue. An EventEmitter
// with no 'error' listener throws, and that would reach the process-level
// uncaughtException handler in server.ts and shut the API down on a transient
// Redis blip. Only the error is logged, never job data.
const queueLogger = logger.child({ component: 'notification-queue' });

notificationQueue.on('error', (err) => {
  queueLogger.warn('Notification queue error', { err: serializeError(err) });
});
