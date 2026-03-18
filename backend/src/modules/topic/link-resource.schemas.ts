import { z } from 'zod';

export const BraveWebResultSchema = z.object({
  title: z.string(),
  url: z.string(),
  description: z.string().optional(),
});

export const BraveSearchResponseSchema = z.object({
  web: z
    .object({
      results: z.array(BraveWebResultSchema),
    })
    .optional(),
});

export type BraveWebResult = z.infer<typeof BraveWebResultSchema>;
export type BraveSearchResponse = z.infer<typeof BraveSearchResponseSchema>;
