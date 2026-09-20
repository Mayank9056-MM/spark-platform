import { serializeError } from '@spark/shared/logger';
import { UnrecoverableError, Worker, type Job } from 'bullmq';

import { DEFAULT_WORKER_OPTIONS } from '../infrastructure/queue/queue.config.js';
import { createRedisConnection } from '../infrastructure/redis/redis.connection.js';
import { logger } from '../lib/logger.js';
import {
  type NOTIFICATION_JOB_NAME,
  NOTIFICATION_QUEUE_NAME,
} from '../modules/notifications/notification.constants.js';
import type {
  EmailMessage,
  EmailProvider,
} from '../modules/notifications/notification.providers/email.provider.js';
import { renderAccountActivationEmail } from '../modules/notifications/notification.templates/account-activation/account-activation.template.js';
import { renderPasswordChangedEmail } from '../modules/notifications/notification.templates/password-changed/password-changed.template.js';
import { renderPasswordResetEmail } from '../modules/notifications/notification.templates/password-reset/password-reset.template.js';
import { renderSecurityAlertEmail } from '../modules/notifications/notification.templates/security-alert/security-alert.template.js';
import type { RenderedEmail } from '../modules/notifications/notification.templates/shared/rendered-email.types.js';
import type { NotificationJobData } from '../modules/notifications/notification.types.js';

/**
 * Consumer side of the notification queue. For each job it reads
 * `job.data.type` (never `job.name`), renders the matching template, and hands
 * one EmailMessage to the injected EmailProvider.
 *
 * Retries, backoff and failed-job retention belong to BullMQ: any provider
 * failure is rethrown untouched. The provider already sanitizes its errors.
 *
 * Job data holds raw activation/reset tokens, and the URLs built from them are
 * bearer credentials. Neither is ever logged, stored or put in an error.
 *
 * Delivery is at-least-once: a retry after a provider timeout can send a
 * duplicate. That is accepted by design and not handled here.
 *
 * This file does not start or close anything by itself. The bootstrap layer
 * calls createNotificationWorker() once, and must call `worker.close()` BEFORE
 * closeRedisConnections().
 */

// Routes of the web app's (auth) group. The pages must read TOKEN_QUERY_PARAM.
const ACTIVATION_PATH = '/activate';
const PASSWORD_RESET_PATH = '/password-reset/confirm';
const TOKEN_QUERY_PARAM = 'token';

type NotificationJob = Pick<
  Job<NotificationJobData, void, typeof NOTIFICATION_JOB_NAME>,
  'id' | 'data' | 'attemptsMade'
>;

export type NotificationWorker = Worker<NotificationJobData, void, typeof NOTIFICATION_JOB_NAME>;

export interface NotificationWorkerDeps {
  readonly emailProvider: EmailProvider;
  /** Origin of the web app, e.g. https://spark.example.edu. No path. Comes from validated config. */
  readonly appUrl: string;
}

const log = logger.child({ component: 'notification-worker' });

function parseAppOrigin(appUrl: string): URL {
  const url = new URL(appUrl); // throws on an invalid URL; the message is not secret
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error('NotificationWorker: appUrl must be an http(s) URL');
  }
  if (url.pathname !== '/' || url.search !== '' || url.hash !== '') {
    throw new Error('NotificationWorker: appUrl must be an origin without path, query or hash');
  }
  return url;
}

/** SENSITIVE result: contains a bearer token. Never log or store it. */
function buildTokenUrl(origin: URL, path: string, rawToken: string): string {
  const url = new URL(path, origin);
  url.searchParams.set(TOKEN_QUERY_PARAM, rawToken);
  return url.toString();
}

function toMessage(to: string, rendered: RenderedEmail): EmailMessage {
  return { to, subject: rendered.subject, html: rendered.html, text: rendered.text };
}

function assertUnsupported(_data: never): never {
  // A type Redis handed us that this code does not know. Retrying cannot fix
  // it, so skip the remaining attempts. Nothing from the job goes in the message.
  throw new UnrecoverableError('Unsupported notification type');
}

function buildMessage(data: NotificationJobData, appOrigin: URL): EmailMessage {
  switch (data.type) {
    case 'ACCOUNT_ACTIVATION': {
      const { recipient, rawActivationToken } = data.payload;
      return toMessage(
        recipient.email,
        renderAccountActivationEmail({
          firstName: recipient.firstName,
          activationUrl: buildTokenUrl(appOrigin, ACTIVATION_PATH, rawActivationToken),
        }),
      );
    }
    case 'PASSWORD_RESET': {
      const { recipient, rawResetToken } = data.payload;
      return toMessage(
        recipient.email,
        renderPasswordResetEmail({
          firstName: recipient.firstName,
          resetUrl: buildTokenUrl(appOrigin, PASSWORD_RESET_PATH, rawResetToken),
        }),
      );
    }
    case 'PASSWORD_CHANGED': {
      const { recipient, changedAt } = data.payload;
      return toMessage(
        recipient.email,
        renderPasswordChangedEmail({ firstName: recipient.firstName, changedAt }),
      );
    }
    case 'SECURITY_ALERT': {
      const { recipient, event, occurredAt, ipAddress, userAgent } = data.payload;
      return toMessage(
        recipient.email,
        renderSecurityAlertEmail({
          firstName: recipient.firstName,
          event,
          occurredAt,
          ipAddress,
          userAgent,
        }),
      );
    }
    default:
      return assertUnsupported(data);
  }
}

/**
 * The whole per-job logic. Exported so tests can call it with a plain object
 * and a fake EmailProvider, with no Redis and no Worker.
 */
export async function processNotification(
  job: NotificationJob,
  emailProvider: EmailProvider,
  appOrigin: URL,
): Promise<void> {
  const startedAt = Date.now();
  const message = buildMessage(job.data, appOrigin);
  const { messageId } = await emailProvider.send(message);

  log.info('Notification email accepted by provider', {
    jobId: job.id,
    notificationType: job.data.type,
    attemptsMade: job.attemptsMade,
    messageId,
    durationMs: Date.now() - startedAt,
  });
}

export function createNotificationWorker(deps: NotificationWorkerDeps): NotificationWorker {
  // Validate config before opening a Redis connection.
  const appOrigin = parseAppOrigin(deps.appUrl);

  const worker: NotificationWorker = new Worker<
    NotificationJobData,
    void,
    typeof NOTIFICATION_JOB_NAME
  >(NOTIFICATION_QUEUE_NAME, (job) => processNotification(job, deps.emailProvider, appOrigin), {
    connection: createRedisConnection('queueWorker'),
    ...DEFAULT_WORKER_OPTIONS,
  });

  // Without an 'error' listener, a connection error on the Worker would be
  // thrown by the EventEmitter and could take the process down.
  worker.on('error', (err) => {
    log.error('Notification worker error', { err: serializeError(err) });
  });

  // The only place a failed job is logged; the processor does not log failures.
  // `job` can be undefined here. Never log job.data beyond its `type`.
  worker.on('failed', (job, err) => {
    log.warn('Notification job failed', {
      jobId: job?.id,
      notificationType: job?.data.type,
      attemptsMade: job?.attemptsMade,
      err: serializeError(err),
    });
  });

  return worker;
}
