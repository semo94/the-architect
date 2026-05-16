import { normalizeUptraceDsn } from './uptrace-dsn.js';
import { applyOtelMemoryTuningEnv, shouldExportOtelLogs } from './otel-memory-tuning.js';
import { getOtelRuntimeState } from './otel-global.js';
import { startOtelMemoryDiagnostics, stopOtelMemoryDiagnostics } from './otel-memory-diagnostics.js';
import { buildOtelSdk } from './otel-sdk.js';
import { configureUptraceLogExporterEnv } from './uptrace-log-export.js';

/** Start Uptrace traces. Call from instrumentation-preload before other app imports. */
export function initUptraceInstrumentation(): void {
  const state = getOtelRuntimeState();
  if (state.initStarted) {
    return;
  }
  state.initStarted = true;

  const dsn = normalizeUptraceDsn(process.env.UPTRACE_DSN);
  if (!dsn) {
    return;
  }

  applyOtelMemoryTuningEnv();
  if (shouldExportOtelLogs()) {
    configureUptraceLogExporterEnv();
  }

  registerProcessHooksOnce();

  try {
    state.initGeneration += 1;
    state.sdk = buildOtelSdk({
      dsn,
      serviceName: process.env.OTEL_SERVICE_NAME ?? 'breadthwise-backend',
      deploymentEnvironment: process.env.NODE_ENV ?? 'production',
    });
    state.sdk.start();
    startOtelMemoryDiagnostics();

    process.stderr.write(
      `${JSON.stringify({
        component: 'observability',
        msg: 'OpenTelemetry started (Uptrace)',
        spanProcessor:
          process.env.OTEL_SPAN_PROCESSOR ??
          (process.env.NODE_ENV === 'staging' ? 'simple' : 'batch'),
        initGeneration: state.initGeneration,
      })}\n`
    );
  } catch (err) {
    process.stderr.write(
      `Failed to start OpenTelemetry (Uptrace): ${err instanceof Error ? err.message : String(err)}\n`
    );
    state.sdk = undefined;
  }
}

function registerProcessHooksOnce(): void {
  const state = getOtelRuntimeState();
  if (state.processHooksRegistered) {
    return;
  }
  state.processHooksRegistered = true;

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
}

export async function shutdownInstrumentation(): Promise<void> {
  stopOtelMemoryDiagnostics();
  const state = getOtelRuntimeState();
  if (!state.sdk) {
    return;
  }
  await state.sdk.shutdown();
  state.sdk = undefined;
}
