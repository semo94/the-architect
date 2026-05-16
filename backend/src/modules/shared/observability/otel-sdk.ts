import { NodeSDK } from '@opentelemetry/sdk-node';
import { createResource, parseDsn } from '@uptrace/core';
import { createOtelInstrumentations } from './otel-instrumentations.js';
import { createTraceSpanProcessor } from './otel-span-processor.js';
import { createOtelTraceSampler } from './otel-sampler.js';

export type OtelSdkHandle = {
  start(): void;
  shutdown(): Promise<void>;
};

export function buildOtelSdk(options: {
  dsn: string;
  serviceName: string;
  deploymentEnvironment: string;
}): OtelSdkHandle {
  const parsed = parseDsn(options.dsn);
  const traceExporterUrl = `${parsed.otlpHttpEndpoint()}/v1/traces`;

  const sdk = new NodeSDK({
    resource: createResource({
      dsn: options.dsn,
      serviceName: options.serviceName,
      deploymentEnvironment: options.deploymentEnvironment,
    }),
    autoDetectResources: false,
    sampler: createOtelTraceSampler(),
    spanProcessors: [createTraceSpanProcessor(traceExporterUrl, options.dsn)],
    instrumentations: createOtelInstrumentations(),
    // Traces only — logs via pino-opentelemetry-transport; metrics disabled on tight profile.
    metricReaders: [],
    logRecordProcessors: [],
  });

  return {
    start: () => sdk.start(),
    shutdown: () => sdk.shutdown(),
  };
}
