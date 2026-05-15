import { env } from '../config/env.js';
import { observeOutboundFetch } from '../observability/fetch.js';
import { getModuleLogger } from '../observability/logger.js';
import { truncateForLog } from '../utils/string-log.utils.js';

class EmbeddingService {
  /**
   * Embeds an array of texts in a single batched API call.
   * Returns one embedding vector per input text, in the same order.
   */
  async embedTexts(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    let response: Response;
    try {
      response = await observeOutboundFetch(
        'openai_embeddings',
        env.OPENAI_EMBEDDING_API_URL,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${env.OPENAI_EMBEDDING_KEY}`,
          },
          body: JSON.stringify({
            model: env.OPENAI_EMBEDDING_MODEL,
            input: texts,
            dimensions: env.OPENAI_EMBEDDING_DIMENSIONS,
          }),
          signal: controller.signal,
        },
        getModuleLogger('embedding.service')
      );
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      const snippet = truncateForLog(body, 400);
      throw new Error(`OpenAI embeddings API error ${response.status}: ${snippet}`);
    }

    const data = await response.json() as {
      data: Array<{ index: number; embedding: number[] }>;
    };

    // Sort by index to guarantee same order as input
    const sorted = data.data.slice().sort((a, b) => a.index - b.index);
    return sorted.map((d) => d.embedding);
  }

  /**
   * Embeds a single text. Delegates to embedTexts.
   */
  async embedText(text: string): Promise<number[]> {
    const results = await this.embedTexts([text]);
    return results[0];
  }
}

export const embeddingService = new EmbeddingService();
