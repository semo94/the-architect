/**
 * Apply conservative OpenTelemetry exporter defaults before the SDK starts.
 * Honors explicit process.env overrides (e.g. set in Render or .env).
 *
 * Trace batching is configured in otel-span-processor.ts (not @uptrace/node's hardcoded 1000-queue BSP).
 *
 * @see https://opentelemetry.io/docs/specs/otel/configuration/sdk-environment-variables/
 */

/** Staging / small instances: tighter buffers, simple span processor, no metric export. */
export function isOtelMemoryOptimized(): boolean {
  const flag = process.env.OTEL_MEMORY_OPTIMIZED?.toLowerCase();
  if (flag === 'true' || flag === '1') {
    return true;
  }
  if (flag === 'false' || flag === '0') {
    return false;
  }
  return process.env.NODE_ENV === 'staging';
}

/** OTLP log export to Uptrace (via pino-opentelemetry-transport). */
export function shouldExportOtelLogs(): boolean {
  const flag = process.env.OTEL_LOGS_EXPORT_ENABLED?.toLowerCase();
  if (flag === 'false' || flag === '0') {
    return false;
  }
  return true;
}

export function applyOtelMemoryTuningEnv(): void {
  const tight = isOtelMemoryOptimized();

  if (tight) {
    setDefault('OTEL_SPAN_PROCESSOR', 'simple');
    setDefault('OTEL_BSP_MAX_QUEUE_SIZE', '100');
    setDefault('OTEL_BSP_MAX_EXPORT_BATCH_SIZE', '20');
    setDefault('OTEL_BSP_SCHEDULE_DELAY', '2000');
    setDefault('OTEL_BSP_EXPORT_TIMEOUT', '5000');
    setDefault('OTEL_BSP_MAX_CONCURRENT_EXPORTS', '1');
    setDefault('OTEL_BLRP_MAX_QUEUE_SIZE', '100');
    setDefault('OTEL_BLRP_MAX_EXPORT_BATCH_SIZE', '20');
    setDefault('OTEL_BLRP_SCHEDULE_DELAY', '2000');
    setDefault('OTEL_BLRP_EXPORT_TIMEOUT', '5000');
    setDefault('OTEL_EXPORTER_OTLP_TIMEOUT', '5000');
    setDefault('OTEL_METRICS_EXPORTER', 'none');
  } else {
    setDefault('OTEL_BSP_MAX_QUEUE_SIZE', '512');
    setDefault('OTEL_BSP_MAX_EXPORT_BATCH_SIZE', '128');
    setDefault('OTEL_BSP_SCHEDULE_DELAY', '5000');
    setDefault('OTEL_EXPORTER_OTLP_TIMEOUT', '10000');
  }

  setDefault('OTEL_TRACES_SAMPLER_ARG', '0.1');
}

function setDefault(key: string, value: string): void {
  const v = process.env[key];
  if (v === undefined || v === '') {
    process.env[key] = value;
  }
}
