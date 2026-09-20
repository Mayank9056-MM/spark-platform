export const LOGIN_PATH = '/login';

/**
 * Where a successful login lands when no valid `next` target was supplied.
 * "/" is the only portal route that exists today; point this at the dashboard
 * once it does.
 */
export const DEFAULT_POST_LOGIN_PATH = '/';

/** Query parameter carrying the page the user originally tried to open. */
export const REDIRECT_PARAM = 'next';
