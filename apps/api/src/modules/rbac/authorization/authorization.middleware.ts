// apps/api/src/modules/rbac/authorization/authorization.middleware.ts

import type { NextFunction, Request, RequestHandler, Response } from 'express';

import { authorizationService } from './authorization.service.js';
import type {
  AuthorizationAction,
  AuthorizationResource,
  ScopeContext,
} from './authorization.types.js';

import { ApiError } from '@/common/errors/ApiError.js';
import { ErrorCode } from '@/common/errors/ErrorCodes.js';

/**
 * HTTP adapter between Express and AuthorizationService.
 *
 * This file is the ONLY place RBAC decisions touch Express. It contains
 * no role/permission/scope business logic — that all lives in
 * authorization.service.ts and the layers it composes
 * (role-assignment.service.ts, permission-resolver.ts, scope-resolver.ts,
 * scope.service.ts). This middleware's job is strictly:
 *
 *   Express request → AuthorizationContext → authorizationService.authorize()
 *                                                    ↓
 *                                          next() or next(error)
 *
 * requireAuth MUST run before authorize() on every protected route —
 * this middleware does not authenticate. It only reads the identity
 * requireAuth already attached to req.user; if req.user is missing, that
 * is treated as a fail-closed authentication error (a route-wiring bug),
 * never as an implicit allow.
 *
 * A "requested scope" built here (via `getScope`) is never evidence of
 * granted authority — it is only the resource the client is asking to
 * access. Whether the subject's actual role assignments cover it is
 * decided exclusively by authorizationService.authorize(); this file
 * never inspects roles, permissions, or scope coverage itself.
 *
 * Follows the same async-middleware convention already established by
 * requireInterimAdmin.guard.ts: an async function passed directly as an
 * Express handler, no try/catch, no wrapper — a rejected promise (an
 * ApiError thrown by authorizationService.authorize(), or any other
 * error) propagates to Express's error handling natively.
 */

export interface AuthorizeOptions {
  /**
   * Name of the route param holding the target resource's ID (e.g. 'id'
   * for `/students/:id`). When omitted, no resourceId is attached to the
   * AuthorizationContext — this is a collection-level check. resourceId
   * is passed through only as context for a future instance-level policy
   * layer; this middleware and the current AuthorizationService never
   * use it to verify ownership.
   */
  readonly resourceIdParam?: string;

  /**
   * Derives the REQUESTED scope from trusted request context (typically
   * validated route params — e.g. req.params.departmentId). Never wire
   * this to raw, unvalidated client input such as req.body.scope: doing
   * so would let a client manufacture an authorization context, even
   * though it still could not manufacture a granted scope (that remains
   * exclusively role-assignment-derived), because it would let a client
   * probe for which scopes are covered against arbitrary self-chosen
   * targets. When omitted, the check is scope-less (collection/global).
   */
  readonly getScope?: (req: Request) => ScopeContext | undefined;
}

/**
 * Creates authorization middleware for one resource/action pair.
 *
 * Usage:
 *
 *   router.get('/students', requireAuth, authorize('student', 'read'), ...);
 *
 *   router.get(
 *     '/students/:id',
 *     requireAuth,
 *     authorize('student', 'read', { resourceIdParam: 'id' }),
 *     ...,
 *   );
 *
 * resource/action are typed as AuthorizationResource/AuthorizationAction
 * (not bare strings), so an invalid pair such as authorize('students',
 * 'view') fails at compile time rather than silently resolving to an
 * always-denied permission key at runtime.
 */
export function authorize(
  resource: AuthorizationResource,
  action: AuthorizationAction,
  options?: AuthorizeOptions,
): RequestHandler {
  return async function authorizeMiddleware(
    req: Request,
    _res: Response,
    next: NextFunction,
  ): Promise<void> {
    const userId = req.user?.id;

    if (!userId) {
      next(ApiError.unauthorized('Authentication required', ErrorCode.UNAUTHENTICATED));
      return;
    }

    let resourceId: string | undefined;

    if (options?.resourceIdParam) {
      const value = req.params[options.resourceIdParam];

      if (typeof value !== 'string' || value.length === 0) {
        next(
          ApiError.badRequest(
            `Missing required route parameter: ${options.resourceIdParam}`,
            ErrorCode.VALIDATION_ERROR,
          ),
        );
        return;
      }

      resourceId = value;
    }

    const scope = options?.getScope?.(req);

    await authorizationService.authorize({
      subject: { userId },
      resource,
      action,
      ...(resourceId !== undefined && { resourceId }),
      ...(scope !== undefined && { scope }),
    });

    next();
  };
}
