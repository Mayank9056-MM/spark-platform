import { z } from 'zod';

import { type RoleAssignmentItem, roleAssignmentItemSchema } from '../schemas/role.schema';

import type { PaginatedResult } from '@/lib/api/envelope';
import { apiPaginatedRequest, apiRequest } from '@/lib/api/http-client';

export interface ListRoleAssignmentsParams {
  userId?: string;
  roleId?: string;
  page?: number;
  limit?: number;
}

export type CreateRoleAssignmentPayload =
  | {
      userId: string;
      roleId: string;
      scope: { type: 'COLLEGE' };
      validFrom?: string;
      validUntil?: string;
    }
  | {
      userId: string;
      roleId: string;
      scope: { type: 'DEPARTMENT'; departmentId: string };
      validFrom?: string;
      validUntil?: string;
    };

const successResponseSchema = z.object({
  success: z.boolean().optional(),
});

export function listRoleAssignments(
  params?: ListRoleAssignmentsParams,
  signal?: AbortSignal,
): Promise<PaginatedResult<RoleAssignmentItem>> {
  const query = new URLSearchParams();
  if (params?.userId) query.set('userId', params.userId);
  if (params?.roleId) query.set('roleId', params.roleId);
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));

  const endpoint = `/rbac/role-assignments${query.toString() ? `?${query.toString()}` : ''}`;
  return apiPaginatedRequest(endpoint, roleAssignmentItemSchema, { method: 'GET', signal });
}

export function createRoleAssignment(
  payload: CreateRoleAssignmentPayload,
  signal?: AbortSignal,
): Promise<RoleAssignmentItem> {
  return apiRequest('/rbac/role-assignments', roleAssignmentItemSchema, {
    method: 'POST',
    body: payload,
    signal,
  });
}

export function revokeRoleAssignment(
  roleAssignmentId: string,
  signal?: AbortSignal,
): Promise<{ success?: boolean }> {
  return apiRequest(`/rbac/role-assignments/${roleAssignmentId}`, successResponseSchema, {
    method: 'DELETE',
    signal,
  });
}
