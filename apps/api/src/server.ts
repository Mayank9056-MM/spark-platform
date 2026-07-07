import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import hpp from 'hpp';

import { env } from './config/env.js';
import {
  errorLoggerMiddleware,
  errorResponderMiddleware,
} from './middlewares/error-logger.middleware.js';
import { rateLimiter } from './middlewares/rate-limit.middleware.js';
import { requestLoggerMiddleware } from './middlewares/request-logger.middleware.js';

export function createServer(): Express {
  const app = express();

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

  // TODO: mount feature routers here as modules/* are built
  // app.use('/api/v1', apiRouter);

  app.use((_req, res) => {
    res.status(404).json({
      status: 'error',
      message: 'Route not found',
    });
  });

  app.use(errorLoggerMiddleware);
  app.use(errorResponderMiddleware);

  return app;
}
