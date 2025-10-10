import { useState, useCallback, useRef } from 'react';
import { parseStreamingJson } from '../utils/streamingParser';
import { flushSync } from 'react-dom';

export interface UseStreamingDataOptions<T> {
  /**
   * Callback to check if partial data has minimum required fields to display
   */
  hasMinimumData?: (data: Partial<T>) => boolean;

  /**
   * Optional transform function to convert parsed data to expected format
   * Useful for transforming flat structures to nested ones during streaming
   */
  transformData?: (data: any) => Partial<T>;

  /**
   * Called when streaming starts showing partial data
   */
  onStreamingStart?: () => void;

  /**
   * Called when streaming completes with final data
   */
  onComplete?: (data: T) => void;

  /**
   * Called when an error occurs
   */
  onError?: (error: Error) => void;
}

export interface UseStreamingDataResult<T> {
  /**
   * Current partial data from the stream
   */
  partialData: Partial<T>;

  /**
   * Whether currently streaming (showing partial data)
   */
  isStreaming: boolean;

  /**
   * Whether loading (before minimum data is available)
   */
  isLoading: boolean;

  /**
   * Final complete data (null until streaming completes)
   */
  finalData: T | null;

  /**
   * Error if one occurred
   */
  error: Error | null;

  /**
   * Progress callback to pass to LLM service
   */
  onProgress: (partialText: string) => void;

  /**
   * Handler for when streaming completes
   */
  handleComplete: (data: T) => void;

  /**
   * Handler for errors
   */
  handleError: (error: Error) => void;

  /**
   * Reset the streaming state
   */
  reset: () => void;
}

/**
 * Reusable hook for managing streaming LLM data
 *
 * @example
 * ```ts
 * const { partialData, isStreaming, onProgress, handleComplete } = useStreamingData<Technology>({
 *   hasMinimumData: (data) => !!(data.name && data.category),
 *   onComplete: (tech) => setTechnology(tech)
 * });
 *
 * const tech = await llmService.generateTechnology(..., onProgress);
 * handleComplete(tech);
 * ```
 */
export function useStreamingData<T>(
  options: UseStreamingDataOptions<T> = {}
): UseStreamingDataResult<T> {
  const [partialData, setPartialData] = useState<Partial<T>>({});
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [finalData, setFinalData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const optionsRef = useRef(options);
  optionsRef.current = options;

  const onProgress = useCallback((partialText: string) => {
    console.log('[useStreamingData] onProgress called, text length:', partialText.length);

    // Force synchronous rendering to avoid React batching
    // This ensures UI updates after each chunk
    flushSync(() => {
      const parsed = parseStreamingJson<T>(partialText);
      console.log('[useStreamingData] Parsed data:', JSON.stringify(parsed).slice(0, 200));

      // Apply custom transform if provided
      const transformed = optionsRef.current.transformData
        ? optionsRef.current.transformData(parsed)
        : parsed;

      console.log('[useStreamingData] Transformed data:', JSON.stringify(transformed).slice(0, 200));
      setPartialData(transformed);

      // Check if we have minimum data to start showing UI
      // Use functional setState to avoid stale closure issues
      setIsStreaming(prevStreaming => {
        const hasMin = optionsRef.current.hasMinimumData?.(transformed);
        console.log('[useStreamingData] prevStreaming:', prevStreaming, 'hasMinimum:', hasMin);
        if (!prevStreaming && hasMin) {
          console.log('[useStreamingData] ✅ STREAMING STARTED!');
          setIsLoading(false);
          optionsRef.current.onStreamingStart?.();
          return true;
        }
        return prevStreaming;
      });
    });
  }, []);

  const handleComplete = useCallback((data: T) => {
    setFinalData(data);
    setPartialData(data);
    setIsStreaming(false);
    setIsLoading(false);
    optionsRef.current.onComplete?.(data);
  }, []);

  const handleError = useCallback((err: Error) => {
    setError(err);
    setIsLoading(false);
    setIsStreaming(false);
    optionsRef.current.onError?.(err);
  }, []);

  const reset = useCallback(() => {
    setPartialData({});
    setIsStreaming(false);
    setIsLoading(true);
    setFinalData(null);
    setError(null);
  }, []);

  return {
    partialData,
    isStreaming,
    isLoading,
    finalData,
    error,
    onProgress,
    handleComplete,
    handleError,
    reset,
  };
}
