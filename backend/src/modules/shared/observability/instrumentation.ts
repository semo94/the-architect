import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { configureOpentelemetry } from '@uptrace/node';
import { normalizeUptraceDsn } from './uptrace-dsn.js';
import { configureUptraceLogExporterEnv } from './uptrace-log-export.js';

let sdk: ReturnType<typeof configureOpentelemetry> | undefined;

/** Start Uptrace traces/metrics. Call from instrumentation-preload before other app imports. */
export function initUptraceInstrumentation(): void {
  const dsn = normalizeUptraceDsn(process.env.UPTRACE_DSN);
  if (!dsn) {
    return;
  }

  configureUptraceLogExporterEnv();

  try {
    sdk = configureOpentelemetry({
      dsn,
      serviceName: process.env.OTEL_SERVICE_NAME ?? 'breadthwise-backend',
      deploymentEnvironment: process.env.NODE_ENV,
      instrumentations: [
        // HTTP/Undici client spans are auto-instrumented here.
        // `observeOutboundFetch` enriches/logs around those spans and does not create nested manual spans.
        // Keep header lists empty so bearer tokens are never copied to span attributes.
        getNodeAutoInstrumentations({
          '@opentelemetry/instrumentation-fs': { enabled: false },
          // Logs export via pino-opentelemetry-transport (see logger.ts), not instrumentation-pino.
          '@opentelemetry/instrumentation-pino': { enabled: false },
          '@opentelemetry/instrumentation-http': {
            redactedQueryParams: [
              'code',
              'state',
              'access_token',
              'refresh_token',
              'token',
              'client_secret',
              'id_token',
              'session_state',
            ],
            headersToSpanAttributes: {
              client: { requestHeaders: [], responseHeaders: [] },
              server: { requestHeaders: [], responseHeaders: [] },
            },
          },
          '@opentelemetry/instrumentation-undici': {
            headersToSpanAttributes: {
              requestHeaders: [],
              responseHeaders: [],
            },
          },
        }),
      ],
    });

    sdk.start();

    void import('./logger.js').then(({ getRootLogger }) => {
      getRootLogger().info({ component: 'observability' }, 'OpenTelemetry started (Uptrace)');
    });
  } catch (err) {
    process.stderr.write(
      `Failed to start OpenTelemetry (Uptrace): ${err instanceof Error ? err.message : String(err)}\n`
    );
    sdk = undefined;
  }
}

process.on('unhandledRejection', (reason: unknown) => {
  void import('./logger.js').then(({ getRootLogger }) => {
    getRootLogger().error({ err: reason, component: 'process' }, 'unhandledRejection');
  });
});

process.on('uncaughtException', (err: Error) => {
  void import('./logger.js').then(({ getRootLogger }) => {
    getRootLogger().fatal({ err, component: 'process' }, 'uncaughtException');
  });
  process.exit(1);
});

export async function shutdownInstrumentation(): Promise<void> {
  if (!sdk) {
    return;
  }
  await sdk.shutdown();
  sdk = undefined;
}
