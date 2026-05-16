/**
 * Apply conservative OpenTelemetry exporter defaults before the SDK starts.
 * Honors explicit process.env overrides (e.g. set in Render or .env).
 *
 * NodeSDK defaults OTLP logs/metrics when env vars are unset — we pin them off here;
 * logs export via pino-opentelemetry-transport whenever UPTRACE_DSN is set.
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

export function applyOtelMemoryTuningEnv(): void {
  const tight = isOtelMemoryOptimized();

  // NodeSDK must not start its own OTLP log/metric pipelines (pino handles logs when enabled).
  setDefault('OTEL_LOGS_EXPORTER', 'none');
  setDefault('OTEL_METRICS_EXPORTER', 'none');
  setDefault('OTEL_NODE_RESOURCE_DETECTORS', 'none');

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
