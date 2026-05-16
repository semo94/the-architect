import type { Sampler } from '@opentelemetry/sdk-trace-base';
import { ParentBasedSampler, TraceIdRatioBasedSampler } from '@opentelemetry/sdk-trace-base';

function parseTraceSampleRatio(): number {
  const arg = process.env.OTEL_TRACES_SAMPLER_ARG;
  if (arg === undefined || arg === '') {
    return 0.1;
  }
  const ratio = Number.parseFloat(arg);
  if (!Number.isFinite(ratio) || ratio < 0 || ratio > 1) {
    return 0.1;
  }
  return ratio;
}

/** Parent-based ratio sampler; children follow the parent's sampling decision. */
export function createOtelTraceSampler(): Sampler {
  return new ParentBasedSampler({
    root: new TraceIdRatioBasedSampler(parseTraceSampleRatio()),
  });
}
