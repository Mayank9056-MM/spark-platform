import { API_ERROR_CODE, ApiClientError } from '@/lib/api/api-error';

const VALIDATION_MESSAGE = "The password doesn't meet the requirements. Check it and try again.";
const RATE_LIMITED_MESSAGE = 'Too many attempts. Wait a few minutes, then try again.';
const NETWORK_MESSAGE = "Can't reach the server. Check your connection and try again.";
const TIMEOUT_MESSAGE = "The server didn't respond in time. Try again.";
const SERVER_MESSAGE = "This isn't available right now. Try again in a few minutes.";
const FALLBACK_MESSAGE = 'Something went wrong. Try again.';

/**
 * The API answers 400 TOKEN_INVALID for a reset token that is unknown,
 * expired, already used, or of the wrong purpose — deliberately
 * undifferentiated, so neither does the UI.
 */
export function isInvalidResetTokenError(error: unknown): boolean {
  return error instanceof ApiClientError && error.code === API_ERROR_CODE.TOKEN_INVALID;
}

function messageFor(error: unknown): string {
  if (!(error instanceof ApiClientError)) {
    return FALLBACK_MESSAGE;
  }

  switch (error.kind) {
    case 'network':
      return NETWORK_MESSAGE;
    case 'timeout':
      return TIMEOUT_MESSAGE;
    case 'invalid-response':
      return withReference(SERVER_MESSAGE, error.requestId);
    case 'http':
      break;
  }

  if (error.code === API_ERROR_CODE.VALIDATION_ERROR) {
    return VALIDATION_MESSAGE;
  }

  // The rate limiter answers 429 without an error code.
  if (error.status === 429) {
    return RATE_LIMITED_MESSAGE;
  }

  if (error.status >= 500) {
    return withReference(SERVER_MESSAGE, error.requestId);
  }

  return withReference(FALLBACK_MESSAGE, error.requestId);
}

export function getPasswordResetRequestErrorMessage(error: unknown): string {
  return messageFor(error);
}

export function getPasswordResetConfirmErrorMessage(error: unknown): string {
  return messageFor(error);
}

function withReference(message: string, requestId: string | undefined): string {
  return requestId ? `${message} Reference: ${requestId}.` : message;
}
