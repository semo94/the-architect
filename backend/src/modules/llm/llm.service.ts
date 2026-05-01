import { AppError } from '../shared/middleware/error-handler.js';
import { llmProvider } from './llm.provider.js';
import type { GenerateQuizRequest, GenerateTopicRequest, TopicPromptInput } from './llm.schemas.js';
import { promptTemplates } from './prompts.js';

export interface InsightGenerationItem {
  targetName: string;
  relationKind: string;
}

export interface InsightGenerationResult {
  groups: InsightGenerationItem[];
}

export interface JudgeResolutionItem {
  candidateName: string;
  contextHint?: { sourceName: string; sourceCategory?: string } | null;
  candidates: Array<{ topicId: string; primaryName: string; aliases: string[] }>;
}

export type JudgeResolutionResult = { match: string }; // topicId or 'NEW'

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
    const { system, user } = promptTemplates.generateTopic(
      requestBody.mode,
      requestBody.alreadyDiscovered,
      requestBody.dismissed,
      requestBody.constraints,
      requestBody.topicName
    );

    await this.streamPrompt(user, system, callbacks, signal);
  }

  async generateQuizStream(
    requestBody: GenerateQuizRequest,
    callbacks: StreamCallbacks,
    signal?: AbortSignal
  ): Promise<void> {
    const { system, user } = promptTemplates.generateQuizQuestions(requestBody.topic);
    await this.streamPrompt(user, system, callbacks, signal);
  }

  async generateInsights(topic: TopicPromptInput): Promise<InsightGenerationResult> {
    const { system, user } = promptTemplates.generateInsights(topic);

    let accumulatedText = '';
    await this.streamPrompt(user, system, {
      onChunk: (text) => { accumulatedText += text; },
      onComplete: () => {},
    });

    const clean = accumulatedText.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    const parsed = JSON.parse(clean) as { groups: Array<{ targetName: string; relationKind: string }> };

    return {
      groups: (parsed.groups ?? []).map((item) => ({
        targetName: (item.targetName ?? '').trim(),
        relationKind: (item.relationKind ?? '').trim().toUpperCase(),
      })).filter((item) => item.targetName.length > 0 && item.relationKind.length > 0),
    };
  }

  /**
   * Resolve each candidate to one of the provided existing-topic candidates or
   * to 'NEW'. Returns one result per input item, in the same order. On any
   * parse / shape mismatch, falls back to 'NEW' for safety (a missed match
   * costs a duplicate, a wrong match corrupts the graph).
   */
  async judgeEntityResolution(items: JudgeResolutionItem[]): Promise<JudgeResolutionResult[]> {
    if (items.length === 0) return [];

    const { system, user } = promptTemplates.judgeEntityResolution(items);

    let accumulatedText = '';
    await this.streamPrompt(user, system, {
      onChunk: (text) => { accumulatedText += text; },
      onComplete: () => {},
    });

    const fallback: JudgeResolutionResult[] = items.map(() => ({ match: 'NEW' }));

    const clean = accumulatedText.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    let parsed: { results?: Array<{ match?: unknown }> };
    try {
      parsed = JSON.parse(clean);
    } catch {
      return fallback;
    }

    const results = Array.isArray(parsed.results) ? parsed.results : null;
    if (!results || results.length !== items.length) {
      return fallback;
    }

    return results.map((row) => {
      const m = typeof row?.match === 'string' ? row.match.trim() : '';
      if (!m || m.toUpperCase() === 'NEW') return { match: 'NEW' };
      return { match: m };
    });
  }

  private async streamPrompt(prompt: string, systemPrompt: string, callbacks: StreamCallbacks, signal?: AbortSignal): Promise<void> {
    const upstream = await llmProvider.streamCompletion({ prompt, systemPrompt, signal });

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

        let parsed: { type?: string; delta?: { text?: string }; choices?: { delta?: { content?: string } }[] };
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
