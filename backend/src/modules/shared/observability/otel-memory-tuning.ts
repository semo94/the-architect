/**
 * Apply conservative OpenTelemetry exporter defaults before the SDK starts.
 * Honors explicit process.env overrides (e.g. set in Render or .env).
 *
 * @see https://opentelemetry.io/docs/specs/otel/configuration/sdk-environment-variables/
 * @see https://opentelemetry.io/docs/security/config-best-practices/
 */

/** Staging / small instances: tighter BSP/BLRP buffers and no metric export by default. */
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

/**
 * OTLP log export to Uptrace (via pino-opentelemetry-transport).
 * Default on when UPTRACE_DSN is set; memory is bounded via BLRP env in applyOtelMemoryTuningEnv.
 * Set OTEL_LOGS_EXPORT_ENABLED=false only as an emergency OOM kill switch.
 */
export function shouldExportOtelLogs(): boolean {
  const flag = process.env.OTEL_LOGS_EXPORT_ENABLED?.toLowerCase();
  if (flag === 'false' || flag === '0') {
    return false;
  }
  return true;
}

export function applyOtelMemoryTuningEnv(): void {
  const tight = isOtelMemoryOptimized();
  const queueSize = tight ? '256' : '512';
  const exportBatch = tight ? '64' : '128';
  const scheduleDelayMs = tight ? '1000' : '2000';

  // --- Trace batch span processor (BSP) ---
  setDefault('OTEL_BSP_MAX_QUEUE_SIZE', queueSize);
  setDefault('OTEL_BSP_MAX_EXPORT_BATCH_SIZE', exportBatch);
  setDefault('OTEL_BSP_SCHEDULE_DELAY', scheduleDelayMs);
  setDefault('OTEL_BSP_EXPORT_TIMEOUT', '10000');
  setDefault('OTEL_BSP_MAX_CONCURRENT_EXPORTS', '1');

  // --- Log batch record processor (BLRP) ---
  setDefault('OTEL_BLRP_MAX_QUEUE_SIZE', queueSize);
  setDefault('OTEL_BLRP_MAX_EXPORT_BATCH_SIZE', exportBatch);
  setDefault('OTEL_BLRP_SCHEDULE_DELAY', scheduleDelayMs);
  setDefault('OTEL_BLRP_EXPORT_TIMEOUT', '10000');

  // --- OTLP exporters: fail fast so queues do not grow during outages ---
  setDefault('OTEL_EXPORTER_OTLP_TIMEOUT', '10000');

  // Ratio default; programmatic sampler in instrumentation.ts reads OTEL_TRACES_SAMPLER_ARG.
  setDefault('OTEL_TRACES_SAMPLER_ARG', '0.1');

  // Drop periodic metric export on memory-optimized profiles (custom counters are low-volume).
  if (tight) {
    setDefault('OTEL_METRICS_EXPORTER', 'none');
  }
}

function setDefault(key: string, value: string): void {
  const v = process.env[key];
  if (v === undefined || v === '') {
    process.env[key] = value;
  }
}
