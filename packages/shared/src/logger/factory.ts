// src/utils/logger/factory.ts

import winston from 'winston';

import { getContext } from './context.js';
import type { TransportConfig } from './transports.js';
import { buildTransports, buildTestTransports } from './transports.js';
import type { ILogger, LogLevel, LogMeta } from './types.js';

// Custom Log Levels

/**
 * Winston uses npm levels by default (error:0 … silly:6).
 * We replace them with a 7-level scheme that matches industry conventions
 * and aligns with OpenTelemetry severity numbers.
 *
 * Lower number = higher severity (Winston convention).
 */
const LEVELS: Record<LogLevel, number> = {
  fatal: 0,
  error: 1,
  warn: 2,
  info: 3,
  debug: 4,
  trace: 5,
};

const LEVEL_COLORS: Record<LogLevel, string> = {
  fatal: 'red',
  error: 'red',
  warn: 'yellow',
  info: 'cyan',
  debug: 'blue',
  trace: 'grey',
};

winston.addColors(LEVEL_COLORS);

// Winston Adapter

/**
 * Thin adapter that maps our ILogger interface to the underlying
 * winston.Logger instance.
 *
 * We use an adapter (not a subclass) so we can swap the underlying
 * implementation in tests without touching application code.
 */
class WinstonLogger implements ILogger {
  constructor(private readonly winston: winston.Logger) {}

  private mergeContext(meta?: LogMeta): LogMeta {
    return {
      ...getContext(),
      ...meta,
    };
  }

  trace(message: string, meta?: LogMeta): void {
    this.winston.log('trace', message, this.mergeContext(meta));
  }
  debug(message: string, meta?: LogMeta): void {
    this.winston.debug(message, this.mergeContext(meta));
  }
  info(message: string, meta?: LogMeta): void {
    this.winston.info(message, this.mergeContext(meta));
  }
  warn(message: string, meta?: LogMeta): void {
    this.winston.warn(message, this.mergeContext(meta));
  }
  error(message: string, meta?: LogMeta): void {
    this.winston.error(message, this.mergeContext(meta));
  }
  fatal(message: string, meta?: LogMeta): void {
    this.winston.log('fatal', message, this.mergeContext(meta));
  }

  child(defaultMeta: LogMeta): ILogger {
    return new WinstonLogger(
      this.winston.child({
        ...getContext(),
        ...defaultMeta,
      }),
    );
  }
}

// Factory

export interface LoggerFactoryConfig extends TransportConfig {
  service?: string | undefined;
  defaultMeta?: LogMeta | undefined;
}

export function createCoreLogger(cfg: LoggerFactoryConfig): ILogger {
  const isDev = cfg.nodeEnv === 'development';
  const isTest = cfg.nodeEnv === 'test';

  const winstonLogger = winston.createLogger({
    levels: LEVELS,
    level: cfg.logLevel ?? (isDev ? 'debug' : 'info'),
    defaultMeta: {
      service: cfg.service ?? 'api',
      env: cfg.nodeEnv,
      hostname: process.env.HOSTNAME,
      pid: process.pid,
      ...cfg.defaultMeta,
    },
    // Format is applied per-transport so dev console and prod files
    // can use different formats.  We do NOT set a global format here.
    transports: isTest ? buildTestTransports() : buildTransports(cfg),

    // Let the console transport handle these (handleExceptions: true on it)
    // Setting exitOnError: false prevents Winston from swallowing the error
    // and killing the process before our graceful shutdown can run.
    exitOnError: false,
  });

  return new WinstonLogger(winstonLogger);
}
