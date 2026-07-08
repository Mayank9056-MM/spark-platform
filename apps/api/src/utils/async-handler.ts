import type { NextFunction, Request, Response } from 'express';

type AsyncRouteHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>;

/**
 * Wraps an async Express handler so a rejected promise (a thrown error
 * inside an `await`) is forwarded to next(err) automatically.
 *
 * Without this, an unhandled rejection inside a route handler is silently
 * swallowed by Express — the request just hangs, no error middleware runs,
 * no log line, no response ever sent to the client. This is precisely the
 * failure mode @typescript-eslint/no-floating-promises exists to catch at
 * the call-site level; this wrapper is the runtime-level fix.
 */
export function asyncHandler(handler: AsyncRouteHandler) {
  return (req: Request, res: Response, next: NextFunction): void => {
    handler(req, res, next).catch(next);
  };
}
