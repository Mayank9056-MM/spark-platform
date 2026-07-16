import type { NextFunction, Request, Response } from 'express';
import type { ZodType } from 'zod';

import { ApiError } from '@/common/errors/ApiError.js';
import { ErrorCode } from '@/common/errors/ErrorCodes.js';

type ValidationSource = 'body' | 'params' | 'query';

export function validate(schema: ZodType, source: ValidationSource = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const input: unknown =
      source === 'body' ? (req.body as unknown) : source === 'params' ? req.params : req.query;

    const result = schema.safeParse(input);

    if (!result.success) {
      const message = result.error.issues
        .map((issue) => {
          const path = issue.path.length > 0 ? `${issue.path.join('.')}: ` : '';
          return `${path}${issue.message}`;
        })
        .join('; ');
      next(ApiError.badRequest(message, ErrorCode.VALIDATION_ERROR));
      return;
    }

    req.valid ??= {};
    req.valid[source] = result.data;
    next();
  };
}
