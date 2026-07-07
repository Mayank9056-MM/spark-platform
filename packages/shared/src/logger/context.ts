// src/utils/logger/context.ts

import { AsyncLocalStorage } from 'async_hooks';

import type { LogMeta } from './types.js';

export type LogContext = Pick<
  LogMeta,
  'requestId' | 'traceId' | 'spanId' | 'sessionId' | 'userId' | 'ip'
>;

export const logContext = new AsyncLocalStorage<LogContext>();

/**
 * Return the context for the current async execution, or {} if called outside
 * a request (background workers, startup code, etc.).
 */
export function getContext(): LogContext {
  return logContext.getStore() ?? {};
}

/**
 * Run a function inside a new log context.
 * The context is automatically inherited by all async operations spawned
 * within the callback.
 *
 * @param ctx   The context fields to attach to all log lines
 * @param fn    The function to run inside the context
 */
export function runWithContext<T>(ctx: LogContext, fn: () => T): T {
  // Merge with any parent context so nested runWithContext calls
  // accumulate fields rather than replacing them.
  const parent = logContext.getStore() ?? {};
  return logContext.run({ ...parent, ...ctx }, fn);
}
