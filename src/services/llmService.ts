import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { QuizQuestion, Topic, TopicType } from '../types';
import { authService } from './authService';
import sseClient, { SSEError } from './sseService';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

interface TopicConstraints {
  category: string;
  subcategory: string;
  topicType: TopicType;
  learningGoal: string;
}

// Flat schema for streaming-optimized LLM responses
const TopicContentSchema = z.object({
  name: z.string(),
  topicType: z.string(),
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
});

const QuizQuestionsSchema = z.object({
  questions: z.array(
    z.object({
      question: z.string(),
      option_0: z.string(),
      option_1: z.string(),
      option_2: z.string(),
      option_3: z.string(),
      correctAnswer: z.number().min(0).max(3),
      explanation: z.string(),
    })
  ).length(4),
});

class LLMService {
  /**
   * Extracts JSON from LLM response text that may contain markdown code blocks.
   */
  private extractJSON(text: string): any {
    let cleanedText = text.trim();

    const jsonBlockMatch = cleanedText.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonBlockMatch) {
      cleanedText = jsonBlockMatch[1].trim();
    } else {
      const codeBlockMatch = cleanedText.match(/```\s*([\s\S]*?)\s*```/);
      if (codeBlockMatch) {
        cleanedText = codeBlockMatch[1].trim();
      }
    }

    try {
      return JSON.parse(cleanedText);
    } catch (error) {
      throw new Error(
        `Failed to parse LLM response as JSON: ${error instanceof Error ? error.message : 'Unknown error'}\n\nResponse text:\n${text}`
      );
    }
  }

  private async getAuthHeaders(): Promise<Record<string, string>> {
    const token = await authService.getAccessToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    // On web, cookies are sent automatically — no explicit token needed.
    return headers;
  }

  private doStreamRequest(
    endpoint: string,
    body: Record<string, unknown>,
    headers: Record<string, string>,
    onProgress?: (partialText: string) => void
  ): Promise<any> {
    let accumulatedText = '';

    return new Promise((resolve, reject) => {
      sseClient.connect(
        `${API_URL}${endpoint}`,
        body,
        {
          onMessage: (data) => {
            if (!data?.text) {
              return;
            }

            accumulatedText += data.text;
            onProgress?.(accumulatedText);
          },
          onError: (error) => {
            reject(error);
          },
          onComplete: () => {
            try {
              resolve(this.extractJSON(accumulatedText));
            } catch (error) {
              reject(error);
            }
          },
        },
        {
          headers,
          credentials: 'include',
        }
      );
    });
  }

  private async streamBackendRequest(
    endpoint: string,
    body: Record<string, unknown>,
    onProgress?: (partialText: string) => void
  ): Promise<any> {
    const headers = await this.getAuthHeaders();

    try {
      return await this.doStreamRequest(endpoint, body, headers, onProgress);
    } catch (error) {
      // On 401, attempt a token refresh and retry once.
      if (error instanceof SSEError && error.statusCode === 401) {
        try {
          const newToken = await authService.refreshAccessToken();
          if (newToken) {
            headers.Authorization = `Bearer ${newToken}`;
          }
        } catch {
          throw error;
        }
        return this.doStreamRequest(endpoint, body, headers, onProgress);
      }
      throw error;
    }
  }

  async generateTopic(
    mode: 'surprise' | 'guided',
    alreadyDiscovered: string[],
    dismissed: string[],
    constraints?: TopicConstraints,
    onProgress?: (partialText: string) => void
  ): Promise<Topic> {
    const payload = {
      mode,
      alreadyDiscovered,
      dismissed,
      constraints,
    };

    const result = await this.streamBackendRequest('/llm/topic', payload, onProgress);
    const validated = TopicContentSchema.parse(result);

    return {
      id: uuidv4(),
      name: validated.name,
      topicType: validated.topicType as TopicType,
      category: validated.category,
      subcategory: validated.subcategory,
      content: {
        what: validated.what,
        why: validated.why,
        pros: [
          validated.pro_0,
          validated.pro_1,
          validated.pro_2,
          validated.pro_3,
          validated.pro_4,
        ],
        cons: [
          validated.con_0,
          validated.con_1,
          validated.con_2,
          validated.con_3,
          validated.con_4,
        ],
        compareToSimilar: [
          {
            topic: validated.compare_0_tech,
            comparison: validated.compare_0_text,
          },
          {
            topic: validated.compare_1_tech,
            comparison: validated.compare_1_text,
          },
        ],
      },
      status: 'discovered',
      discoveryMethod: mode,
      discoveredAt: new Date().toISOString(),
      learnedAt: null,
    };
  }

  async generateSurpriseTopic(
    alreadyDiscovered: string[],
    dismissed: string[],
    onProgress?: (partialText: string) => void
  ): Promise<Topic> {
    return this.generateTopic('surprise', alreadyDiscovered, dismissed, undefined, onProgress);
  }

  async generateGuidedTopic(
    constraints: TopicConstraints,
    alreadyDiscovered: string[],
    onProgress?: (partialText: string) => void
  ): Promise<Topic> {
    return this.generateTopic('guided', alreadyDiscovered, [], constraints, onProgress);
  }

  async generateQuizQuestions(topic: Topic, onProgress?: (partialText: string) => void): Promise<QuizQuestion[]> {
    const promptTopic = {
      name: topic.name,
      topicType: topic.topicType,
      category: topic.category,
      subcategory: topic.subcategory,
      content: topic.content,
    };

    const result = await this.streamBackendRequest(
      '/llm/quiz',
      { topic: promptTopic },
      onProgress
    );

    const validated = QuizQuestionsSchema.parse(result);
    return validated.questions.map((q) => ({
      question: q.question,
      options: [q.option_0, q.option_1, q.option_2, q.option_3],
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
    }));
  }

  cancelStream() {
    sseClient.cancel();
  }

  isStreaming(): boolean {
    return sseClient.isActive();
  }
}

export default new LLMService();
