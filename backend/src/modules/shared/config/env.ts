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
  // Default to 'none' because frontend and backend are hosted on different
  // domains.  SameSite=None allows cross-origin requests (e.g. fetch with
  // credentials: 'include') to carry cookies — required by Safari / iOS
  // which strictly enforce SameSite semantics.
  // Override to 'lax' only for local development over plain HTTP.
  COOKIE_SAME_SITE: z.enum(['lax', 'strict', 'none']).default('none'),

  // Security
  ALLOWED_ORIGINS: z
    .string()
    .transform(s => s.split(',').map(origin => origin.trim()).filter(Boolean)),
  ENABLE_FINGERPRINTING: z.string().default('true').transform(val => val === 'true'),

  // LLM
  LLM_PROVIDER: z.enum(['anthropic', 'openai']).default('anthropic'),
  LLM_API_KEY: z.string().min(1),
  LLM_API_URL: z.string().url().optional(),
  LLM_MODEL: z.string().default('claude-3-5-sonnet-20241022'),
  LLM_ANTHROPIC_VERSION: z.string().default('2023-06-01'),
  LLM_MAX_TOKENS: z.string().default('4000').transform(Number),
  LLM_TEMPERATURE: z.string().default('0.7').transform(Number),
}).refine(
  data => !(data.COOKIE_SAME_SITE === 'none' && !data.SECURE_COOKIES),
  {
    message: 'SECURE_COOKIES must be "true" when COOKIE_SAME_SITE is "none" — browsers reject SameSite=None cookies without the Secure attribute',
    path: ['SECURE_COOKIES'],
  },
);

export type Env = z.infer<typeof envSchema>;

// Parse and validate environment variables
export const env = envSchema.parse(process.env);
