/**
 * Public surface of the auth feature. Routes and other features import from
 * here, never from deep paths such as `features/auth/lib/...`, mirroring the
 * module boundaries enforced on the API side (see apps/api/src/modules/rbac/index.ts).
 */
export { LoginForm } from './components/login-form';
export { DEFAULT_POST_LOGIN_PATH, LOGIN_PATH, REDIRECT_PARAM } from './constants';
export { resolveSafeRedirect } from './lib/safe-redirect';
