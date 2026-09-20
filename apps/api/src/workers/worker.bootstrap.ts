import { serializeError } from '@spark/shared/logger';

import { env } from '../config/env.js';
import { closeRedisConnections } from '../infrastructure/redis/redis.connection.js';
import { logger } from '../lib/logger.js';

import { createNotificationWorker, type NotificationWorker } from './notification.worker.js';

import { ResendProvider } from '@/modules/notifications/notification.providers/resend.provider.js';

/**
 * Entry point of the background-worker process. It builds the concrete
 * dependencies, starts the notification worker once, and owns shutdown. All
 * notification logic lives in notification.worker.ts.
 *
 * Shutdown order is fixed: the worker is closed (it drains active jobs over its
 * Redis connection) BEFORE closeRedisConnections(). Each step is attempted even
 * if the other fails, and any failure makes the process exit non-zero.
 */

const log = logger.child({ component: 'worker-bootstrap' });

let notificationWorker: NotificationWorker | undefined;
let shutdownPromise: Promise<void> | undefined;

function createEmailProvider(): ResendProvider {
  const { RESEND_API_KEY: apiKey, RESEND_FROM_EMAIL: fromAddress } = env;
  // Both are optional in env.ts outside production. This process cannot send
  // mail without them, so refuse to start rather than run a worker that fails
  // every job.
  if (apiKey === undefined || fromAddress === undefined) {
    throw new Error('Notification worker requires RESEND_API_KEY and RESEND_FROM_EMAIL');
  }
  return new ResendProvider({ apiKey, fromAddress });
}

async function runShutdown(initialExitCode: number): Promise<void> {
  let exitCode = initialExitCode;

  try {
    // Resolves after in-flight jobs finish. Safe if the worker was never created.
    await notificationWorker?.close();
  } catch (err) {
    exitCode = 1;
    log.error('Failed to close notification worker', { err: serializeError(err) });
  }

  try {
    await closeRedisConnections();
  } catch (err) {
    exitCode = 1;
    log.error('Failed to close Redis connections', { err: serializeError(err) });
  }

  if (exitCode === 0) {
    log.info('Notification worker stopped');
  }
  process.exit(exitCode);
}

/** Idempotent: the first call starts shutdown, later calls share it. Never rejects. */
function shutdown(exitCode: number): Promise<void> {
  shutdownPromise ??= runShutdown(exitCode);
  return shutdownPromise;
}

function handleSignal(signal: NodeJS.Signals): void {
  log.info('Received shutdown signal', { signal });
  void shutdown(0);
}

function start(): void {
  log.info('Notification worker starting');
  const emailProvider = createEmailProvider();
  notificationWorker = createNotificationWorker({ emailProvider, appUrl: env.APP_URL });
  // The Worker is constructed and connecting; Redis readiness is logged by
  // redis.connection.ts, and worker errors by the listener in the worker module.
  log.info('Notification worker started');
}

// Handlers go in first so a signal during startup still cleans up.
process.on('SIGTERM', handleSignal);
process.on('SIGINT', handleSignal);

process.on('uncaughtException', (err) => {
  log.error('Uncaught exception in worker process', { err: serializeError(err) });
  void shutdown(1);
});
process.on('unhandledRejection', (reason) => {
  log.error('Unhandled rejection in worker process', { err: serializeError(reason) });
  void shutdown(1);
});

try {
  start();
} catch (err) {
  log.error('Notification worker failed to start', { err: serializeError(err) });
  void shutdown(1);
}
