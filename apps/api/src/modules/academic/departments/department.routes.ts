// apps/api/src/modules/academic/departments/department.routes.ts

import { Router } from 'express';

import { requireAuth } from '../../../middlewares/auth.middleware.js';
import { validate } from '../../../middlewares/validate.middleware.js';
import { authorize } from '../../rbac/index.js';

import * as departmentController from './department.controller.js';
import {
  createDepartmentBodySchema,
  departmentIdParamsSchema,
  listDepartmentsQuerySchema,
  updateDepartmentBodySchema,
} from './department.validation.js';

export const departmentRouter = Router();

departmentRouter.use(requireAuth);

departmentRouter.post(
  '/',
  authorize('department', 'create'),
  validate(createDepartmentBodySchema),
  departmentController.createDepartment,
);

departmentRouter.get(
  '/',
  authorize('department', 'read'),
  validate(listDepartmentsQuerySchema, 'query'),
  departmentController.listDepartments,
);

departmentRouter.get(
  '/:id',
  authorize('department', 'read'),
  validate(departmentIdParamsSchema, 'params'),
  departmentController.getDepartmentById,
);

departmentRouter.patch(
  '/:id',
  authorize('department', 'update'),
  validate(departmentIdParamsSchema, 'params'),
  validate(updateDepartmentBodySchema),
  departmentController.updateDepartment,
);

departmentRouter.delete(
  '/:id',
  authorize('department', 'delete'),
  validate(departmentIdParamsSchema, 'params'),
  departmentController.deleteDepartment,
);
