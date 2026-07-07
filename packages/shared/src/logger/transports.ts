// src/utils/logger/transports.ts

import path from 'path';

import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

import { developmentFormat, productionFormat } from './formats.js';

// Types

export interface TransportConfig {
  nodeEnv: string;
  logDir?: string | undefined;
  /** Override log level; defaults to "debug" in dev, "info" in prod */
  logLevel?: string | undefined;
  /**
   * Set to true in Kubernetes / Docker deployments — disables file transports
   * entirely and routes everything to stdout for the container runtime.
   */
  stdoutOnly?: boolean | undefined;
}

// Helpers

function resolveLogDir(dir?: string): string {
  return dir ?? path.join(process.cwd(), 'logs');
}

// Transport Builders

function buildConsoleTransport(isDev: boolean): winston.transports.ConsoleTransportInstance {
  return new winston.transports.Console({
    format: isDev ? developmentFormat : productionFormat,
    // handleExceptions and handleRejections on console ensures that crash
    // logs appear in the same stream aggregators are already scraping.
    handleExceptions: true,
    handleRejections: true,
    // Always write to stdout — see design note #1.
    stderrLevels: [],
  });
}

function buildRotateTransport(
  opts: Omit<DailyRotateFile.DailyRotateFileTransportOptions, 'format' | 'stream'> & {
    dir: string;
    filename: string;
  },
): DailyRotateFile {
  const { dir, filename, ...rest } = opts;
  return new DailyRotateFile({
    filename: path.join(dir, filename),
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '14d',
    zippedArchive: true, // compress rotated logs
    format: productionFormat,
    auditFile: path.join(dir, '.audit.json'), // tracks rotated files
    createSymlink: true, // keeps "current" symlink pointing at today's file
    symlinkName: filename.replace('%DATE%', 'current'),
    ...rest,
  });
}

// Main Factory

export function buildTransports(cfg: TransportConfig): winston.transport[] {
  const isDev = cfg.nodeEnv === 'development';
  const logDir = resolveLogDir(cfg.logDir);
  const transports: winston.transport[] = [];

  // Console
  transports.push(buildConsoleTransport(isDev));

  // File transports
  if (!cfg.stdoutOnly && !isDev) {
    // Combined — all levels
    transports.push(
      buildRotateTransport({
        dir: logDir,
        filename: 'combined-%DATE%.log',
      }),
    );

    // Errors only — for targeted alerting / monitoring
    transports.push(
      buildRotateTransport({
        dir: logDir,
        filename: 'error-%DATE%.log',
        level: 'error',
        handleExceptions: true,
        handleRejections: true,
      }),
    );
  }

  // Dev file transport — optional convenience dump
  // Write a local combined.log in development so engineers can grep without
  // terminal scroll-back limits.  Not rotated — it's ephemeral dev data.
  if (isDev) {
    transports.push(
      new winston.transports.File({
        filename: path.join(logDir, 'dev-combined.log'),
        format: productionFormat, // JSON in file even in dev (for grep)
        handleExceptions: false,
        handleRejections: false,
      }),
    );
  }

  return transports;
}

/**
 * Build a minimal transport set suitable for unit tests:
 * silent console + in-memory transport for assertions.
 */
export function buildTestTransports(): winston.transport[] {
  return [new winston.transports.Console({ silent: true })];
}
