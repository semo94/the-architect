/**
 * Cross-platform SSE (Server-Sent Events) client
 * Works on Web, iOS, and Android
 */

// Use expo/fetch for native platforms which supports ReadableStream
let expoFetch: typeof fetch | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  expoFetch = require('expo/fetch').fetch;
} catch {
  // Fallback to global fetch on web or if expo/fetch not available
}

export class SSEError extends Error {
  constructor(message: string, public statusCode: number) {
    super(message);
    this.name = 'SSEError';
  }
}

interface SSECallbacks {
  onMessage: (data: any) => void;
  onError?: (error: Error) => void;
  onComplete?: () => void;
}

interface SSERequestOptions {
  headers?: Record<string, string>;
  credentials?: RequestCredentials;
}

class SSEClient {
  private abortController: AbortController | null = null;
  /**
   * Connect to SSE stream and handle messages
   * @param url The streaming endpoint URL
   * @param body The request body
   * @param callbacks Callbacks for messages, errors, and completion
   * @param options Optional request options like auth headers and credentials
   */
  async connect(
    url: string,
    body: any,
    callbacks: SSECallbacks,
    options: SSERequestOptions = {}
  ): Promise<() => void> {
    this.abortController = new AbortController();

    // Use fetch streaming for all platforms (expo/fetch supports streaming)
    return this.connectFetch(url, body, callbacks, options);
  }

  /**
   * Fetch-based streaming implementation (works on all platforms via expo/fetch)
   */
  private connectFetch(
    url: string,
    body: any,
    callbacks: SSECallbacks,
    options: SSERequestOptions
  ): () => void {
    const signal = this.abortController!.signal;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };

    // Use expo/fetch on native for streaming support, global fetch on web
    const fetchFn = expoFetch || fetch;

    fetchFn(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal,
      credentials: options.credentials,
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new SSEError(`SSE connection failed: ${response.statusText}`, response.status);
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
                  }

                  callbacks.onMessage(parsed);
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
   * Cancel ongoing stream
   */
  cancel() {
    console.log('[SSE] Cancelling stream...');
    this.abortController?.abort();
    this.abortController = null;
  }

  /**
   * Check if there's an active stream
   */
  isActive(): boolean {
    return this.abortController !== null;
  }
}

export default new SSEClient();