import { logger } from '../../lib/logger.js';

import { NOTIFICATION_JOB_NAME } from './notification.constants.js';
import { notificationQueue } from './notification.queue.js';
import type { NotificationJobData } from './notification.types.js';

/**
 * Application-facing entry point for sending notifications. It only enqueues:
 * rendering and delivery happen later, in the notification worker.
 *
 * Every job is named NOTIFICATION_JOB_NAME. The kind of notification lives only
 * in `data.type`, and the worker switches on that, never on the job name.
 *
 * The job data can contain raw activation or reset tokens. It is never logged,
 * and enqueue failures are rethrown WITHOUT the original error: a Redis
 * ReplyError can carry the command arguments, which include the job JSON.
 */
const log = logger.child({ component: 'notification-service' });

/** The one queue capability this service needs. Lets tests pass a plain fake. */
interface NotificationJobSink {
  add(name: typeof NOTIFICATION_JOB_NAME, data: NotificationJobData): Promise<unknown>;
}

export class NotificationService {
  private readonly queue: NotificationJobSink;

  constructor(queue: NotificationJobSink = notificationQueue) {
    this.queue = queue;
  }

  /**
   * Strict. Resolves once the job is stored in the queue. That is not delivery:
   * the email goes out later, at least once, and a retry after a partial
   * success can send a duplicate. Rejects with a generic error if the job could
   * not be stored, so the caller decides what that means for its operation.
   */
  async enqueue(data: NotificationJobData): Promise<void> {
    try {
      await this.queue.add(NOTIFICATION_JOB_NAME, data);
    } catch (err) {
      log.error('Failed to enqueue notification', {
        notificationType: data.type,
        userId: data.payload.recipient.userId,
        errorName: err instanceof Error ? err.name : 'UnknownError',
      });
      throw new Error('Failed to enqueue notification');
    }
  }

  /**
   * Never rejects. For events whose primary operation must not fail or change
   * its response because the email queue is unavailable (password reset
   * request, which must stay indistinguishable for unknown accounts; events
   * raised after a state change has already committed). The failure is logged
   * by enqueue() at error level, so it stays visible in monitoring.
   */
  async enqueueBestEffort(data: NotificationJobData): Promise<void> {
    try {
      await this.enqueue(data);
    } catch {
      // Already logged with safe fields in enqueue(). Deliberately not rethrown.
    }
  }
}

export const notificationService = new NotificationService();
