import { z } from 'zod';

export const updateUserSchema = z.object({
  displayName: z.string().min(1).max(255).optional(),
  avatarUrl: z.string().url().optional(),
});

export type UpdateUserDto = z.infer<typeof updateUserSchema>;

export const userResponseSchema = z.object({
  id: z.string().uuid(),
  githubId: z.string(),
  username: z.string(),
  displayName: z.string().nullable(),
  email: z.string().email().nullable(),
  avatarUrl: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type UserResponse = z.infer<typeof userResponseSchema>;
