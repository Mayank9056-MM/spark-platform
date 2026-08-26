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

  const { user, activationToken } = await userService.createUser(actorUserId, body);

  /**
   * TEMPORARY:
   *
   * activationToken is returned in the response because the notification
   * module has not been implemented yet.
   *
   * Remove activationToken from this response as soon as email/notification
   * delivery is available.
   */
  ApiResponse.created(res, { user: toUserProfile(user), activationToken }, 'User created');
};

export const getMe = async (req: Request, res: Response): Promise<void> => {
  const user = await userService.getById(req.user!.id);
  ApiResponse.ok(res, toUserProfile(user));
};

export const getUserById = async (req: Request, res: Response): Promise<void> => {
  const params = req.valid?.params as UserIdParams;
  const user = await userService.getById(params.id);
  ApiResponse.ok(res, toUserProfile(user));
};

export const listUsers = async (req: Request, res: Response): Promise<void> => {
  const query = req.valid?.query as ListUsersQuery;

  const { users, total } = await userService.listUsers(
    { search: query.search, status: query.status },
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
  const actorUserId = req.user!.id;

  const user = await userService.updateUser(actorUserId, actorUserId, body);
  ApiResponse.ok(res, toUserProfile(user), 'Profile updated');
};

export const updateUserById = async (req: Request, res: Response): Promise<void> => {
  const params = req.valid?.params as UserIdParams;
  const body = req.valid?.body as UpdateUserBody;
  const actorUserId = req.user!.id;

  const user = await userService.updateUser(actorUserId, params.id, body);
  ApiResponse.ok(res, toUserProfile(user), 'User updated');
};

export const archiveUser = async (req: Request, res: Response): Promise<void> => {
  const params = req.valid?.params as UserIdParams;
  const actorUserId = req.user!.id;

  await userService.archiveUser(actorUserId, params.id);
  ApiResponse.ok(res, null, 'User archived');
};

export const restoreUser = async (req: Request, res: Response): Promise<void> => {
  const params = req.valid?.params as UserIdParams;
  const actorUserId = req.user!.id;

  const user = await userService.restoreUser(actorUserId, params.id);
  ApiResponse.ok(res, toUserProfile(user), 'User restored');
};
