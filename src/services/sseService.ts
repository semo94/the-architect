/**
 * Cross-platform SSE (Server-Sent Events) client
 * Works on Web, iOS, and Android
 */

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
   */
  async connect(
    url: string,
    body: any,
    callbacks: SSECallbacks
  ): Promise<() => void> {
    this.abortController = new AbortController();

    if (this.isWeb && typeof EventSource !== 'undefined') {
      // Use EventSource for web (better browser support)
      return this.connectEventSource(url, body, callbacks);
    } else {
      // Use fetch streaming for React Native
      return this.connectFetch(url, body, callbacks);
    }
  }

  /**
   * Web-based EventSource implementation
   */
  private connectEventSource(
    url: string,
    body: any,
    callbacks: SSECallbacks
  ): () => void {
    // EventSource doesn't support POST, so we use fetch with ReadableStream
    return this.connectFetch(url, body, callbacks);
  }

  /**
   * Fetch-based streaming implementation (works on all platforms)
   */
  private connectFetch(
    url: string,
    body: any,
    callbacks: SSECallbacks
  ): () => void {
    const signal = this.abortController!.signal;

    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
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
                    callbacks.onMessage(parsed);
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
   * Cancel ongoing stream
   */
  cancel() {
    this.abortController?.abort();
  }
}

export default new SSEClient();