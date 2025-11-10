import { z } from 'zod';

export const refreshTokenSchema = z.object({
  refreshToken: z.string(),
});

export type RefreshTokenDto = z.infer<typeof refreshTokenSchema>;

export const platformSchema = z.enum(['web', 'mobile']);

export type Platform = z.infer<typeof platformSchema>;

export const authCallbackSchema = z.object({
  code: z.string(),
  state: z.string(),
});

export type AuthCallbackDto = z.infer<typeof authCallbackSchema>;

export const authResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  user: z.object({
    id: z.string(),
    githubId: z.string(),
    username: z.string(),
    displayName: z.string().nullable(),
    email: z.string().nullable(),
    avatarUrl: z.string().nullable(),
  }),
});

export type AuthResponse = z.infer<typeof authResponseSchema>;
