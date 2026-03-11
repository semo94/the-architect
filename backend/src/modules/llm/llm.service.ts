import { AppError } from '../shared/middleware/error-handler.js';
import { llmProvider } from './llm.provider.js';
import type { GenerateQuizRequest, GenerateTopicRequest } from './llm.schemas.js';
import { promptTemplates } from './prompts.js';

interface StreamCallbacks {
  onChunk: (text: string) => void;
  onComplete: () => void;
}

export class LLMService {
  async generateTopicStream(
    requestBody: GenerateTopicRequest,
    callbacks: StreamCallbacks,
    signal?: AbortSignal
  ): Promise<void> {
    const prompt = promptTemplates.generateTopic(
      requestBody.mode,
      requestBody.alreadyDiscovered,
      requestBody.dismissed,
      requestBody.constraints
    );

    await this.streamPrompt(prompt, callbacks, signal);
  }

  async generateQuizStream(
    requestBody: GenerateQuizRequest,
    callbacks: StreamCallbacks,
    signal?: AbortSignal
  ): Promise<void> {
    const prompt = promptTemplates.generateQuizQuestions(requestBody.topic);
    await this.streamPrompt(prompt, callbacks, signal);
  }

  private async streamPrompt(prompt: string, callbacks: StreamCallbacks, signal?: AbortSignal): Promise<void> {
    const upstream = await llmProvider.streamCompletion({ prompt, signal });

    if (!upstream.ok) {
      const errorText = await upstream.text();
      throw new AppError(`LLM provider error: ${errorText || upstream.statusText}`, upstream.status);
    }

    if (!upstream.body) {
      throw new AppError('LLM provider returned empty response body', 502);
    }

    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        callbacks.onComplete();
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();

        if (!trimmed || !trimmed.startsWith('data:')) {
          continue;
        }

        const payload = trimmed.slice(5).trim();

        if (!payload || payload === '[DONE]') {
          continue;
        }

        let parsed: any;
        try {
          parsed = JSON.parse(payload);
        } catch {
          continue;
        }

        const anthropicText = parsed?.type === 'content_block_delta' ? parsed?.delta?.text : null;
        const openaiText = parsed?.choices?.[0]?.delta?.content;
        const text = anthropicText || openaiText;

        if (typeof text === 'string' && text.length > 0) {
          callbacks.onChunk(text);
        }
      }
    }
  }
}

export const llmService = new LLMService();
