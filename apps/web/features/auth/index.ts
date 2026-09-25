/**
 * Public surface of the auth feature. Routes and other features import
 * from here, never from deep paths such as `features/auth/lib/...`.
 */
export { LoginForm } from './components/login-form';
export { AuthHeader } from './components/auth-header';
export { AuthFooter } from './components/auth-footer';
export { AuthShell } from './components/auth-shell';
export { AuthBrandPanel } from './components/auth-brand-panel';
export { AuthMobileBrand } from './components/auth-mobile-brand';
export { AuthFormPanel } from './components/auth-form-panel';
export { AuthErrorAlert } from './components/auth-error-alert';
export { AuthLayout, SparkBrandMark } from './components/auth-layout';
export { AuthMessageCard } from './components/auth-message-card';
export { HvpmLogo } from './components/hvpm-logo';
export { ItHelpdeskDialog } from './components/it-helpdesk-dialog';
export {
  ACTIVATE_PATH,
  ACTIVATED_QUERY_PARAM,
  ACTIVATION_TOKEN_PARAM,
  DEFAULT_POST_LOGIN_PATH,
  FORBIDDEN_PATH,
  LOGIN_PATH,
  PASSWORD_RESET_CONFIRM_PATH,
  PASSWORD_RESET_REQUEST_PATH,
  PASSWORD_RESET_TOKEN_PARAM,
  REDIRECT_PARAM,
  RESET_QUERY_PARAM,
} from './constants';
export { resolveSafeRedirect } from './lib/safe-redirect';
export { ActivateForm } from './components/activate-form';
export { resolveActivationToken } from './lib/activation-token';
export { PasswordResetRequestForm } from './components/password-reset-request-form';
export { PasswordResetConfirmForm } from './components/password-reset-confirm-form';
export { AuthProvider } from './components/auth-provider';
export { useAuth } from './hooks/use-auth';
export { useCurrentUser } from './hooks/use-current-user';
export { isUnauthenticatedError } from './lib/auth-status';
export {
  getStructuredLoginError,
  getLoginErrorMessage,
  isInvalidCredentialsError,
} from './lib/login-error';
export { resolveDefaultRoute, ROLE_KEYS } from './lib/route-resolution';
export type { AppDestination, RoleKey } from './lib/route-resolution';
export type { CurrentUser, RoleSummary } from './schemas/session.schema';
export { AuthResolutionBoundary } from './components/auth-resolution-boundary';
export { AuthResolutionShell } from './components/auth-resolution-shell';
