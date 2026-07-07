/**
 * Rate limiting thresholds, centralized so every module that needs a limiter
 * (general API traffic, auth endpoints, future bulk-upload endpoints) reads
 * from one place instead of hardcoding windowMs/max inline per file.
 */

export const RATE_LIMIT = {
  /** Default limiter applied to all routes. */
  general: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
  },

  /**
   * Stricter limiter for auth routes (login, register, password reset).
   * Low max is deliberate — these are the endpoints most likely to be
   * targeted by credential-stuffing or brute-force attempts against
   * student/faculty accounts.
   */
  auth: {
    windowMs: 15 * 60 * 1000,
    max: 5,
  },

  /**
   * Looser limiter for read-heavy, low-risk endpoints (e.g. fetching a
   * public notice board or timetable) where 100/15min would be too
   * restrictive for legitimate polling.
   */
  relaxed: {
    windowMs: 15 * 60 * 1000,
    max: 300,
  },

  /**
   * Bulk admin operations (CSV onboarding, mass grade upload) — very low
   * max since these are expensive server-side operations, not something
   * a legitimate user calls frequently.
   */
  bulkOperation: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10,
  },
} as const;

export type RateLimitProfile = keyof typeof RATE_LIMIT;
