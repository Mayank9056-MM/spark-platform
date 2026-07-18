import type { Request, Response } from 'express';

import { ApiResponse } from '../../common/responses/ApiResponse.js';

import { toUserProfile, toUserProfileList } from './user.mapper.js';
import { userService } from './user.service.js';
import type {
  CreateUserBody,
  ListUsersQuery,
  UpdateUserBody,
  UserIdParams,
} from './user.validation.js';

export const createUser = async (req: Request, res: Response): Promise<void> => {
  const body = req.valid?.body as CreateUserBody;
  const actorUserId = req.user!.id;
  const organizationId = req.user!.organizationId!;

  const { user, activationToken } = await userService.createUser(actorUserId, organizationId, body);

  // TEMPORARY: activationToken is returned in the response body only
  // because the notification module doesn't exist yet to email it. This
  // must be removed the moment email delivery is wired up — a production
  // system must never hand a security-bearing token back in an API
  // response for anyone but the intended recipient to receive by email.
  ApiResponse.created(res, { user: toUserProfile(user), activationToken }, 'User created');
};

export const getMe = async (req: Request, res: Response): Promise<void> => {
  const organizationId = req.user!.organizationId!;
  const user = await userService.getById(organizationId, req.user!.id);
  ApiResponse.ok(res, toUserProfile(user));
};

export const getUserById = async (req: Request, res: Response): Promise<void> => {
  const params = req.valid?.params as UserIdParams;
  const organizationId = req.user!.organizationId!;
  const user = await userService.getById(organizationId, params.id);
  ApiResponse.ok(res, toUserProfile(user));
};

export const listUsers = async (req: Request, res: Response): Promise<void> => {
  const query = req.valid?.query as ListUsersQuery;
  const organizationId = req.user!.organizationId!;

  const { users, total } = await userService.listUsers(
    { organizationId, search: query.search, status: query.status },
    { page: query.page, limit: query.limit, sortBy: query.sortBy, sortOrder: query.sortOrder },
  );

  ApiResponse.paginated(res, toUserProfileList(users), {
    page: query.page,
    limit: query.limit,
    total,
  });
};

export const updateMe = async (req: Request, res: Response): Promise<void> => {
  const body = req.valid?.body as UpdateUserBody;
  const organizationId = req.user!.organizationId!;
  const actorUserId = req.user!.id;

  const user = await userService.updateUser(actorUserId, organizationId, actorUserId, body);
  ApiResponse.ok(res, toUserProfile(user), 'Profile updated');
};

export const updateUserById = async (req: Request, res: Response): Promise<void> => {
  const params = req.valid?.params as UserIdParams;
  const body = req.valid?.body as UpdateUserBody;
  const organizationId = req.user!.organizationId!;
  const actorUserId = req.user!.id;

  const user = await userService.updateUser(actorUserId, organizationId, params.id, body);
  ApiResponse.ok(res, toUserProfile(user), 'User updated');
};

export const archiveUser = async (req: Request, res: Response): Promise<void> => {
  const params = req.valid?.params as UserIdParams;
  const organizationId = req.user!.organizationId!;
  const actorUserId = req.user!.id;

  await userService.archiveUser(actorUserId, organizationId, params.id);
  ApiResponse.ok(res, null, 'User archived');
};

export const restoreUser = async (req: Request, res: Response): Promise<void> => {
  const params = req.valid?.params as UserIdParams;
  const organizationId = req.user!.organizationId!;
  const actorUserId = req.user!.id;

  const user = await userService.restoreUser(actorUserId, organizationId, params.id);
  ApiResponse.ok(res, toUserProfile(user), 'User restored');
};
