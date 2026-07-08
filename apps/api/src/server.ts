import { createServer } from './app.js';
import { env } from './config/env.js';
import { logger, shutdownLogger } from './lib/logger.js';

const server = createServer();
const httpServer = server.listen(env.PORT, () => {
  logger.info('API server started', { port: env.PORT, env: env.NODE_ENV });
});

function gracefulShutdown(signal: string): void {
  shutdownLogger.info('Shutdown signal received', { signal });
  httpServer.close(() => {
    shutdownLogger.info('Server closed gracefully');
    process.exit(0);
  });
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
