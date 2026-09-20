/**
 * Runtime constants owned by the notification domain.
 *
 * Generic BullMQ configuration belongs in infrastructure/queue/queue.config.ts.
 * Notification payload and job contracts belong in notification.types.ts.
 */

/**
 * Logical name of the notification queue. Every Queue, Worker and QueueEvents
 * for notifications must use this exact value.
 *
 * Deliberately just the bare name: the Redis key namespace comes from
 * QUEUE_PREFIX in queue.config.ts, so BullMQ builds `spark:queue:notifications:...`
 * itself. Do not add the prefix, an environment name or a version here.
 * Renaming this value orphans any jobs already stored under the old name.
 */
export const NOTIFICATION_QUEUE_NAME = 'notifications';

/**
 * Name given to every job on the notification queue. The kind of notification
 * is NOT encoded here: it lives only in `job.data.type`, and workers must
 * switch on that, never on the job name.
 */
export const NOTIFICATION_JOB_NAME = 'notification';
