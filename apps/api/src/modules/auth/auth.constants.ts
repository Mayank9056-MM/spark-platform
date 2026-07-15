export const AUTH_CONSTANTS = {
  MAX_FAILED_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION_MS: 15 * 60 * 1000,
  ACCESS_TOKEN_TTL_MS: 15 * 60 * 1000,
  REFRESH_TOKEN_TTL_MS: 30 * 24 * 60 * 60 * 1000,
  SESSION_TTL_MS: 90 * 24 * 60 * 60 * 1000, // absolute cap, independent of activity
  ACTIVATION_TOKEN_TTL_MS: 7 * 24 * 60 * 60 * 1000,
  PASSWORD_RESET_TOKEN_TTL_MS: 60 * 60 * 1000,
  SESSION_ACTIVITY_THROTTLE_MS: 5 * 60 * 1000, // don't write lastActivityAt more than once per 5 min
} as const;
