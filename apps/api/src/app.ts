import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import hpp from 'hpp';

import { ApiError } from './common/errors/ApiError.js';
import { env } from './config/env.js';
import {
  errorLoggerMiddleware,
  errorResponderMiddleware,
} from './middlewares/error-handler.middleware.js';
import { rateLimiter } from './middlewares/rate-limit.middleware.js';
import { requestLoggerMiddleware } from './middlewares/request-logger.middleware.js';
import { departmentRouter, programRouter } from './modules/academic/index.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { permissionRouter, roleAssignmentRouter, roleRouter } from './modules/rbac/index.js';
import { userRouter } from './modules/user/user.routes.js';

/**
 * Parses env.TRUST_PROXY into whatever shape Express's `trust proxy` setting
 * expects (boolean | number | string). See env.ts for the full explanation
 * of each accepted value — this is deliberately environment-driven rather
 * than hardcoded, since the production reverse-proxy topology isn't
 * finalized yet (Phase 15).
 */
function parseTrustProxy(value: string): boolean | number | string {
  if (value === 'true') return true;
  if (value === 'false') return false;

  const asInteger = Number.parseInt(value, 10);
  if (!Number.isNaN(asInteger) && String(asInteger) === value.trim()) {
    return asInteger;
  }

  // Anything else (comma-separated subnets, a single CIDR, etc.) is passed
  // through as-is — Express/`proxy-addr` parses these natively.
  return value;
}

export function createServer(): Express {
  const app = express();

  app.set('trust proxy', parseTrustProxy(env.TRUST_PROXY));

  app.use(requestLoggerMiddleware);
  app.use(rateLimiter);
  app.use(helmet());
  app.use(hpp());

  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Request-ID'],
    }),
  );

  app.use(express.json({ limit: '16kb' }));
  app.use(express.urlencoded({ extended: true, limit: '16kb' }));
  app.use(cookieParser());

  app.disable('etag');
  app.use((_req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    next();
  });

  app.use(compression());

  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/users', userRouter);
  app.use('/api/v1/rbac/roles', roleRouter);
  app.use('/api/v1/rbac/permissions', permissionRouter);
  app.use('/api/v1/rbac/role-assignments', roleAssignmentRouter);
  app.use('/api/v1/academic/departments', departmentRouter);
  app.use('/api/v1/academic/programs', programRouter);

  // Route-not-found must go through the SAME error pipeline as every other
  // error (Phase 11) — a bare res.json() here previously produced a
  // different response shape ({status,message}) than the rest of the API
  // ({success,error:{message,code,requestId}}), which is a real API-contract
  // inconsistency for any client.
  app.use((_req, _res, next) => {
    next(ApiError.notFound('Route not found'));
  });

  app.use(errorLoggerMiddleware);
  app.use(errorResponderMiddleware);

  return app;
}
