/**
 * Machine-readable error codes, distinct from HTTP status codes.
 *
 * Why this exists: statusCode alone (404, 409, 422) tells a frontend
 * "something went wrong" but not "which specific thing." A 409 on
 * student creation could mean "email already exists" or "roll number
 * already assigned" — same status, different code, different UI message.
 * The frontend switches on `code`, humans read `message`.
 */
export enum ErrorCode {
  // Generic
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',

  // Auth
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_INVALID = 'TOKEN_INVALID',
  UNAUTHENTICATED = 'UNAUTHENTICATED',

  // RBAC
  FORBIDDEN_SCOPE = 'FORBIDDEN_SCOPE',
  INSUFFICIENT_ROLE = 'INSUFFICIENT_ROLE',

  // Data conflicts — mirrors Prisma unique/FK constraint failures
  DUPLICATE_ENTRY = 'DUPLICATE_ENTRY',
  FOREIGN_KEY_VIOLATION = 'FOREIGN_KEY_VIOLATION',
  RECORD_NOT_FOUND = 'RECORD_NOT_FOUND',

  // Rate limiting
  RATE_LIMITED = 'RATE_LIMITED',
}
