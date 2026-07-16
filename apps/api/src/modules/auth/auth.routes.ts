import { Router } from 'express';

import { requireAuth } from '../../middlewares/auth.middleware.js';
import { authRateLimiter } from '../../middlewares/rate-limit.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';

import * as authController from './auth.controller.js';
import {
  activateAccountBodySchema,
  confirmPasswordResetBodySchema,
  loginBodySchema,
  logoutAllDevicesBodySchema,
  requestPasswordResetBodySchema,
  revokeSessionParamsSchema,
} from './auth.validation.js';

export const authRouter = Router();

// ── Public — all rate-limited, these are the credential-stuffing surface ──
authRouter.post('/login', authRateLimiter, validate(loginBodySchema), authController.login);

// No body validation — refresh token arrives via httpOnly cookie only.
authRouter.post('/refresh', authController.refresh);

authRouter.post(
  '/activate',
  authRateLimiter,
  validate(activateAccountBodySchema),
  authController.activateAccount,
);

authRouter.post(
  '/password-reset/request',
  authRateLimiter,
  validate(requestPasswordResetBodySchema),
  authController.requestPasswordReset,
);

authRouter.post(
  '/password-reset/confirm',
  authRateLimiter,
  validate(confirmPasswordResetBodySchema),
  authController.confirmPasswordReset,
);

// Authenticated
authRouter.post('/logout', requireAuth, authController.logout);

authRouter.post(
  '/logout-all',
  requireAuth,
  validate(logoutAllDevicesBodySchema),
  authController.logoutAllDevices,
);

authRouter.get('/sessions', requireAuth, authController.listSessions);

authRouter.delete(
  '/sessions/:sessionId',
  requireAuth,
  validate(revokeSessionParamsSchema, 'params'),
  authController.revokeSession,
);
