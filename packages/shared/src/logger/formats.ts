// src/utils/logger/formats.ts

import colors from 'colors';
import winston from 'winston';

import { normalizeMeta } from './serializers.js';

const { combine, timestamp, errors, json, printf, splat } = winston.format;

// Shared Transforms

/**
 * Strip Winston's internal Symbol(splat) key from info objects.
 * If we don't do this, some transports will include it as a "[object Symbol]"
 * string in the serialized output.
 */
const stripSplat = winston.format((info) => {
  const withSplat = info as Record<PropertyKey, unknown>;
  delete withSplat[Symbol.for('splat')];
  return info;
});

/**
 * Ensure message is always a string.
 * Guards against calling logger.info({ foo: "bar" }) directly.
 */
const ensureStringMessage = winston.format((info) => {
  if (typeof info.message !== 'string') {
    info.message = JSON.stringify(info.message);
  }
  return info;
});

/**
 * Recursively sanitize and normalize the entire info object.
 * Handles Error serialization, sensitive field masking, circular refs.
 */
const sanitize = winston.format((info) => {
  const { level, message, timestamp: ts, service, ...rest } = info;
  const normalized = normalizeMeta(rest);
  return { level, message, timestamp: ts, service, ...normalized };
});

/**
 * Single-line JSON.  Every field is top-level so log aggregators can index
 * them without JSONPath configuration.
 *
 * Output shape:
 * {
 *   "timestamp": "2025-06-01T12:00:00.123Z",
 *   "level": "info",
 *   "service": "api",
 *   "message": "Server started",
 *   "port": 3000,
 *   "env": "production"
 * }
 */
export const productionFormat = combine(
  timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }), // ISO 8601 with ms
  errors({ stack: true }),
  splat(),
  stripSplat(),
  ensureStringMessage(),
  sanitize(),
  json(),
);

/**
 * Human-readable coloured output.
 *
 * Output shape (coloured in terminal):
 *   2025-06-01 12:00:00 [info]  Server started { port: 3000 }
 *
 * We print meta on the same line when it's small, on a new indented block
 * when it's large (e.g. full Error objects).
 */
const devPrintf = printf(({ level, message, timestamp: ts, service, ...meta }) => {
  const coloredLevel = (() => {
    switch (level) {
      case 'fatal':
      case 'error':
        return colors.red(level);

      case 'warn':
        return colors.yellow(level);

      case 'info':
        return colors.cyan(level);

      case 'debug':
        return colors.blue(level);

      case 'trace':
        return colors.gray(level);

      default:
        return level;
    }
  })();

  // Remove internal Winston bookkeeping fields

  const cleanMeta = { ...meta };
  delete (cleanMeta as Record<string, unknown>).splat;

  const svc = typeof service === 'string' && service.length > 0 ? `[${service}] ` : '';
  const hasFields = Object.keys(cleanMeta).length > 0;

  if (!hasFields) {
    return `${ts} ${coloredLevel} ${svc}${message}`;
  }

  // Inline small meta objects, block-indent large ones
  const metaStr = JSON.stringify(cleanMeta, null, 2);
  const isSmall = metaStr.length < 120;
  const metaSuffix = isSmall
    ? `  ${metaStr}`
    : `\n${metaStr
        .split('\n')
        .map((l) => `  ${l}`)
        .join('\n')}`;

  return `${ts} ${coloredLevel} ${svc}${message}${metaSuffix}`;
});

export const developmentFormat = combine(
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  errors({ stack: true }),
  splat(),
  stripSplat(),
  ensureStringMessage(),
  sanitize(),
  // colorize({ level: true }),
  devPrintf,
);
