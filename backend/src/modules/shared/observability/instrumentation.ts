import { normalizeUptraceDsn } from './uptrace-dsn.js';
import { applyOtelMemoryTuningEnv, shouldExportOtelLogs } from './otel-memory-tuning.js';
import { startOtelMemoryDiagnostics, stopOtelMemoryDiagnostics } from './otel-memory-diagnostics.js';
import { buildOtelSdk, type OtelSdkHandle } from './otel-sdk.js';
import { configureUptraceLogExporterEnv } from './uptrace-log-export.js';

let sdk: OtelSdkHandle | undefined;
let initStarted = false;

/** Start Uptrace traces. Call from instrumentation-preload before other app imports. */
export function initUptraceInstrumentation(): void {
  if (initStarted) {
    return;
  }
  initStarted = true;

  const dsn = normalizeUptraceDsn(process.env.UPTRACE_DSN);
  if (!dsn) {
    return;
  }

  applyOtelMemoryTuningEnv();
  if (shouldExportOtelLogs()) {
    configureUptraceLogExporterEnv();
  }

  try {
    sdk = buildOtelSdk({
      dsn,
      serviceName: process.env.OTEL_SERVICE_NAME ?? 'breadthwise-backend',
      deploymentEnvironment: process.env.NODE_ENV ?? 'production',
    });
    sdk.start();
    startOtelMemoryDiagnostics();

    void import('./logger.js').then(({ getRootLogger }) => {
      getRootLogger().info(
        {
          component: 'observability',
          spanProcessor: process.env.OTEL_SPAN_PROCESSOR ?? (process.env.NODE_ENV === 'staging' ? 'simple' : 'batch'),
        },
        'OpenTelemetry started (Uptrace)'
      );
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
  stopOtelMemoryDiagnostics();
  if (!sdk) {
    return;
  }
  await sdk.shutdown();
  sdk = undefined;
}
