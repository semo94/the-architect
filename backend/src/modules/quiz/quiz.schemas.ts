import { z } from 'zod';

export const GenerateQuizRequestSchema = z.object({
  topicId: z.string().uuid(),
});

export const QuizIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const ListQuizzesQuerySchema = z.object({
  topicId: z.string().uuid().optional(),
});

export const SubmitQuizAttemptRequestSchema = z.object({
  userAnswers: z.array(z.number().int().min(0).max(3)).length(4),
});

export const FlatQuizQuestionsSchema = z.object({
  questions: z.array(
    z.object({
      question: z.string(),
      option_0: z.string(),
      option_1: z.string(),
      option_2: z.string(),
      option_3: z.string(),
      correctAnswer: z.number().int().min(0).max(3),
      explanation: z.string(),
    })
  ).length(4),
});

export const QuizQuestionSchema = z.object({
  question: z.string(),
  options: z.array(z.string()).length(4),
  correctAnswer: z.number().int().min(0).max(3),
  explanation: z.string(),
});

export type GenerateQuizRequest = z.infer<typeof GenerateQuizRequestSchema>;
export type SubmitQuizAttemptRequest = z.infer<typeof SubmitQuizAttemptRequestSchema>;
export type FlatQuizQuestions = z.infer<typeof FlatQuizQuestionsSchema>;
export type QuizQuestion = z.infer<typeof QuizQuestionSchema>;
