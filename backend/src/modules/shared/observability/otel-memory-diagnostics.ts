import { isOtelMemoryOptimized } from './otel-memory-tuning.js';

let timer: ReturnType<typeof setInterval> | undefined;

function shouldLogMemoryDiagnostics(): boolean {
  const flag = process.env.OTEL_MEMORY_DIAGNOSTICS?.toLowerCase();
  if (flag === 'true' || flag === '1') {
    return true;
  }
  if (flag === 'false' || flag === '0') {
    return false;
  }
  return isOtelMemoryOptimized();
}

/** Periodic RSS/heap log to stderr (Render captures it). Enable on staging by default. */
export function startOtelMemoryDiagnostics(): void {
  if (!shouldLogMemoryDiagnostics() || timer !== undefined) {
    return;
  }

  const intervalMs = Number.parseInt(process.env.OTEL_MEMORY_DIAGNOSTICS_INTERVAL_MS ?? '10000', 10);

  timer = setInterval(() => {
    const mem = process.memoryUsage();
    process.stderr.write(
      `${JSON.stringify({
        component: 'memory_diagnostics',
        rssMb: Math.round(mem.rss / 1024 / 1024),
        heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024),
        heapTotalMb: Math.round(mem.heapTotal / 1024 / 1024),
        externalMb: Math.round(mem.external / 1024 / 1024),
      })}\n`
    );
  }, Number.isFinite(intervalMs) && intervalMs > 0 ? intervalMs : 10000);

  timer.unref();
}

export function stopOtelMemoryDiagnostics(): void {
  if (timer !== undefined) {
    clearInterval(timer);
    timer = undefined;
  }
}
