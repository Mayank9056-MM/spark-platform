import { RATE_LIMIT } from '@spark/shared/constants';
import rateLimit from 'express-rate-limit';

import { env } from '../config/env.js';
import { httpLogger } from '../lib/logger.js';

export const rateLimiter = rateLimit({
  windowMs: env.NODE_ENV === 'development' ? 30 * 60 * 1000 : RATE_LIMIT.general.windowMs,
  max: env.NODE_ENV === 'development' ? 1000 : RATE_LIMIT.general.max,
  skip: (req) => req.method === 'OPTIONS',
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
  },
  handler: (req, res, _next, options) => {
    httpLogger.warn('Rate limit exceeded', {
      ip: req.ip,
      url: req.url,
      method: req.method,
    });
    res.status(options.statusCode).send(options.message);
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const authRateLimiter = rateLimit({
  windowMs: RATE_LIMIT.auth.windowMs,
  max: RATE_LIMIT.auth.max,
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.',
  },
});
