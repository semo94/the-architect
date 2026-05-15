import { metrics } from '@opentelemetry/api';
import {
  EntityResolutionEvent,
  EntityResolutionMetricOutcome,
  EntityResolutionMode,
  EntityResolutionReverseResult,
  EntityResolutionUnmatchedReason,
} from './entity-resolution.js';

const meter = metrics.getMeter('breadthwise-entity-resolution');

const resolutionOutcomes = meter.createCounter('breadthwise.entity_resolution.outcome', {
  description: 'Stable resolution outcomes by mode/outcome',
});

const judgeInvocations = meter.createCounter('breadthwise.entity_resolution.judge_invocation', {
  description: 'LLM judge invocations in entity resolution',
});

const reverseResolve = meter.createCounter('breadthwise.entity_resolution.reverse_resolve', {
  description: 'Reverse-resolve pass results',
});

function toMode(attrs?: Record<string, string>): EntityResolutionMode {
  const mode = attrs?.resolutionMode;
  if (
    mode === EntityResolutionMode.Single ||
    mode === EntityResolutionMode.Batch ||
    mode === EntityResolutionMode.ResolveByName
  ) {
    return mode;
  }
  return EntityResolutionMode.Unknown;
}

function addOutcome(outcome: EntityResolutionMetricOutcome, attrs?: Record<string, string>): void {
  resolutionOutcomes.add(1, {
    mode: toMode(attrs),
    outcome,
  });
}

/**
 * Keep public API stable while reducing cardinality/noise:
 * - high-frequency stage events are dropped
 * - only outcome-level counters are exported
 */
export function recordEntityResolutionEvent(
  event: EntityResolutionEvent,
  attrs?: Record<string, string>
): void {
  const reason = attrs?.reason;
  switch (event) {
    case EntityResolutionEvent.ExactMatchFound:
      addOutcome(EntityResolutionMetricOutcome.MatchedExactAlias, attrs);
      return;
    case EntityResolutionEvent.HighConfidenceMatchFound:
      addOutcome(EntityResolutionMetricOutcome.MatchedHighConfidenceVector, attrs);
      return;
    case EntityResolutionEvent.JudgeMatchFound:
      addOutcome(EntityResolutionMetricOutcome.MatchedJudgeConfirmed, attrs);
      return;
    case EntityResolutionEvent.CandidateEmpty:
      addOutcome(EntityResolutionMetricOutcome.UnmatchedCandidateEmpty, attrs);
      return;
    case EntityResolutionEvent.ExactMissNoEmbedding:
      addOutcome(EntityResolutionMetricOutcome.UnmatchedMissingEmbedding, attrs);
      return;
    case EntityResolutionEvent.NoConfidentMatchMarkedNew:
      addOutcome(EntityResolutionMetricOutcome.UnmatchedNoViableCandidates, attrs);
      return;
    case EntityResolutionEvent.JudgeMarkedNew:
      if (reason === EntityResolutionUnmatchedReason.JudgeError) {
        addOutcome(EntityResolutionMetricOutcome.UnmatchedJudgeError, attrs);
        return;
      }
      if (reason === EntityResolutionUnmatchedReason.InvalidJudgeMatch) {
        addOutcome(EntityResolutionMetricOutcome.UnmatchedInvalidJudgeMatch, attrs);
        return;
      }
      addOutcome(EntityResolutionMetricOutcome.UnmatchedJudgeRejected, attrs);
      return;
    case EntityResolutionEvent.ExistingTopicReused:
      addOutcome(EntityResolutionMetricOutcome.MatchedExistingTopicReuse, attrs);
      return;
    case EntityResolutionEvent.BatchJudgeInvoked:
    case EntityResolutionEvent.SingleJudgeInvoked:
      judgeInvocations.add(1, { mode: toMode(attrs) });
      return;
    case EntityResolutionEvent.ReverseResolutionExactMatch:
      reverseResolve.add(1, { result: EntityResolutionReverseResult.Exact });
      return;
    case EntityResolutionEvent.ReverseResolutionSemanticMatch:
      reverseResolve.add(1, { result: EntityResolutionReverseResult.Semantic });
      return;
    case EntityResolutionEvent.ReverseResolutionFailed:
      reverseResolve.add(1, { result: EntityResolutionReverseResult.Error });
      return;
    default:
      // Intentionally drop noisy stage-level events.
      return;
  }
}
