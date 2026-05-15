const DEFAULT_MESSAGE_MAX = 800;
const DEFAULT_STACK_MAX = 4000;

/**
 * Serialize an error for structured logs without echoing unbounded upstream
 * bodies (e.g. LLM or OpenAI error payloads) in a single `message` field.
 */
export function errorForStructuredLog(
  error: unknown,
  messageMax = DEFAULT_MESSAGE_MAX,
  stackMax = DEFAULT_STACK_MAX
): Record<string, unknown> {
  if (error instanceof Error) {
    const anyErr = error as Error & {
      statusCode?: number;
      code?: string | number;
      validation?: unknown;
    };
    const msg = anyErr.message ?? '';
    let validationPreview: string | undefined;
    if (anyErr.validation !== undefined) {
      try {
        const s = JSON.stringify(anyErr.validation);
        validationPreview = s.length > 2000 ? `${s.slice(0, 2000)}…` : s;
      } catch {
        validationPreview = '[unserializable]';
      }
    }
    return {
      errName: anyErr.name,
      errMessage:
        msg.length > messageMax ? `${msg.slice(0, messageMax)}…` : msg,
      errStack:
        typeof anyErr.stack === 'string' && anyErr.stack.length > stackMax
          ? `${anyErr.stack.slice(0, stackMax)}…`
          : anyErr.stack,
      statusCode: typeof anyErr.statusCode === 'number' ? anyErr.statusCode : undefined,
      code: anyErr.code,
      validationPreview,
    };
  }
  return {
    errName: 'non_error',
    errMessage: String(error).slice(0, messageMax),
  };
}
