import { metrics } from '@opentelemetry/api';

const meter = metrics.getMeter('breadthwise-entity-resolution');

const resolutionEvents = meter.createCounter('breadthwise.entity_resolution.event', {
  description: 'Entity / topic resolution algorithm events',
});

export function recordEntityResolutionEvent(event: string, attrs?: Record<string, string>): void {
  resolutionEvents.add(1, { event, ...attrs });
}
