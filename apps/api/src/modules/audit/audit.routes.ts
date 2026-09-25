import { Router } from 'express';

import { requireAuth } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { authorize } from '../rbac/index.js';

import * as auditController from './audit.controller.js';
import { auditLogIdParamsSchema, listAuditLogsQuerySchema } from './audit.validation.js';

export const auditRouter = Router();

auditRouter.use(requireAuth);

auditRouter.get(
  '/',
  authorize('auditLog', 'read'),
  validate(listAuditLogsQuerySchema, 'query'),
  auditController.listAuditLogs,
);

auditRouter.get(
  '/:id',
  authorize('auditLog', 'read'),
  validate(auditLogIdParamsSchema, 'params'),
  auditController.getAuditLogById,
);
