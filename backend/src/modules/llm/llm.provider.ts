import { env } from '../shared/config/env.js';

interface StreamOptions {
  prompt: string;
  signal?: AbortSignal;
}

export class LLMProvider {
  private get provider(): 'anthropic' | 'openai' {
    return env.LLM_PROVIDER;
  }

  private get apiUrl(): string {
    if (env.LLM_API_URL) {
      return env.LLM_API_URL;
    }

    if (this.provider === 'anthropic') {
      return 'https://api.anthropic.com/v1/messages';
    }

    return 'https://api.openai.com/v1/chat/completions';
  }

  async streamCompletion({ prompt, signal }: StreamOptions): Promise<Response> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    let payload: Record<string, unknown>;

    if (this.provider === 'anthropic') {
      headers['x-api-key'] = env.LLM_API_KEY;
      headers['anthropic-version'] = env.LLM_ANTHROPIC_VERSION;

      payload = {
        model: env.LLM_MODEL,
        max_tokens: env.LLM_MAX_TOKENS,
        temperature: env.LLM_TEMPERATURE,
        messages: [{ role: 'user', content: prompt }],
        stream: true,
      };
    } else {
      headers.Authorization = `Bearer ${env.LLM_API_KEY}`;

      payload = {
        model: env.LLM_MODEL,
        max_tokens: env.LLM_MAX_TOKENS,
        temperature: env.LLM_TEMPERATURE,
        messages: [{ role: 'user', content: prompt }],
        stream: true,
      };
    }

    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal,
    });

    return response;
  }
}

export const llmProvider = new LLMProvider();
