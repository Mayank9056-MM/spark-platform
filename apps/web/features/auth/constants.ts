export const LOGIN_PATH = '/login';
export const ACTIVATE_PATH = '/activate';
export const PASSWORD_RESET_REQUEST_PATH = '/password-reset';
export const PASSWORD_RESET_CONFIRM_PATH = '/password-reset/confirm';
export const FORBIDDEN_PATH = '/forbidden';

/**
 * Where a successful login lands when no valid `next` target was
 * supplied. No page exists at "/" — that's deliberate: it's the signal
 * LoginForm uses to fall back to the role-based default route (see
 * resolveDefaultRoute) instead of a fixed destination.
 */
export const DEFAULT_POST_LOGIN_PATH = '/';

/** Query parameter carrying the page the user originally tried to open. */
export const REDIRECT_PARAM = 'next';

/** Query parameter carrying the raw activation token from the email link. */
export const ACTIVATION_TOKEN_PARAM = 'token';

/** Query parameter carrying the raw password-reset token from the email link. */
export const PASSWORD_RESET_TOKEN_PARAM = 'token';

/** Login page success-message flags (Phase 5). */
export const ACTIVATED_QUERY_PARAM = 'activated';
export const RESET_QUERY_PARAM = 'reset';
