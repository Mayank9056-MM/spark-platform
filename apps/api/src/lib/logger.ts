import { initLogger, createChildLogger } from '@spark/shared/logger';

import { env } from '../config/env.js';

export const logger = initLogger({
  nodeEnv: env.NODE_ENV,
  service: 'spark-api',
  stdoutOnly: env.LOG_STDOUT_ONLY,
  logDir: env.LOG_DIR,
  logLevel: env.LOG_LEVEL,
});

export const redisLogger = createChildLogger({ component: 'redis' });
export const dbLogger = createChildLogger({ component: 'prisma' });
export const socketLogger = createChildLogger({ component: 'socket' });
export const emailLogger = createChildLogger({ component: 'email' });
export const httpLogger = createChildLogger({ component: 'http' });
export const shutdownLogger = createChildLogger({ component: 'shutdown' });
export const authLogger = createChildLogger({ component: 'auth' });
export const auditLogger = createChildLogger({ component: 'audit' });
export const userLogger = createChildLogger({ component: 'user' });
