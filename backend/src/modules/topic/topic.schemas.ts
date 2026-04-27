import { z } from 'zod';
import { TopicTypeSchema } from '../llm/llm.schemas.js';

export const LearningResourceSchema = z.object({
  title: z.string(),
  url: z.url(),
});

export const DiscoverTopicRequestSchema = z
  .object({
    mode: z.enum(['surprise', 'guided', 'deep_link']),
    topicId: z.string().uuid().optional(),
    topicName: z.string().optional(),
    constraints: z
      .object({
        category: z.string().min(1),
        subcategory: z.string().min(1),
        topicType: TopicTypeSchema,
        learningGoal: z.string().min(1),
      })
      .optional(),
  })
  .refine((value) => {
    if (value.mode === 'guided') {
      return !!value.constraints;
    }
    if (value.mode === 'deep_link') {
      return !!value.topicId || !!value.topicName;
    }
    return true;
  }, 'constraints required for guided mode; topicId or topicName required for deep_link mode')
  .refine((value) => {
    if (value.mode !== 'deep_link') {
      return !value.topicId && !value.topicName;
    }
    return true;
  }, 'topicId and topicName are only valid for deep_link mode');

export const ListTopicsQuerySchema = z.object({
  status: z.enum(['discovered', 'learned', 'dismissed', 'all']).default('all'),
  category: z.string().optional(),
  subcategory: z.string().optional(),
  topicType: TopicTypeSchema.optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const TopicListItemResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  topicType: TopicTypeSchema,
  category: z.string(),
  subcategory: z.string(),
  contentWhat: z.string(),
  status: z.enum(['discovered', 'learned', 'dismissed']),
  discoveryMethod: z.enum(['surprise', 'guided', 'deep_link']),
  discoveredAt: z.string(),
  learnedAt: z.string().nullable(),
});

export const HyperlinkItemSchema = z.object({
  relationshipId: z.string().uuid(),
  targetName: z.string(),
  targetTopicId: z.string().uuid().nullable(),
  owned: z.boolean(),
});

export const HyperlinksResponseSchema = z.object({
  topicId: z.string().uuid(),
  status: z.enum(['processing', 'ready', 'failed']),
});

export const TopicResponseSchema = TopicListItemResponseSchema.extend({
  hyperlinksStatus: z.enum(['processing', 'ready', 'failed']).nullable(),
  insightsStatus: z.enum(['processing', 'ready', 'failed']).nullable(),
  hyperlinks: z.array(HyperlinkItemSchema),
  content: z.object({
    what: z.string(),
    why: z.string(),
    pros: z.array(z.string()),
    cons: z.array(z.string()),
    compareToSimilar: z.array(
      z.object({
        topic: z.string(),
        comparison: z.string(),
      })
    ),
    learningResources: z.array(LearningResourceSchema).default([]),
  }),
});

export const InsightItemSchema = z.object({
  targetName: z.string(),
  targetTopicId: z.string().uuid().nullable(),
  owned: z.boolean(),
});

export const InsightGroupSchema = z.object({
  relationKind: z.string(),
  heading: z.string(),
  items: z.array(InsightItemSchema),
});

export const InsightsResponseSchema = z.object({
  topicId: z.string().uuid(),
  status: z.enum(['processing', 'ready', 'failed']),
  groups: z.array(InsightGroupSchema),
});

export const TopicIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const UpdateTopicStatusRequestSchema = z.object({
  status: z.enum(['discovered', 'dismissed']),
  discoveryMethod: z.enum(['surprise', 'guided', 'deep_link']).optional(),
});

export const FlatTopicContentSchema = z.object({
  name: z.string(),
  topicType: TopicTypeSchema,
  category: z.string(),
  subcategory: z.string(),
  what: z.string(),
  why: z.string(),
  pro_0: z.string(),
  pro_1: z.string(),
  pro_2: z.string(),
  pro_3: z.string(),
  pro_4: z.string(),
  con_0: z.string(),
  con_1: z.string(),
  con_2: z.string(),
  con_3: z.string(),
  con_4: z.string(),
  compare_0_tech: z.string(),
  compare_0_text: z.string(),
  compare_1_tech: z.string(),
  compare_1_text: z.string(),
  resource_0_title: z.string().optional(),
  resource_0_url: z.string().optional(),
  resource_1_title: z.string().optional(),
  resource_1_url: z.string().optional(),
  resource_2_title: z.string().optional(),
  resource_2_url: z.string().optional(),
  resource_3_title: z.string().optional(),
  resource_3_url: z.string().optional(),
  resource_4_title: z.string().optional(),
  resource_4_url: z.string().optional(),
});

export type DiscoverTopicRequest = z.infer<typeof DiscoverTopicRequestSchema>;
export type ListTopicsQuery = z.infer<typeof ListTopicsQuerySchema>;
export type TopicListItemResponse = z.infer<typeof TopicListItemResponseSchema>;
export type TopicResponse = z.infer<typeof TopicResponseSchema>;
export type UpdateTopicStatusRequest = z.infer<typeof UpdateTopicStatusRequestSchema>;
export type FlatTopicContent = z.infer<typeof FlatTopicContentSchema>;
export type LearningResource = z.infer<typeof LearningResourceSchema>;
export type HyperlinkItem = z.infer<typeof HyperlinkItemSchema>;
export type InsightItem = z.infer<typeof InsightItemSchema>;
export type InsightGroup = z.infer<typeof InsightGroupSchema>;
export type InsightsResponse = z.infer<typeof InsightsResponseSchema>;
export type HyperlinksResponse = z.infer<typeof HyperlinksResponseSchema>;
