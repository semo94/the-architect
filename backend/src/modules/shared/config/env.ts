import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  PORT: z.string().default('3000').transform(Number),

  // Database
  DATABASE_URL: z.string().url(),

  // GitHub OAuth
  GITHUB_CLIENT_ID: z.string().min(1),
  GITHUB_CLIENT_SECRET: z.string().min(1),
  GITHUB_CALLBACK_URL: z.string().url(),

  // OAuth State Security
  OAUTH_STATE_SECRET: z.string().min(32),

  // JWT
  JWT_ACCESS_SECRET: z.string().min(32),

  // Client URLs
  WEB_CLIENT_URL: z.string().url(),
  MOBILE_DEEP_LINK_SCHEME: z.string().default('breadthwise://'),

  // Cookie settings
  COOKIE_DOMAIN: z.string().optional(),
  SECURE_COOKIES: z.string().default('true').transform(val => val === 'true'),

  // Security
  ALLOWED_ORIGINS: z.string().transform(s => s.split(',')),
  ENABLE_FINGERPRINTING: z.string().default('true').transform(val => val === 'true'),
});

export type Env = z.infer<typeof envSchema>;

// Parse and validate environment variables
export const env = envSchema.parse(process.env);
