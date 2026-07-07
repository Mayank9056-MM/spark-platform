import { createCoreLogger } from './factory.js';
import type { ILogger, LogMeta } from './types.ts';

export { runWithContext, getContext } from './context.js';
export { serializeError, normalizeMeta } from './serializers.js';
export type { ILogger, LogMeta, LogLevel } from './types.js';

export interface LoggerInitConfig {
  nodeEnv: string;
  service?: string | undefined;
  stdoutOnly?: boolean | undefined;
  logDir?: string | undefined;
  logLevel?: string | undefined;
}

let coreLogger: ILogger | undefined;

/**
 * Must be called once at app startup (in apps/api/src/index.ts) before any
 * other module imports child loggers from this file.
 */
export function initLogger(cfg: LoggerInitConfig): ILogger {
  coreLogger = createCoreLogger({
    nodeEnv: cfg.nodeEnv,
    service: cfg.service ?? 'spark-api',
    stdoutOnly: cfg.stdoutOnly,
    logDir: cfg.logDir,
    logLevel: cfg.logLevel,
  });
  return coreLogger;
}

export function getLogger(): ILogger {
  if (!coreLogger) {
    throw new Error('Logger not initialized — call initLogger() at app startup first.');
  }
  return coreLogger;
}

export function createChildLogger(defaultMeta: LogMeta): ILogger {
  return getLogger().child(defaultMeta);
}
