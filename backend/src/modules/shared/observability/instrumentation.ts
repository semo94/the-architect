import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { configureOpentelemetry } from '@uptrace/node';
import { getRootLogger } from './logger.js';

let sdk: ReturnType<typeof configureOpentelemetry> | undefined;

function startUptrace(): void {
  const dsn = process.env.UPTRACE_DSN;
  if (!dsn) {
    return;
  }

  try {
    sdk = configureOpentelemetry({
      dsn,
      serviceName: process.env.OTEL_SERVICE_NAME ?? 'breadthwise-backend',
      deploymentEnvironment: process.env.NODE_ENV,
      instrumentations: [
        // HTTP/Undici: redact sensitive query params; keep header lists empty so bearer tokens are not copied to span attributes. Spot-check exported spans in Uptrace after deploy.
        getNodeAutoInstrumentations({
          '@opentelemetry/instrumentation-fs': { enabled: false },
          // Avoid mapping auth/sensitive headers to spans; redact OAuth-style query params on URLs.
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
    getRootLogger().info({ component: 'observability' }, 'OpenTelemetry started (Uptrace)');
  } catch (err) {
    getRootLogger().error({ err, component: 'observability' }, 'Failed to start OpenTelemetry (Uptrace)');
    sdk = undefined;
  }
}

startUptrace();

const log = getRootLogger();

process.on('unhandledRejection', (reason: unknown) => {
  log.error({ err: reason, component: 'process' }, 'unhandledRejection');
});

process.on('uncaughtException', (err: Error) => {
  log.fatal({ err, component: 'process' }, 'uncaughtException');
  process.exit(1);
});

export async function shutdownInstrumentation(): Promise<void> {
  if (!sdk) {
    return;
  }
  await sdk.shutdown();
  sdk = undefined;
}
