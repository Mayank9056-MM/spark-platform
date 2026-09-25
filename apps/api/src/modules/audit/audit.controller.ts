import type { Request, Response } from 'express';

import { ApiResponse } from '../../common/responses/ApiResponse.js';

import * as auditService from './audit.service.js';
import type { AuditLogIdParams, ListAuditLogsQuery } from './audit.validation.js';

export const listAuditLogs = async (req: Request, res: Response): Promise<void> => {
  const query = req.valid?.query as ListAuditLogsQuery;

  const { logs, total } = await auditService.listAuditLogs(
    {
      actorUserId: query.actorUserId,
      action: query.action,
      entityType: query.entityType,
      entityId: query.entityId,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      search: query.search,
    },
    {
      page: query.page,
      limit: query.limit,
      sortOrder: query.sortOrder,
    },
  );

  ApiResponse.paginated(res, logs, {
    page: query.page,
    limit: query.limit,
    total,
  });
};

export const getAuditLogById = async (req: Request, res: Response): Promise<void> => {
  const params = req.valid?.params as AuditLogIdParams;
  const log = await auditService.getAuditLogById(params.id);
  ApiResponse.ok(res, log);
};
