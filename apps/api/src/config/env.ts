import { z } from 'zod';
import 'dotenv/config';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.url(),
  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),

  CORS_ORIGIN: z.string().default('http://localhost:3000'),

  LOG_LEVEL: z.string().default('info'),
  LOG_DIR: z.string().default('logs'),
  LOG_STDOUT_ONLY: z.coerce.boolean().default(false),

  // Argon
  ARGON2_MEMORY_COST: z.coerce
    .number()
    .min(8 * 1024) // 8 MiB
    .max(1014 * 1024) // 1 GiB
    .default(19456), // 19 MiB (19456 KiB) — see docs for the benchmark this default is based on
  ARGON2_TIME_COST: z.coerce.number().min(1).max(10).default(2),
  ARGON2_PARALLELISM: z.coerce.number().min(1).max(32).default(1),

  /**
   * Express `trust proxy` setting (Phase 15). Deliberately NOT defaulted to
   * `true` — the production reverse-proxy topology is not finalized yet, and
   * blindly trusting X-Forwarded-For before that's known would let any
   * direct client spoof req.ip. Accepted values, passed straight through to
   * Express's `app.set('trust proxy', ...)`:
   *   "false"        — no reverse proxy in front of this process (default;
   *                     matches current dev topology). req.ip is the direct
   *                     socket address; X-Forwarded-For is ignored.
   *   "true"         — trust the nearest hop unconditionally. Only correct
   *                     if the API is never directly reachable from the
   *                     internet.
   *   "<integer>"    — trust exactly N hops (e.g. "1" for a single reverse
   *                     proxy/load balancer directly in front of the API).
   *   "<subnet(s)>"  — comma-separated IP/CIDR ranges to trust (e.g.
   *                     "10.0.0.0/8,172.16.0.0/12" for a known internal LB).
   * Whichever topology production ends up using (single LB, CDN + LB, direct
   * exposure), set this to match — see
   * docs/architecture/production-deployment.md for the requirement this
   * satisfies. Getting this wrong in either direction is a real security bug:
   * too permissive lets clients spoof req.ip (rate-limit bypass, false audit
   * IPs); too restrictive breaks rate limiting/IP logging behind a real proxy.
   */
  TRUST_PROXY: z.string().default('false'),

  // Admin
  INITIAL_SUPER_ADMIN_EMAIL: z.string().min(1, 'INITIAL_SUPER_ADMIN_EMAIL is required'),
  INITIAL_SUPER_ADMIN_PASSWORD: z.string().min(1, 'INITIAL_SUPER_ADMIN_PASSWORD is required'),
  INITIAL_SUPER_ADMIN_FIRST_NAME: z.string().min(1, 'INITIAL_SUPER_ADMIN_FIRST_NAME is required'),
  INITIAL_SUPER_ADMIN_LAST_NAME: z.string().min(1, 'INITIAL_SUPER_ADMIN_LAST_NAME is required'),
});

export const env = envSchema.parse(process.env);
