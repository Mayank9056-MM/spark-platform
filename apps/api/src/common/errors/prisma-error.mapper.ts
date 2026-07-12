import { ApiError } from './ApiError.js';
import { ErrorCode } from './ErrorCodes.js';

interface PrismaKnownRequestErrorShape {
  name: 'PrismaClientKnownRequestError';
  code: string;
  meta?: unknown;
  clientVersion: string;
}

interface PrismaValidationErrorShape {
  name: 'PrismaClientValidationError';
}

interface PrismaInitErrorShape {
  name: 'PrismaClientInitializationError';
}

function isPrismaKnownRequestError(err: unknown): err is PrismaKnownRequestErrorShape {
  return (
    typeof err === 'object' &&
    err !== null &&
    'name' in err &&
    (err as { name?: unknown }).name === 'PrismaClientKnownRequestError' &&
    'code' in err &&
    typeof (err as { code?: unknown }).code === 'string'
  );
}

function isPrismaValidationError(err: unknown): err is PrismaValidationErrorShape {
  return (
    typeof err === 'object' &&
    err !== null &&
    'name' in err &&
    (err as { name?: unknown }).name === 'PrismaClientValidationError'
  );
}

function isPrismaInitError(err: unknown): err is PrismaInitErrorShape {
  return (
    typeof err === 'object' &&
    err !== null &&
    'name' in err &&
    (err as { name?: unknown }).name === 'PrismaClientInitializationError'
  );
}

export function mapPrismaError(err: unknown): ApiError {
  if (isPrismaKnownRequestError(err)) {
    switch (err.code) {
      case 'P2002': {
        const target = extractTargetFields(err.meta);
        return ApiError.conflict(
          `A record with this ${target} already exists.`,
          ErrorCode.DUPLICATE_ENTRY,
        );
      }

      case 'P2003': {
        return ApiError.badRequest(
          'This operation references a record that does not exist.',
          ErrorCode.FOREIGN_KEY_VIOLATION,
        );
      }

      case 'P2025': {
        return ApiError.notFound(
          'The record you are trying to modify does not exist.',
          ErrorCode.RECORD_NOT_FOUND,
        );
      }

      default:
        return ApiError.internal(`Database error (${err.code})`, ErrorCode.INTERNAL_ERROR);
    }
  }

  if (isPrismaValidationError(err)) {
    return ApiError.badRequest('Invalid data provided.', ErrorCode.VALIDATION_ERROR);
  }

  if (isPrismaInitError(err)) {
    return ApiError.internal('Database connection error.', ErrorCode.INTERNAL_ERROR);
  }

  return ApiError.internal('An unexpected error occurred.', ErrorCode.INTERNAL_ERROR);
}

function hasTarget(meta: unknown): meta is { target: string[] } {
  return (
    typeof meta === 'object' && meta !== null && 'target' in meta && Array.isArray(meta.target)
  );
}

function extractTargetFields(meta: unknown): string {
  if (hasTarget(meta)) {
    return meta.target.join(', ');
  }
  return 'field';
}
