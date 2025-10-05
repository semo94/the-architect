/**
 * Cross-platform SSE (Server-Sent Events) client
 * Works on Web, iOS, and Android
 */

// Use expo/fetch for native platforms which supports ReadableStream
let expoFetch: typeof fetch | null = null;
try {
  expoFetch = require('expo/fetch').fetch;
} catch (e) {
  // Fallback to global fetch on web or if expo/fetch not available
}

interface SSECallbacks {
  onMessage: (data: any) => void;
  onError?: (error: Error) => void;
  onComplete?: () => void;
}

class SSEClient {
  private abortController: AbortController | null = null;
  private isWeb: boolean;

  constructor() {
    this.isWeb = typeof navigator !== 'undefined' && typeof window !== 'undefined';
  }

  /**
   * Connect to SSE stream and handle messages
   * @param url The streaming endpoint URL
   * @param body The request body
   * @param callbacks Callbacks for messages, errors, and completion
   * @param useProxy Whether using proxy (normalized format) or direct API (provider-specific format)
   */
  async connect(
    url: string,
    body: any,
    callbacks: SSECallbacks,
    useProxy: boolean = true
  ): Promise<() => void> {
    this.abortController = new AbortController();

    // Use fetch streaming for all platforms (expo/fetch supports streaming)
    return this.connectFetch(url, body, callbacks, useProxy);
  }

  /**
   * Fetch-based streaming implementation (works on all platforms via expo/fetch)
   * @param useProxy Whether using proxy (normalized SSE format) or direct API (provider-specific streaming)
   */
  private connectFetch(
    url: string,
    body: any,
    callbacks: SSECallbacks,
    useProxy: boolean
  ): () => void {
    const signal = this.abortController!.signal;

    // Build headers - add auth headers if not using proxy
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (!useProxy) {
      // Direct API call - need to add authentication headers
      // Get from Constants (already available in the app)
      const Constants = require('expo-constants').default;
      const provider = Constants.expoConfig?.extra?.llmProvider || 'anthropic';
      const apiKey = Constants.expoConfig?.extra?.llmApiKey;

      if (provider === 'anthropic') {
        headers['x-api-key'] = apiKey;
        headers['anthropic-version'] = Constants.expoConfig?.extra?.llmAnthropicVersion || '2023-06-01';
      } else {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }
    }

    // Use expo/fetch on native for streaming support, global fetch on web
    const fetchFn = expoFetch || fetch;

    fetchFn(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`SSE connection failed: ${response.statusText}`);
        }

        if (!response.body) {
          throw new Error('Response body is null');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        try {
          while (true) {
            const { done, value } = await reader.read();

            if (done) {
              callbacks.onComplete?.();
              break;
            }

            // Decode chunk and add to buffer
            buffer += decoder.decode(value, { stream: true });

            // Process complete lines
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // Keep incomplete line in buffer

            for (const line of lines) {
              if (line.trim() === '') continue;

              // SSE format: "data: {json}"
              if (line.startsWith('data: ')) {
                const data = line.slice(6);

                if (data === '[DONE]') {
                  callbacks.onComplete?.();
                  break;
                }

                try {
                  const parsed = JSON.parse(data);

                  if (parsed.error) {
                    callbacks.onError?.(new Error(parsed.error));
                  } else {
                    // Handle different formats
                    if (useProxy) {
                      // Proxy format: { text: "..." }
                      callbacks.onMessage(parsed);
                    } else {
                      // Direct API format - provider specific
                      const text = this.extractStreamText(parsed);
                      if (text) {
                        callbacks.onMessage({ text });
                      }
                      // Check for completion events
                      if (this.isStreamComplete(parsed)) {
                        callbacks.onComplete?.();
                        break;
                      }
                    }
                  }
                } catch (e) {
                  console.error('[SSE] Failed to parse message:', e, data);
                }
              }
            }
          }
        } catch (error) {
          if (signal.aborted) {
            // Intentional abort, not an error
            return;
          }
          callbacks.onError?.(error instanceof Error ? error : new Error(String(error)));
        }
      })
      .catch((error) => {
        if (signal.aborted) {
          // Intentional abort, not an error
          return;
        }
        callbacks.onError?.(error instanceof Error ? error : new Error(String(error)));
      });

    // Return cancel function
    return () => {
      this.abortController?.abort();
    };
  }

  /**
   * Extract text from provider-specific streaming event
   */
  private extractStreamText(event: any): string | null {
    // Anthropic format: { type: "content_block_delta", delta: { text: "..." } }
    if (event.type === 'content_block_delta' && event.delta?.text) {
      return event.delta.text;
    }

    // OpenAI format: { choices: [{ delta: { content: "..." } }] }
    if (event.choices?.[0]?.delta?.content) {
      return event.choices[0].delta.content;
    }

    return null;
  }

  /**
   * Check if stream is complete based on provider-specific event
   */
  private isStreamComplete(event: any): boolean {
    // Anthropic: { type: "message_stop" }
    if (event.type === 'message_stop' || event.type === 'message_end') {
      return true;
    }

    // OpenAI: { choices: [{ finish_reason: "stop" }] }
    if (event.choices?.[0]?.finish_reason) {
      return true;
    }

    return false;
  }

  /**
   * Cancel ongoing stream
   */
  cancel() {
    this.abortController?.abort();
  }
}

export default new SSEClient();