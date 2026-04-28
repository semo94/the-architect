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

export class SSEClient {
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
              this.abortController = null;
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
                  this.abortController = null;
                  callbacks.onComplete?.();
                  return;
                }

                try {
                  const parsed = JSON.parse(data);

                  if (parsed.error) {
                    this.abortController = null;
                    callbacks.onError?.(new Error(parsed.error));
                    return;
                  }

                  callbacks.onMessage(parsed);
                } catch {
                  this.abortController = null;
                  callbacks.onError?.(new Error(`Malformed SSE frame: ${data}`));
                  return;
                }
              }
            }
          }
        } catch (error) {
          if (signal.aborted) {
            // Intentional abort, not an error
            return;
          }
          this.abortController = null;
          callbacks.onError?.(error instanceof Error ? error : new Error(String(error)));
        }
      })
      .catch((error) => {
        if (signal.aborted) {
          // Intentional abort, not an error
          return;
        }
        this.abortController = null;
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
   * Connect to a GET-based SSE stream (e.g. topic events endpoint).
   * Must only be called on a dedicated SSEClient instance, never on the singleton.
   */
  connectGet(
    url: string,
    callbacks: SSECallbacks,
    options: SSERequestOptions = {}
  ): () => void {
    this.abortController = new AbortController();
    const signal = this.abortController.signal;

    const headers: Record<string, string> = {
      Accept: 'text/event-stream',
      ...(options.headers || {}),
    };

    const fetchFn = expoFetch || fetch;

    fetchFn(url, {
      method: 'GET',
      headers,
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
              this.abortController = null;
              callbacks.onComplete?.();
              break;
            }

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line.trim() === '') continue;

              if (line.startsWith('data: ')) {
                const data = line.slice(6);

                if (data === '[DONE]') {
                  this.abortController = null;
                  callbacks.onComplete?.();
                  return;
                }

                try {
                  const parsed = JSON.parse(data);

                  if (parsed.error) {
                    this.abortController = null;
                    callbacks.onError?.(new Error(parsed.error));
                    return;
                  }

                  callbacks.onMessage(parsed);
                } catch {
                  this.abortController = null;
                  callbacks.onError?.(new Error(`Malformed SSE frame: ${data}`));
                  return;
                }
              }
            }
          }
        } catch (error) {
          if (signal.aborted) return;
          this.abortController = null;
          callbacks.onError?.(error instanceof Error ? error : new Error(String(error)));
        }
      })
      .catch((error) => {
        if (signal.aborted) return;
        this.abortController = null;
        callbacks.onError?.(error instanceof Error ? error : new Error(String(error)));
      });

    return () => {
      this.abortController?.abort();
    };
  }

  /**
   * Check if there's an active stream
   */
  isActive(): boolean {
    return this.abortController !== null;
  }
}

// Singleton for POST streaming (topic discovery). connectGet intentionally
// excluded from the export type to prevent accidental singleton reuse for
// the events endpoint, which requires an isolated SSEClient instance.
const sseClient: Omit<InstanceType<typeof SSEClient>, 'connectGet'> = new SSEClient();
export default sseClient;