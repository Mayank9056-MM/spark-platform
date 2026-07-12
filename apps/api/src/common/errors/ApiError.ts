import type { ErrorCode } from './ErrorCodes.js';

export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly expose: boolean;
  public readonly isOperational: boolean;
  public readonly code?: ErrorCode | undefined;

  constructor(
    statusCode: number,
    message: string,
    options: { code?: ErrorCode | undefined; expose?: boolean } = {},
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.expose = options.expose ?? statusCode < 500;
    this.isOperational = true;
    if (options.code !== undefined) this.code = options.code;

    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message: string, code?: ErrorCode): ApiError {
    return new ApiError(400, message, { code, expose: true });
  }

  static unauthorized(message = 'Authentication required', code?: ErrorCode): ApiError {
    return new ApiError(401, message, { code, expose: true });
  }

  static forbidden(
    message = 'You do not have permission to perform this action',
    code?: ErrorCode,
  ): ApiError {
    return new ApiError(403, message, { code, expose: true });
  }

  static notFound(message = 'Resource not found', code?: ErrorCode): ApiError {
    return new ApiError(404, message, { code, expose: true });
  }

  static conflict(message: string, code?: ErrorCode): ApiError {
    return new ApiError(409, message, { code, expose: true });
  }

  static unprocessable(message: string, code?: ErrorCode): ApiError {
    return new ApiError(422, message, { code, expose: true });
  }

  static internal(message = 'An unexpected error occurred', code?: ErrorCode): ApiError {
    return new ApiError(500, message, { code, expose: false });
  }
}
