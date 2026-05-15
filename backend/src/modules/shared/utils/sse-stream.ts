import type { FastifyReply, FastifyRequest } from 'fastify';
import { startSseResponse } from './sse.utils.js';

type SseLlmWireCallbacks<TMeta> = {
  onChunk: (text: string) => void;
  onMeta: (meta: TMeta) => void;
  onComplete: () => void;
  onLearningResources?: (resources: { title: string; url: string }[]) => void;
};

type BaseSseLlmOptions = {
  request: FastifyRequest;
  reply: FastifyReply;
  sseBindings: Record<string, unknown>;
  /** Fields for the initial `sse stream opened` log line (defaults to `{}`). */
  openLogFields?: Record<string, unknown>;
  streamErrorLogMessage: string;
  userFallbackErrorMessage: string;
};

type SseLlmOptionsWithResources<TMeta> = BaseSseLlmOptions & {
  includeLearningResources: true;
  run: (
    callbacks: SseLlmWireCallbacks<TMeta> & {
      onLearningResources: (resources: { title: string; url: string }[]) => void;
    },
    signal: AbortSignal
  ) => Promise<void>;
};

type SseLlmOptionsWithoutResources<TMeta> = BaseSseLlmOptions & {
  includeLearningResources: false;
  run: (callbacks: Omit<SseLlmWireCallbacks<TMeta>, 'onLearningResources'>, signal: AbortSignal) => Promise<void>;
};

/**
 * Shared SSE wiring for LLM-backed streams (chunk / meta / optional learning resources / complete / errors).
 */
export async function runSseLlmStream<TMeta extends Record<string, unknown>>(
  options: SseLlmOptionsWithResources<TMeta> | SseLlmOptionsWithoutResources<TMeta>
): Promise<void> {
  const {
    request,
    reply,
    sseBindings,
    openLogFields,
    includeLearningResources,
    streamErrorLogMessage,
    userFallbackErrorMessage,
  } = options;

  startSseResponse(request, reply);

  const sseLog = request.log.child({
    component: 'sse',
    ...sseBindings,
  });

  sseLog.info(openLogFields ?? {}, 'sse stream opened');

  const abortController = new AbortController();
  let streamDone = false;
  let chunkCount = 0;

  reply.raw.on('close', () => {
    sseLog.info(
      { streamDone, chunkCount, reason: streamDone ? 'complete' : 'client_close' },
      'sse connection closed'
    );
    if (!streamDone) {
      abortController.abort();
    }
  });

  const onChunk = (text: string) => {
    chunkCount += 1;
    if (chunkCount === 1 || chunkCount % 50 === 0) {
      sseLog.debug({ chunkCount, deltaChars: text.length }, 'sse chunk');
    }
    reply.raw.write(`data: ${JSON.stringify({ text })}\n\n`);
  };

  const onMeta = (meta: TMeta) => {
    sseLog.info({ meta }, 'sse meta');
    reply.raw.write(`data: ${JSON.stringify({ type: 'meta', ...meta })}\n\n`);
  };

  const onLearningResources = (resources: { title: string; url: string }[]) => {
    sseLog.info({ resourceCount: resources.length }, 'sse learning resources');
    reply.raw.write(`data: ${JSON.stringify({ type: 'learningResources', resources })}\n\n`);
  };

  const onComplete = () => {
    streamDone = true;
    sseLog.info({ chunkCount }, 'sse stream completed');
    reply.raw.write('data: [DONE]\n\n');
    reply.raw.end();
  };

  try {
    if (includeLearningResources) {
      const { run: runWithResources } = options;
      await runWithResources(
        { onChunk, onMeta, onLearningResources, onComplete },
        abortController.signal
      );
    } else {
      const { run: runWithoutResources } = options;
      await runWithoutResources({ onChunk, onMeta, onComplete }, abortController.signal);
    }
  } catch (error) {
    streamDone = true;
    if (reply.raw.destroyed) {
      return;
    }

    const message = error instanceof Error ? error.message : userFallbackErrorMessage;
    sseLog.error({ err: error, chunkCount }, streamErrorLogMessage);
    reply.raw.write(`data: ${JSON.stringify({ error: message })}\n\n`);
    reply.raw.end();
  }
}
