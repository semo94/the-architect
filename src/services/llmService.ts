import Constants from 'expo-constants';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { QuizQuestion, Topic, TopicType } from '../types';
import { promptTemplates } from '../utils/prompts';
import sseClient from './sseService';

// LLM Provider types
type LLMProvider = 'anthropic' | 'openai' | 'custom';

interface LLMConfig {
  provider: LLMProvider;
  apiKey: string;
  apiUrl: string;
  model: string;
}

interface LLMMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ProviderHeaders {
  'Content-Type': string;
  [key: string]: string;
}

// Validation schemas

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



// Schema for LLM response (flat format for better streaming)
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
  private config: LLMConfig;

  constructor() {
    const provider = (Constants.expoConfig?.extra?.llmProvider || 'anthropic') as LLMProvider;
    const apiKey = Constants.expoConfig?.extra?.llmApiKey;
    const apiUrl = Constants.expoConfig?.extra?.llmApiUrl;
    const model = Constants.expoConfig?.extra?.llmModel;

    if (!apiKey) {
      throw new Error('LLM API key not configured');
    }

    this.config = {
      provider,
      apiKey,
      apiUrl,
      model,
    };
  }

  /**
   * Extracts JSON from LLM response text that may contain markdown code blocks
   */
  private extractJSON(text: string): any {
    // Remove markdown code block markers if present
    let cleanedText = text.trim();

    // Check for ```json ... ``` format
    const jsonBlockMatch = cleanedText.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonBlockMatch) {
      cleanedText = jsonBlockMatch[1].trim();
    } else {
      // Check for ``` ... ``` format
      const codeBlockMatch = cleanedText.match(/```\s*([\s\S]*?)\s*```/);
      if (codeBlockMatch) {
        cleanedText = codeBlockMatch[1].trim();
      }
    }

    try {
      return JSON.parse(cleanedText);
    } catch (error) {
      throw new Error(`Failed to parse LLM response as JSON: ${error instanceof Error ? error.message : 'Unknown error'}\n\nResponse text:\n${text}`);
    }
  }

  /**
   * Makes API call based on configured provider
   */
  private async callLLM(prompt: string): Promise<any> {
    const message: LLMMessage = {
      role: 'user',
      content: prompt,
    };

    const response = await this.makeProviderRequest([message]);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`LLM API error (${this.config.provider}): ${response.statusText}\n${errorText}`);
    }

    const data = await response.json();
    const textContent = this.extractTextContent(data);
    return this.extractJSON(textContent);
  }

  /**
   * Streaming API call with progressive content updates
   * Falls back to non-streaming if streaming fails
   * @param prompt The prompt to send
   * @param onProgress Callback for partial content (receives accumulated text)
   * @returns Final parsed JSON result
   */
  async callLLMStream(
    prompt: string,
    onProgress?: (partialText: string) => void
  ): Promise<any> {
    const message: LLMMessage = {
      role: 'user',
      content: prompt,
    };

    const proxyUrl = this.getProxyUrl();

    // Use proxy URL for web (CORS), or direct API URL for mobile
    const streamUrl = proxyUrl ? `${proxyUrl}/api/llm/stream` : this.config.apiUrl;
    const useProxy = !!proxyUrl;

    // Only catch synchronous setup errors for fallback
    let body;
    try {
      body = this.getRequestBody([message], true); // true = enable streaming
    } catch (setupError) {
      console.warn('[LLM] Streaming setup failed, falling back to non-streaming:', setupError);
      return this.callLLM(prompt);
    }

    // Don't wrap Promise in try-catch - let rejections propagate to caller
    let accumulatedText = '';
    return new Promise((resolve, reject) => {
      console.log('[LLM] Starting SSE stream...');
      sseClient.connect(
        streamUrl,
        body,
        {
          onMessage: (data) => {
            if (data.text) {
              accumulatedText += data.text;
              console.log('[LLM] Stream chunk received, accumulated length:', accumulatedText.length);
              onProgress?.(accumulatedText);
            }
          },
          onError: (error) => {
            console.error('[LLM] Stream error:', error);
            reject(error);
          },
          onComplete: () => {
            console.log('[LLM] Stream complete, total text length:', accumulatedText.length);
            try {
              const parsed = this.extractJSON(accumulatedText);
              resolve(parsed);
            } catch (error) {
              reject(error);
            }
          },
        },
        useProxy // Pass flag to indicate if using proxy or direct API
      );
    });
  }

  /**
   * Helper methods for provider configuration
   */
  private getProxyUrl(): string | null {
    // EXPO_PUBLIC_ variables are exposed to web bundle safely
    const proxyUrl = (Constants.expoConfig?.extra as any)?.llmProxyUrl || process.env.EXPO_PUBLIC_LLM_PROXY_URL;
    return typeof proxyUrl === 'string' && proxyUrl.length > 0 ? proxyUrl : null;
  }

  private isWeb(): boolean {
    // expo-constants doesn't expose platform in a typed way; use navigator if present
    return typeof navigator !== 'undefined' && typeof window !== 'undefined';
  }

  private getEffectiveUrl(proxyUrl: string | null): string {
    return proxyUrl ? `${proxyUrl}/api/llm` : this.config.apiUrl;
  }

  private getProviderHeaders(proxyUrl: string | null): ProviderHeaders {
    const baseHeaders: ProviderHeaders = { 'Content-Type': 'application/json' };

    if (proxyUrl) {
      return baseHeaders;
    }

    switch (this.config.provider) {
      case 'anthropic':
        return {
          ...baseHeaders,
          'x-api-key': this.config.apiKey,
          'anthropic-version': Constants.expoConfig?.extra?.llmAnthropicVersion || '2023-06-01',
        };
      case 'openai':
      case 'custom':
        return {
          ...baseHeaders,
          'Authorization': `Bearer ${this.config.apiKey}`,
        };
    }
  }

  private getRequestBody(messages: LLMMessage[], stream: boolean = false): any {
    const body: any = {
      model: this.config.model,
      messages,
      temperature: Constants.expoConfig?.extra?.llmTemperature || 0.7,
      max_tokens: Constants.expoConfig?.extra?.llmMaxTokens || 4000,
    };

    if (stream) {
      body.stream = true;
    }

    return body;
  }

  /**
   * Unified provider API call
   */
  private async makeProviderRequest(messages: LLMMessage[]): Promise<Response> {
    const proxyUrl = this.isWeb() ? this.getProxyUrl() : null;
    const url = this.getEffectiveUrl(proxyUrl);
    const headers = this.getProviderHeaders(proxyUrl);
    const body = this.getRequestBody(messages);

    return fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
  }

  /**
   * Extracts text content from provider-specific response format
   */
  private extractTextContent(data: any): string {
    // Anthropic format: { content: [{ type: "text", text: "..." }] }
    const anthropicText = data.content?.[0]?.text;
    if (anthropicText) {
      return anthropicText;
    }

    // OpenAI format: { choices: [{ message: { content: "..." } }] }
    const openaiText = data.choices?.[0]?.message?.content;
    if (openaiText) {
      return openaiText;
    }

    throw new Error(`Unable to extract text content from ${this.config.provider} response format`);
  }

  /**
   * Unified topic generation for both Surprise Me and Guide Me flows
   */
  async generateTopic(
    mode: 'surprise' | 'guided',
    alreadyDiscovered: string[],
    dismissed: string[],
    categorySchema: any,
    constraints?: {
      category: string;
      subcategory: string;
      topicType: TopicType;
      learningGoal: string;
    },
    onProgress?: (partialText: string) => void
  ): Promise<Topic> {
    const prompt = promptTemplates.generateTopic(
      mode,
      alreadyDiscovered,
      dismissed,
      categorySchema,
      constraints
    );

    const result = onProgress
      ? await this.callLLMStream(prompt, onProgress)
      : await this.callLLM(prompt);

    // Validate using flat schema
    const validated = TopicContentSchema.parse(result);

    // Transform flat format to nested structure for app
    return {
      id: uuidv4(),
      name: validated.name,
      topicType: validated.topicType as any, // Will be validated by Topic type
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

  // Backward compatibility wrappers
  async generateSurpriseTopic(
    alreadyDiscovered: string[],
    dismissed: string[],
    categorySchema: any,
    onProgress?: (partialText: string) => void
  ): Promise<Topic> {
    return this.generateTopic(
      'surprise',
      alreadyDiscovered,
      dismissed,
      categorySchema,
      undefined,
      onProgress
    );
  }

  async generateGuidedTopic(
    constraints: {
      category: string;
      subcategory: string;
      topicType: TopicType;
      learningGoal: string;
    },
    alreadyDiscovered: string[],
    categorySchema: any,
    onProgress?: (partialText: string) => void
  ): Promise<Topic> {
    return this.generateTopic(
      'guided',
      alreadyDiscovered,
      [],
      categorySchema,
      constraints,
      onProgress
    );
  }

  async generateQuizQuestions(
    topic: Topic,
    onProgress?: (partialText: string) => void
  ): Promise<QuizQuestion[]> {
    const prompt = promptTemplates.generateQuizQuestions(topic);

    // Pass through the onProgress callback directly - the hook will handle transformation
    const result = onProgress
      ? await this.callLLMStream(prompt, onProgress)
      : await this.callLLM(prompt);

    // Validate using flat schema, then transform to array format for final result
    const validated = QuizQuestionsSchema.parse(result);
    return validated.questions.map(q => ({
      question: q.question,
      options: [q.option_0, q.option_1, q.option_2, q.option_3],
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
    }));
  }

  /**
   * Cancel any ongoing streaming request
   */
  cancelStream() {
    console.log('[LLM] Cancelling stream...');
    sseClient.cancel();
  }

  /**
   * Check if there's an active streaming request
   */
  isStreaming(): boolean {
    return sseClient.isActive();
  }

}

export default new LLMService();