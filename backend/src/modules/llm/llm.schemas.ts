import { z } from 'zod';

export const TopicTypeSchema = z.enum([
  'concepts',
  'patterns',
  'technologies',
  'strategies',
  'models',
  'frameworks',
  'protocols',
  'practices',
  'methodologies',
  'architectures',
]);

export const GenerateTopicConstraintsSchema = z.object({
  category: z.string().min(1),
  subcategory: z.string().min(1),
  topicType: TopicTypeSchema,
  learningGoal: z.string().min(1),
});

export const GenerateTopicRequestSchema = z
  .object({
    mode: z.enum(['surprise', 'guided']),
    alreadyDiscovered: z.array(z.string()).default([]),
    dismissed: z.array(z.string()).default([]),
    constraints: GenerateTopicConstraintsSchema.optional(),
  })
  .refine((value) => {
    if (value.mode === 'guided') {
      return !!value.constraints;
    }
    return true;
  }, 'constraints are required when mode is guided');

export const TopicPromptInputSchema = z.object({
  name: z.string(),
  topicType: TopicTypeSchema,
  category: z.string(),
  subcategory: z.string(),
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
  }),
});

export const GenerateQuizRequestSchema = z.object({
  topic: TopicPromptInputSchema,
});

export type TopicType = z.infer<typeof TopicTypeSchema>;
export type GenerateTopicRequest = z.infer<typeof GenerateTopicRequestSchema>;
export type GenerateTopicConstraints = z.infer<typeof GenerateTopicConstraintsSchema>;
export type TopicPromptInput = z.infer<typeof TopicPromptInputSchema>;
export type GenerateQuizRequest = z.infer<typeof GenerateQuizRequestSchema>;
