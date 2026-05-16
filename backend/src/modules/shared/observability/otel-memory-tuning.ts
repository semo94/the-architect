/**
 * Apply conservative OpenTelemetry exporter defaults before the SDK starts.
 * Honors explicit process.env overrides (e.g. set in Render or .env).
 *
 * @see https://opentelemetry.io/docs/specs/otel/configuration/sdk-environment-variables/
 */
export function applyOtelMemoryTuningEnv(): void {
  // --- Trace batch span processor (BSP) ---
  setDefault('OTEL_BSP_MAX_QUEUE_SIZE', '512');
  setDefault('OTEL_BSP_MAX_EXPORT_BATCH_SIZE', '128');
  setDefault('OTEL_BSP_SCHEDULE_DELAY', '2000');

  // --- Log batch record processor (BLRP); used by OTLP log pipeline / pino transport ---
  setDefault('OTEL_BLRP_MAX_QUEUE_SIZE', '512');
  setDefault('OTEL_BLRP_MAX_EXPORT_BATCH_SIZE', '128');
  setDefault('OTEL_BLRP_SCHEDULE_DELAY', '2000');

  // --- Sampling: keep errors via parent-based ratio; override with OTEL_TRACES_SAMPLER=always_on if needed ---
  setDefault('OTEL_TRACES_SAMPLER', 'parentbased_traceidratio');
  setDefault('OTEL_TRACES_SAMPLER_ARG', '0.1');
}

function setDefault(key: string, value: string): void {
  const v = process.env[key];
  if (v === undefined || v === '') {
    process.env[key] = value;
  }
}
