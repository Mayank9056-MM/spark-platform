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
  ARGON2_MEMORY_COST: z.coerce.number().default(19456),
  ARGON2_TIME_COST: z.coerce.number().default(2),
  ARGON2_PARALLELISM: z.coerce.number().default(1),
});

export const env = envSchema.parse(process.env);
