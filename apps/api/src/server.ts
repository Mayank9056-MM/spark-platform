import { prisma } from '@spark/database';
import { serializeError } from '@spark/shared/logger';

import { createServer } from './app.js';
import { env } from './config/env.js';
import { logger, shutdownLogger } from './lib/logger.js';

const server = createServer();
const httpServer = server.listen(env.PORT, () => {
  logger.info('API server started', { port: env.PORT, env: env.NODE_ENV });
});

let isShuttingDown = false;
let shutdownTimeout: NodeJS.Timeout | undefined;

const SHUTDOWN_TIMEOUT_MS = 30_000;

function gracefulShutdown(signal: string): void {
  if (isShuttingDown) {
    shutdownLogger.warn('Shutdown already in progress, ignoring signal', { signal });
    return;
  }

  isShuttingDown = true;
  shutdownLogger.info('Shutdown signal received', { signal });

  shutdownTimeout = setTimeout(() => {
    shutdownLogger.error('Shutdown timeout exceeded, forcing exit', {
      timeoutMs: SHUTDOWN_TIMEOUT_MS,
    });
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);

  httpServer.close((err?: Error) => {
    void (async () => {
      if (shutdownTimeout) {
        clearTimeout(shutdownTimeout);
        shutdownTimeout = undefined;
      }

      if (err) {
        shutdownLogger.error('Error while closing HTTP server', { err: serializeError(err) });
        process.exit(1);
      } else {
        try {
          shutdownLogger.info('HTTP server closed, disconnecting Prisma');
          await prisma.$disconnect();

          shutdownLogger.info('Shutdown complete');
          process.exit(0);
        } catch (shutdownErr) {
          shutdownLogger.error('Error during shutdown sequence', {
            err: serializeError(shutdownErr),
          });
          process.exit(1);
        }
      }
    })();
  });
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.fatal('Unhandled promise rejection', { reason: serializeError(reason) });
  gracefulShutdown('unhandledRejection');
});

process.on('uncaughtException', (err) => {
  logger.fatal('Uncaught exception', { err: serializeError(err) });
  gracefulShutdown('uncaughtException');
});
