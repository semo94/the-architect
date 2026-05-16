/**
 * Apply conservative OpenTelemetry exporter defaults before the SDK starts.
 * Honors explicit process.env overrides (e.g. set in Render or .env).
 *
 * NodeSDK defaults OTLP logs/metrics when env vars are unset — we pin them off here
 * and export logs only through pino-opentelemetry-transport (when enabled).
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

/**
 * Pino OTLP transport spawns worker threads; each worker runs otlp-logger which
 * registers another global LoggerProvider + resource detectors (~100MB+ RSS each on 512MB).
 * Default off on memory-optimized; stdout logs still go to Render.
 */
export function shouldUsePinoOtlpTransport(): boolean {
  if (!shouldExportOtelLogs()) {
    return false;
  }
  if (!isOtelMemoryOptimized()) {
    return true;
  }
  const flag = process.env.OTEL_PINO_OTLP_TRANSPORT?.toLowerCase();
  return flag === 'true' || flag === '1';
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
