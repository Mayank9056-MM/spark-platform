import { API_ERROR_CODE, ApiClientError } from '@/lib/api/api-error';

export interface StructuredAuthError {
  title: string;
  description: string;
  action?: {
    label: string;
    href?: string;
  };
}

const MESSAGE_BY_CODE = new Map<string, string>([
  [
    API_ERROR_CODE.INVALID_CREDENTIALS,
    'The email or password is incorrect. Check both and try again.',
  ],
  [
    API_ERROR_CODE.ACCOUNT_LOCKED,
    'Your account is locked after too many failed attempts. Try again later, or ask an administrator to unlock it.',
  ],
  [
    API_ERROR_CODE.ACCOUNT_PENDING_ACTIVATION,
    "Your account isn't activated yet. Use your activation link to set a password, or contact an administrator.",
  ],
  [
    API_ERROR_CODE.VALIDATION_ERROR,
    "The email or password couldn't be processed. Check both and try again.",
  ],
]);

const RATE_LIMITED_MESSAGE = 'Too many sign-in attempts. Wait a few minutes, then try again.';
const NETWORK_MESSAGE = "Can't reach the server. Check your connection and try again.";
const TIMEOUT_MESSAGE = "The server didn't respond in time. Try again.";
const SERVER_MESSAGE = "Sign-in isn't available right now. Try again in a few minutes.";
const FALLBACK_MESSAGE = 'Sign-in failed. Try again.';

/** True when the credentials were rejected, so the form can clear the password field. */
export function isInvalidCredentialsError(error: unknown): boolean {
  return error instanceof ApiClientError && error.code === API_ERROR_CODE.INVALID_CREDENTIALS;
}

/**
 * Turns any login failure into structured title, description, and optional action.
 * Powers compact enterprise message patterns.
 */
export function getStructuredLoginError(error: unknown): StructuredAuthError {
  if (!(error instanceof ApiClientError)) {
    return {
      title: "Couldn't sign you in",
      description: FALLBACK_MESSAGE,
    };
  }

  if (error.kind === 'network') {
    return {
      title: 'Network connection error',
      description: NETWORK_MESSAGE,
    };
  }

  if (error.kind === 'timeout') {
    return {
      title: 'Request timed out',
      description: TIMEOUT_MESSAGE,
    };
  }

  if (error.kind === 'invalid-response') {
    return {
      title: 'Service unavailable',
      description: withReference(SERVER_MESSAGE, error.requestId),
    };
  }

  if (error.code === API_ERROR_CODE.ACCOUNT_PENDING_ACTIVATION) {
    return {
      title: "Your account isn't activated yet.",
      description:
        'Please check your email for the activation link dispatched by your college administrator to set your password.',
    };
  }

  if (error.code === API_ERROR_CODE.ACCOUNT_LOCKED) {
    return {
      title: 'Account temporarily locked',
      description:
        'Your account has been locked after multiple consecutive unsuccessful attempts. Contact the IT Helpdesk.',
    };
  }

  if (error.code === API_ERROR_CODE.INVALID_CREDENTIALS) {
    return {
      title: 'Invalid credentials',
      description: 'The email address or password is incorrect. Check both and try again.',
    };
  }

  if (error.code === API_ERROR_CODE.VALIDATION_ERROR) {
    return {
      title: 'Invalid form submission',
      description: "The email or password couldn't be processed. Check both and try again.",
    };
  }

  if (error.status === 429) {
    return {
      title: 'Sign-in attempts exceeded',
      description: RATE_LIMITED_MESSAGE,
    };
  }

  if (error.status >= 500) {
    return {
      title: 'Authentication service unavailable',
      description: withReference(SERVER_MESSAGE, error.requestId),
    };
  }

  return {
    title: "Couldn't sign you in",
    description: withReference(FALLBACK_MESSAGE, error.requestId),
  };
}

/**
 * Turns any login failure into copy that says what happened and what to do.
 * Server error text is never shown verbatim: it is written for logs and API
 * consumers, and some of it (e.g. the lock-out message) is not user-friendly.
 */
export function getLoginErrorMessage(error: unknown): string {
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

  const mapped = error.code === undefined ? undefined : MESSAGE_BY_CODE.get(error.code);
  if (mapped !== undefined) {
    return mapped;
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

/** Support can trace a request by id, so surface it when the server provided one. */
function withReference(message: string, requestId: string | undefined): string {
  return requestId ? `${message} Reference: ${requestId}.` : message;
}
