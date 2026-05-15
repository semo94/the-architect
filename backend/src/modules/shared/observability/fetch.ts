import { SpanStatusCode, trace } from '@opentelemetry/api';
import type { FastifyBaseLogger } from 'fastify';
import type { Logger } from 'pino';
import { urlWithoutQueryForLog } from '../utils/http-log.utils.js';

export type OutboundLogger = Logger | FastifyBaseLogger;

function safeHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return 'invalid-url';
  }
}

/**
 * Wraps `fetch` with an outbound HTTP span and structured Pino logs (no bodies or secrets).
 */
export async function observeOutboundFetch(
  label: string,
  url: string,
  init: RequestInit | undefined,
  log: OutboundLogger
): Promise<Response> {
  const method = init?.method ?? 'GET';
  const host = safeHost(url);
  const started = Date.now();
  const activeSpan = trace.getActiveSpan();

  activeSpan?.setAttributes({
    'breadthwise.downstream.label': label,
    'breadthwise.downstream.host': host,
    'breadthwise.downstream.method': method,
  });

  try {
    const response = await fetch(url, init);
    const durationMs = Date.now() - started;
    activeSpan?.setAttributes({
      'breadthwise.downstream.status_code': response.status,
      'breadthwise.downstream.duration_ms': durationMs,
    });
    if (!response.ok) {
      activeSpan?.setStatus({
        code: SpanStatusCode.ERROR,
        message: `HTTP ${response.status}`,
      });
    }

    log.debug(
      {
        component: 'downstream_http',
        downstreamLabel: label,
        method,
        host,
        url: urlWithoutQueryForLog(url),
        status: response.status,
        durationMs,
      },
      'downstream response'
    );

    return response;
  } catch (err) {
    const durationMs = Date.now() - started;
    activeSpan?.recordException(err as Error);
    activeSpan?.setStatus({
      code: SpanStatusCode.ERROR,
      message: err instanceof Error ? err.message : String(err),
    });
    log.error(
      {
        err,
        component: 'downstream_http',
        downstreamLabel: label,
        method,
        host,
        url: urlWithoutQueryForLog(url),
        durationMs,
      },
      'downstream request failed'
    );
    throw err;
  }
}
