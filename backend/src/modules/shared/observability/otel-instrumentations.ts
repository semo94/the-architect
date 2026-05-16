import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { UndiciInstrumentation } from '@opentelemetry/instrumentation-undici';
import type { Instrumentation } from '@opentelemetry/instrumentation';
import { shouldIgnoreLongRunningIncomingRequest } from './otel-long-http.js';

const redactedQueryParams = [
  'code',
  'state',
  'access_token',
  'refresh_token',
  'token',
  'client_secret',
  'id_token',
  'session_state',
];

/** Minimal instrumentations for Fastify + fetch/undici (Neon, GitHub, LLM). */
export function createOtelInstrumentations(): Instrumentation[] {
  return [
    new HttpInstrumentation({
      ignoreIncomingRequestHook: shouldIgnoreLongRunningIncomingRequest,
      redactedQueryParams,
      headersToSpanAttributes: {
        client: { requestHeaders: [], responseHeaders: [] },
        server: { requestHeaders: [], responseHeaders: [] },
      },
    }),
    new UndiciInstrumentation({
      headersToSpanAttributes: {
        requestHeaders: [],
        responseHeaders: [],
      },
    }),
  ];
}
