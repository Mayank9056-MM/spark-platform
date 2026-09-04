// apps/api/src/modules/admissions/admission.controller.ts

import type { Request, Response } from 'express';

import { ApiResponse } from '../../common/responses/ApiResponse.js';

import { admissionService } from './admission.service.js';
import type {
  AdmissionIdParams,
  CreateAdmissionBody,
  ListAdmissionsQuery,
  UpdateAdmissionBody,
} from './admission.validation.js';

/**
 * Thin HTTP adapter over AdmissionService — no business logic here.
 * `req.valid?.*` / `req.user!.id` follow the shape the task's own routes
 * pseudocode used; not verified against types/express.d.ts or another
 * controller, since no other controller file was available to copy from.
 */

export const createAdmission = async (req: Request, res: Response): Promise<void> => {
  const body = req.valid?.body as CreateAdmissionBody;
  const actorUserId = req.user!.id;

  const admission = await admissionService.createAdmission(actorUserId, body);

  ApiResponse.created(res, admission, 'Admission created');
};

export const getAdmissionById = async (req: Request, res: Response): Promise<void> => {
  const params = req.valid?.params as AdmissionIdParams;

  const admission = await admissionService.getAdmissionById(params.id);

  ApiResponse.ok(res, admission);
};

export const listAdmissions = async (req: Request, res: Response): Promise<void> => {
  const query = req.valid?.query as ListAdmissionsQuery;
  const { page, limit, sortBy, sortOrder, ...filters } = query;

  const result = await admissionService.listAdmissions(filters, { page, limit, sortBy, sortOrder });

  ApiResponse.paginated(res, result.admissions, { page, limit, total: result.total });
};

export const updateAdmission = async (req: Request, res: Response): Promise<void> => {
  const params = req.valid?.params as AdmissionIdParams;
  const body = req.valid?.body as UpdateAdmissionBody;
  const actorUserId = req.user!.id;

  const admission = await admissionService.updateAdmission(actorUserId, params.id, body);

  ApiResponse.ok(res, admission, 'Admission updated');
};

export const cancelAdmission = async (req: Request, res: Response): Promise<void> => {
  const params = req.valid?.params as AdmissionIdParams;
  const actorUserId = req.user!.id;

  const admission = await admissionService.cancelAdmission(actorUserId, params.id);

  ApiResponse.ok(res, admission, 'Admission cancelled');
};
