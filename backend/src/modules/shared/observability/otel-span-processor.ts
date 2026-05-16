import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { CompressionAlgorithm } from '@opentelemetry/otlp-exporter-base';
import {
  BatchSpanProcessor,
  SimpleSpanProcessor,
  type SpanProcessor,
} from '@opentelemetry/sdk-trace-base';
import type { BufferConfig } from '@opentelemetry/sdk-trace-base';
import { isOtelMemoryOptimized } from './otel-memory-tuning.js';

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (value === undefined || value === '') {
    return fallback;
  }
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function useSimpleSpanProcessor(): boolean {
  const flag = process.env.OTEL_SPAN_PROCESSOR?.toLowerCase();
  if (flag === 'simple') {
    return true;
  }
  if (flag === 'batch') {
    return false;
  }
  return isOtelMemoryOptimized();
}

export function createTraceSpanProcessor(
  traceExporterUrl: string,
  uptraceDsn: string
): SpanProcessor {
  const timeoutMillis = parsePositiveInt(process.env.OTEL_EXPORTER_OTLP_TIMEOUT, 5000);

  const exporter = new OTLPTraceExporter({
    url: traceExporterUrl,
    headers: { 'uptrace-dsn': uptraceDsn },
    compression: CompressionAlgorithm.GZIP,
    timeoutMillis,
  });

  if (useSimpleSpanProcessor()) {
    return new SimpleSpanProcessor(exporter);
  }

  const tight = isOtelMemoryOptimized();
  const config: BufferConfig = {
    maxQueueSize: parsePositiveInt(
      process.env.OTEL_BSP_MAX_QUEUE_SIZE,
      tight ? 100 : 512
    ),
    maxExportBatchSize: parsePositiveInt(
      process.env.OTEL_BSP_MAX_EXPORT_BATCH_SIZE,
      tight ? 20 : 128
    ),
    scheduledDelayMillis: parsePositiveInt(
      process.env.OTEL_BSP_SCHEDULE_DELAY,
      tight ? 2000 : 5000
    ),
    exportTimeoutMillis: parsePositiveInt(process.env.OTEL_BSP_EXPORT_TIMEOUT, timeoutMillis),
  };

  return new BatchSpanProcessor(exporter, config);
}
