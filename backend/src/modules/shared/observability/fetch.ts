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
  const tracer = trace.getTracer('breadthwise-outbound');
  const method = init?.method ?? 'GET';
  const host = safeHost(url);
  const started = Date.now();

  return await tracer.startActiveSpan(`outbound.${label}`, async (span) => {
    span.setAttributes({
      'http.request.method': method,
      'server.address': host,
      'url.full': urlWithoutQueryForLog(url),
      'breadthwise.downstream.label': label,
    });

    try {
      const response = await fetch(url, init);
      const durationMs = Date.now() - started;
      span.setAttribute('http.response.status_code', response.status);
      if (!response.ok) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: `HTTP ${response.status}`,
        });
      }

      log.info(
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
      span.recordException(err as Error);
      span.setStatus({
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
    } finally {
      span.end();
    }
  });
}
