export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface LogMeta {
  requestId?: string | undefined;
  traceId?: string | undefined;
  spanId?: string | undefined;
  sessionId?: string | undefined;

  userId?: string | undefined;
  roleScope?: string | undefined; // SPARK-specific: which RoleAssignment scope was active
  ip?: string | undefined;

  method?: string | undefined;
  path?: string | undefined;
  statusCode?: number | undefined;
  durationMs?: number | undefined;
  contentLength?: number | undefined;
  userAgent?: string | undefined;
  referer?: string | undefined;

  service?: string | undefined;
  component?: string | undefined; // "redis" | "prisma" | "socket" | "email" ...
  signal?: string | undefined;
  port?: number | string | undefined;
  env?: string | undefined;
  hostname?: string | undefined;
  pid?: number | undefined;

  db?: unknown;
  table?: string | undefined; // Prisma model name, replaces Mongo "collection"
  query?: unknown;

  err?: unknown;
  reason?: unknown;
  stack?: string | undefined;

  timeoutMs?: number | undefined;
  timeout_ms?: number | undefined;

  email?: string | undefined;

  socketId?: string | undefined;
  room?: string | undefined;
  namespace?: string | undefined;

  [key: string]: unknown;
}

export type LogMethod = (message: string, meta?: LogMeta) => void;

export interface ILogger {
  trace: LogMethod;
  debug: LogMethod;
  info: LogMethod;
  warn: LogMethod;
  error: LogMethod;
  fatal: LogMethod;
  child(defaultMeta: LogMeta): ILogger;
}

export interface RequestLogData extends LogMeta {
  requestId: string;
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
  ip: string;
}
