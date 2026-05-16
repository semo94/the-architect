import { normalizeUptraceDsn } from './uptrace-dsn.js';

const UTRACE_OTLP_LOGS_ENDPOINT = 'https://api.uptrace.dev/v1/logs';

/** Configure OTLP log exporter env vars for pino-opentelemetry-transport / otlp-logger. */
export function configureUptraceLogExporterEnv(): string | undefined {
  const dsn = normalizeUptraceDsn(process.env.UPTRACE_DSN);
  if (!dsn) {
    return undefined;
  }

  if (!process.env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT) {
    process.env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT = UTRACE_OTLP_LOGS_ENDPOINT;
  }

  if (!process.env.OTEL_EXPORTER_OTLP_HEADERS) {
    process.env.OTEL_EXPORTER_OTLP_HEADERS = `uptrace-dsn=${dsn}`;
  }

  return dsn;
}

export function uptraceLogResourceAttributes(): Record<string, string> {
  return {
    'service.name': process.env.OTEL_SERVICE_NAME ?? 'breadthwise-backend',
    'deployment.environment': process.env.NODE_ENV ?? 'production',
  };
}
