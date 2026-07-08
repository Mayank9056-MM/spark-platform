import type { Response } from 'express';

export interface ApiResponsePayload<T> {
  success: true;
  message: string;
  data: T;
  meta?: Record<string, unknown>;
}

/**
 * Sends a consistent success-response shape across every route handler.
 * Pairs with ApiError, which governs the error-response shape via
 * errorResponderMiddleware — together these are the only two shapes any
 * client of this API ever needs to handle.
 */
export class ApiResponse {
  static send<T>(
    res: Response,
    statusCode: number,
    data: T,
    message = 'Success',
    meta?: Record<string, unknown>,
  ): void {
    const payload: ApiResponsePayload<T> = {
      success: true,
      message,
      data,
      ...(meta !== undefined && { meta }),
    };
    res.status(statusCode).json(payload);
  }

  static ok<T>(res: Response, data: T, message?: string): void {
    ApiResponse.send(res, 200, data, message);
  }

  static created<T>(res: Response, data: T, message = 'Created successfully'): void {
    ApiResponse.send(res, 201, data, message);
  }

  static noContent(res: Response): void {
    res.status(204).send();
  }

  static paginated<T>(
    res: Response,
    data: T[],
    pagination: { page: number; limit: number; total: number },
    message?: string,
  ): void {
    ApiResponse.send(res, 200, data, message, {
      pagination: {
        ...pagination,
        totalPages: Math.ceil(pagination.total / pagination.limit),
      },
    });
  }
}
