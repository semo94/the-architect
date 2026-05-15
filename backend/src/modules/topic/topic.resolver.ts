import { randomUUID } from 'node:crypto';
import { llmService, type JudgeResolutionItem } from '../llm/llm.service.js';
import { embeddingService } from '../shared/embedding/embedding.service.js';
import { getModuleLogger } from '../shared/observability/logger.js';
import { truncateForLog } from '../shared/utils/string-log.utils.js';
import { recordEntityResolutionEvent } from '../shared/observability/metrics.js';
import {
  EntityResolutionDecisionKind,
  EntityResolutionEntryPoint,
  EntityResolutionEvent as ResolutionEvent,
  EntityResolutionMatchStrategy,
  EntityResolutionMode as ResolutionMode,
  EntityResolutionStage as ResolutionStage,
  EntityResolutionUnmatchedReason,
} from '../shared/observability/entity-resolution.js';
import type {
  AliasNeighborRow,
  TopicAliasSource,
  TopicRepository,
} from './topic.repository.js';

/** Entity-resolution thresholds tuned for text-embedding-3-small. */
export const HIGH_CONFIDENCE_THRESHOLD = 0.88;
export const LOW_CONFIDENCE_THRESHOLD = 0.50;
export const MARGIN_GUARD = 0.02;

/** Number of nearest aliases pulled from pgvector per resolution call. */
const NEIGHBOR_K = 5;

export interface ResolveContextHint {
  sourceName: string;
  sourceCategory?: string;
}

export interface ResolveInput {
  candidateName: string;
  /**
   * Pre-computed embedding for the candidate. Pass null if embeddings are
   * unavailable; resolver will only run exact-alias lookup in that case.
   */
  candidateEmbedding: number[] | null;
  contextHint?: ResolveContextHint | null;
  /**
   * The source of the alias if a match is found. Used when the resolver
   * inserts the candidate as a new alias on the matched topic.
   */
  aliasSource: TopicAliasSource;
  /**
   * When set, used as `resolutionFlowId` in logs so wrappers (e.g. `resolveByName`) share one id with `resolve()`.
   */
  resolutionCorrelationId?: string;
}

export type ResolveOutcome =
  | { kind: EntityResolutionDecisionKind.Unmatched; reason: EntityResolutionUnmatchedReason }
  | {
      kind: EntityResolutionDecisionKind.Matched;
      topicId: string;
      primaryName: string;
      strategy: EntityResolutionMatchStrategy;
    };

/** Correlates every log line for one `resolve` or `resolveBatch` invocation (filter in APM by this id). */
interface ResolutionLogContext {
  flowId: string;
  mode: ResolutionMode;
  /** 0-based index of the candidate within the batch (omit for single-candidate global lines). */
  itemIdx?: number;
  /** High-level pipeline position for A → Z tracing. */
  stage: ResolutionStage;
}

const INFO_LEVEL_EVENTS = new Set<ResolutionEvent>([
  ResolutionEvent.ExactMatchFound,
  ResolutionEvent.HighConfidenceMatchFound,
  ResolutionEvent.JudgeMatchFound,
  ResolutionEvent.JudgeMarkedNew,
]);

/** Phase-based resolver with alias backfill on successful matches. */
export class TopicResolver {
  private readonly logger = getModuleLogger('topic.resolver');

  constructor(private readonly topicRepository: TopicRepository) {}

  /** Resolve many candidates in one pass with a single batched judge call. */
  async resolveBatch(inputs: ResolveInput[]): Promise<ResolveOutcome[]> {
    const flowId = randomUUID();
    const outcomes: ResolveOutcome[] = new Array(inputs.length);
    const judgePending: { idx: number; input: ResolveInput; neighbors: AliasNeighborRow[] }[] = [];

    const trimmedNames = inputs.map((input) => input.candidateName.trim());
    const emptyNameCount = trimmedNames.filter((n) => n.length === 0).length;
    const withEmbeddingCount = inputs.filter((i) => i.candidateEmbedding).length;

    this.logResolution(
      { flowId, mode: ResolutionMode.Batch, stage: ResolutionStage.PipelineStart },
      ResolutionEvent.BatchStarted,
      {
        batchSize: inputs.length,
        batchEmptyNameCount: emptyNameCount,
        batchWithEmbeddingCount: withEmbeddingCount,
        neighborK: NEIGHBOR_K,
      }
    );

    // Phase 1: single IN query for all non-empty candidates (replaces N sequential lookups)
    const namesToLookup = trimmedNames.filter((n) => n.length > 0);
    const exactMap = namesToLookup.length > 0
      ? await this.topicRepository.findAliasExactBatch(namesToLookup)
      : new Map<string, { topicId: string; primaryName: string }>();

    // Resolve exact matches and collect candidates that need vector search
    const annPending: { idx: number; input: ResolveInput; trimmed: string }[] = [];
    for (let i = 0; i < inputs.length; i++) {
      const trimmed = trimmedNames[i];
      const input = inputs[i];
      const ctx: ResolutionLogContext = { flowId, mode: ResolutionMode.Batch, itemIdx: i, stage: ResolutionStage.ExactLookup };

      if (trimmed.length === 0) {
        this.logResolution(ctx, ResolutionEvent.CandidateEmpty, {
          outcome: EntityResolutionUnmatchedReason.CandidateEmpty,
          ...this.inputTraceFields(input),
        });
        outcomes[i] = this.unmatchedOutcome(EntityResolutionUnmatchedReason.CandidateEmpty);
        continue;
      }

      const exact = exactMap.get(trimmed.toLowerCase());
      if (exact) {
        this.logResolution(ctx, ResolutionEvent.ExactMatchFound, {
          candidatePreview: this.previewText(trimmed),
          topicId: exact.topicId,
          primaryNamePreview: this.previewText(exact.primaryName, 80),
          ...this.inputTraceFields(input),
        });
        outcomes[i] = this.matchedOutcome(
          exact.topicId,
          exact.primaryName,
          EntityResolutionMatchStrategy.ExactAlias
        );
        continue;
      }

      if (!input.candidateEmbedding) {
        this.logResolution(ctx, ResolutionEvent.ExactMissNoEmbedding, {
          candidatePreview: this.previewText(trimmed),
          ...this.inputTraceFields(input),
        });
        outcomes[i] = this.unmatchedOutcome(EntityResolutionUnmatchedReason.MissingEmbedding);
        continue;
      }

      annPending.push({ idx: i, input, trimmed });
    }

    this.logResolution(
      { flowId, mode: ResolutionMode.Batch, stage: ResolutionStage.ExactLookupComplete },
      ResolutionEvent.BatchExactLookupComplete,
      {
        annQueueSize: annPending.length,
        tier0ExactMapSize: exactMap.size,
      }
    );

    // Phase 2+: run vector searches concurrently for all exact-lookup misses.
    if (annPending.length > 0) {
      const neighborResults = await Promise.all(
        annPending.map((p) => this.topicRepository.findAliasNeighbors(p.input.candidateEmbedding!, NEIGHBOR_K)),
      );

      for (let j = 0; j < annPending.length; j++) {
        const { idx, input, trimmed } = annPending[j];
        const neighbors = neighborResults[j];
        const ctx: ResolutionLogContext = { flowId, mode: ResolutionMode.Batch, itemIdx: idx, stage: ResolutionStage.CandidateSearch };

        if (neighbors.length === 0) {
          this.logResolution({ ...ctx, stage: ResolutionStage.NewDecision }, ResolutionEvent.NoConfidentMatchMarkedNew, {
            candidatePreview: this.previewText(trimmed),
            reason: EntityResolutionUnmatchedReason.NoViableCandidates,
            ...this.inputTraceFields(input),
          });
          outcomes[idx] = this.unmatchedOutcome(EntityResolutionUnmatchedReason.NoViableCandidates);
          continue;
        }

        const top = neighbors[0];
        const bestCompetitor = neighbors.find((n) => n.topicId !== top.topicId);

        if (
          top.score >= HIGH_CONFIDENCE_THRESHOLD &&
          (!bestCompetitor || bestCompetitor.score < HIGH_CONFIDENCE_THRESHOLD || (top.score - bestCompetitor.score) >= MARGIN_GUARD)
        ) {
          await this.recordAlias(top.topicId, trimmed, input.candidateEmbedding, input.aliasSource);
          this.logResolution({ ...ctx, stage: ResolutionStage.HighConfidenceMatch }, ResolutionEvent.HighConfidenceMatchFound, {
            candidatePreview: this.previewText(trimmed),
            topicId: top.topicId,
            primaryNamePreview: this.previewText(top.primaryName, 80),
            topScore: top.score,
            competitorTopicId: bestCompetitor?.topicId ?? null,
            competitorScore: bestCompetitor?.score ?? null,
            highConfidenceThreshold: HIGH_CONFIDENCE_THRESHOLD,
            marginGuard: MARGIN_GUARD,
            ...this.neighborTraceFields(neighbors),
            ...this.inputTraceFields(input),
          });
          outcomes[idx] = this.matchedOutcome(
            top.topicId,
            top.primaryName,
            EntityResolutionMatchStrategy.HighConfidenceVector
          );
          continue;
        }

        if (top.score < LOW_CONFIDENCE_THRESHOLD) {
          this.logResolution({ ...ctx, stage: ResolutionStage.NewDecision }, ResolutionEvent.NoConfidentMatchMarkedNew, {
            candidatePreview: this.previewText(trimmed),
            reason: EntityResolutionUnmatchedReason.NoViableCandidates,
            topScore: top.score,
            lowConfidenceThreshold: LOW_CONFIDENCE_THRESHOLD,
            ...this.neighborTraceFields(neighbors),
            ...this.inputTraceFields(input),
          });
          outcomes[idx] = this.unmatchedOutcome(EntityResolutionUnmatchedReason.NoViableCandidates);
          continue;
        }

        judgePending.push({ idx, input, neighbors });
      }
    }

    if (judgePending.length === 0) {
      this.logResolution(
        { flowId, mode: ResolutionMode.Batch, stage: ResolutionStage.PipelineEnd },
        ResolutionEvent.BatchCompleted,
        { outcome: 'no_judge_needed', resultCount: outcomes.length }
      );
      return outcomes;
    }

    this.logResolution(
      { flowId, mode: ResolutionMode.Batch, stage: ResolutionStage.JudgePreparation },
      ResolutionEvent.BatchJudgePrepared,
      {
        judgeBatchSize: judgePending.length,
        resolutionItemIndices: judgePending.map((p) => p.idx),
      }
    );

    // Build a single judge call with all borderline items
    const allTopicIds = new Set<string>();
    const dedupedPerItem = judgePending.map((p) => {
      const deduped = this.dedupeCandidates(p.neighbors);
      deduped.forEach((c) => allTopicIds.add(c.topicId));
      return deduped;
    });

    const aliasMap = await this.topicRepository.getAliasesForTopics(Array.from(allTopicIds));

    const judgeItems: JudgeResolutionItem[] = judgePending.map((p, k) => ({
      candidateName: p.input.candidateName.trim(),
      contextHint: p.input.contextHint ?? null,
      candidates: dedupedPerItem[k].map((c) => ({
        topicId: c.topicId,
        primaryName: c.primaryName,
        aliases: aliasMap.get(c.topicId) ?? [],
      })),
    }));

    let verdicts;
    try {
      this.logResolution(
        { flowId, mode: ResolutionMode.Batch, stage: ResolutionStage.JudgeInvocation },
        ResolutionEvent.BatchJudgeInvoked,
        {
          judgeBatchSize: judgeItems.length,
          distinctTopicIdsForJudge: allTopicIds.size,
        }
      );
      verdicts = await llmService.judgeEntityResolution(judgeItems);
    } catch {
      for (const p of judgePending) {
        const ctx: ResolutionLogContext = { flowId, mode: ResolutionMode.Batch, itemIdx: p.idx, stage: ResolutionStage.JudgeFailure };
        this.logResolution(ctx, ResolutionEvent.JudgeMarkedNew, {
          candidatePreview: this.previewText(p.input.candidateName.trim()),
          reason: EntityResolutionUnmatchedReason.JudgeError,
          ...this.inputTraceFields(p.input),
          ...this.neighborTraceFields(p.neighbors),
        });
        outcomes[p.idx] = this.unmatchedOutcome(EntityResolutionUnmatchedReason.JudgeError);
      }
      this.logResolution(
        { flowId, mode: ResolutionMode.Batch, stage: ResolutionStage.PipelineEnd },
        ResolutionEvent.BatchCompleted,
        { outcome: 'judge_threw', resultCount: outcomes.length }
      );
      return outcomes;
    }

    for (let k = 0; k < judgePending.length; k++) {
      const p = judgePending[k];
      const verdict = verdicts[k];
      const trimmed = p.input.candidateName.trim();
      const ctx: ResolutionLogContext = { flowId, mode: ResolutionMode.Batch, itemIdx: p.idx, stage: ResolutionStage.JudgeVerdict };

      if (!verdict || verdict.match === 'NEW') {
        this.logResolution(ctx, ResolutionEvent.JudgeMarkedNew, {
          candidatePreview: this.previewText(trimmed),
          verdict: verdict?.match ?? null,
          ...this.inputTraceFields(p.input),
          ...this.neighborTraceFields(p.neighbors),
        });
        outcomes[p.idx] = this.unmatchedOutcome(EntityResolutionUnmatchedReason.JudgeRejected);
        continue;
      }

      const matched = dedupedPerItem[k].find((c) => c.topicId === verdict.match);
      if (!matched) {
        this.logResolution(ctx, ResolutionEvent.JudgeMarkedNew, {
          candidatePreview: this.previewText(trimmed),
          reason: EntityResolutionUnmatchedReason.InvalidJudgeMatch,
          verdictTopicId: verdict.match,
          offeredTopicIds: dedupedPerItem[k].map((c) => c.topicId),
          ...this.inputTraceFields(p.input),
        });
        outcomes[p.idx] = this.unmatchedOutcome(EntityResolutionUnmatchedReason.InvalidJudgeMatch);
        continue;
      }

      await this.recordAlias(matched.topicId, trimmed, p.input.candidateEmbedding, p.input.aliasSource);
      this.logResolution(ctx, ResolutionEvent.JudgeMatchFound, {
        candidatePreview: this.previewText(trimmed),
        topicId: matched.topicId,
        primaryNamePreview: this.previewText(matched.primaryName, 80),
        verdictTopicId: verdict.match,
        topNeighborScore: p.neighbors[0]?.score ?? null,
        ...this.inputTraceFields(p.input),
        ...this.neighborTraceFields(p.neighbors),
      });
      outcomes[p.idx] = this.matchedOutcome(
        matched.topicId,
        matched.primaryName,
        EntityResolutionMatchStrategy.JudgeConfirmed
      );
    }

    this.logResolution(
      { flowId, mode: ResolutionMode.Batch, stage: ResolutionStage.PipelineEnd },
      ResolutionEvent.BatchCompleted,
      { outcome: 'complete', resultCount: outcomes.length }
    );

    return outcomes;
  }

  async resolve(input: ResolveInput): Promise<ResolveOutcome> {
    const flowId = input.resolutionCorrelationId ?? randomUUID();

    this.logResolution(
      { flowId, mode: ResolutionMode.Single, stage: ResolutionStage.PipelineStart },
      ResolutionEvent.SingleStarted,
      {
        candidatePreview: this.previewText(input.candidateName),
        resolutionEntryPoint: input.resolutionCorrelationId
          ? EntityResolutionEntryPoint.ResolveByName
          : EntityResolutionEntryPoint.Resolve,
        ...this.inputTraceFields(input),
        neighborK: NEIGHBOR_K,
      }
    );

    const trimmed = input.candidateName.trim();
    if (trimmed.length === 0) {
      this.logResolution(
        { flowId, mode: ResolutionMode.Single, stage: ResolutionStage.InputRejected },
        ResolutionEvent.CandidateEmpty,
        {
          outcome: EntityResolutionUnmatchedReason.CandidateEmpty,
          ...this.inputTraceFields(input),
        }
      );
      return this.unmatchedOutcome(EntityResolutionUnmatchedReason.CandidateEmpty);
    }

    // Phase 1 — exact alias lookup
    const exact = await this.topicRepository.findAliasExact(trimmed);
    if (exact) {
      this.logCandidateResolution({
        ctx: { flowId, mode: ResolutionMode.Single, stage: ResolutionStage.ExactLookup },
        event: ResolutionEvent.ExactMatchFound,
        input,
        candidate: trimmed,
        fields: {
          topicId: exact.topicId,
          primaryNamePreview: this.previewText(exact.primaryName, 80),
        },
      });
      return this.matchedOutcome(
        exact.topicId,
        exact.primaryName,
        EntityResolutionMatchStrategy.ExactAlias
      );
    }

    if (!input.candidateEmbedding) {
      this.logCandidateResolution({
        ctx: { flowId, mode: ResolutionMode.Single, stage: ResolutionStage.ExactLookup },
        event: ResolutionEvent.ExactMissNoEmbedding,
        input,
        candidate: trimmed,
      });
      return this.unmatchedOutcome(EntityResolutionUnmatchedReason.MissingEmbedding);
    }

    // Phase 2 — candidate search and high-confidence match
    const neighbors = await this.topicRepository.findAliasNeighbors(input.candidateEmbedding, NEIGHBOR_K);

    if (neighbors.length === 0) {
      this.logCandidateResolution({
        ctx: { flowId, mode: ResolutionMode.Single, stage: ResolutionStage.NewDecision },
        event: ResolutionEvent.NoConfidentMatchMarkedNew,
        input,
        candidate: trimmed,
        fields: { reason: EntityResolutionUnmatchedReason.NoViableCandidates },
      });
      return this.unmatchedOutcome(EntityResolutionUnmatchedReason.NoViableCandidates);
    }

    const top = neighbors[0];
    const bestCompetitor = neighbors.find((n) => n.topicId !== top.topicId);

    if (
      top.score >= HIGH_CONFIDENCE_THRESHOLD &&
      (!bestCompetitor || bestCompetitor.score < HIGH_CONFIDENCE_THRESHOLD || (top.score - bestCompetitor.score) >= MARGIN_GUARD)
    ) {
      await this.recordAlias(top.topicId, trimmed, input.candidateEmbedding, input.aliasSource);
      this.logCandidateResolution({
        ctx: { flowId, mode: ResolutionMode.Single, stage: ResolutionStage.HighConfidenceMatch },
        event: ResolutionEvent.HighConfidenceMatchFound,
        input,
        candidate: trimmed,
        neighbors,
        fields: {
          topicId: top.topicId,
          primaryNamePreview: this.previewText(top.primaryName, 80),
          topScore: top.score,
          competitorTopicId: bestCompetitor?.topicId ?? null,
          competitorScore: bestCompetitor?.score ?? null,
          highConfidenceThreshold: HIGH_CONFIDENCE_THRESHOLD,
          marginGuard: MARGIN_GUARD,
        },
      });
      return this.matchedOutcome(
        top.topicId,
        top.primaryName,
        EntityResolutionMatchStrategy.HighConfidenceVector
      );
    }

    if (top.score < LOW_CONFIDENCE_THRESHOLD) {
      this.logCandidateResolution({
        ctx: { flowId, mode: ResolutionMode.Single, stage: ResolutionStage.NewDecision },
        event: ResolutionEvent.NoConfidentMatchMarkedNew,
        input,
        candidate: trimmed,
        neighbors,
        fields: {
          reason: EntityResolutionUnmatchedReason.NoViableCandidates,
          topScore: top.score,
          lowConfidenceThreshold: LOW_CONFIDENCE_THRESHOLD,
        },
      });
      return this.unmatchedOutcome(EntityResolutionUnmatchedReason.NoViableCandidates);
    }

    // Phase 3 — judge disambiguation
    const distinctCandidates = this.dedupeCandidates(neighbors);
    const candidateAliases = await this.topicRepository.getAliasesForTopics(
      distinctCandidates.map((c) => c.topicId)
    );

    const judgeItems: JudgeResolutionItem[] = [{
      candidateName: trimmed,
      contextHint: input.contextHint ?? null,
      candidates: distinctCandidates.map((c) => ({
        topicId: c.topicId,
        primaryName: c.primaryName,
        aliases: candidateAliases.get(c.topicId) ?? [],
      })),
    }];

    this.logResolution(
      { flowId, mode: ResolutionMode.Single, stage: ResolutionStage.JudgePreparation },
      ResolutionEvent.SingleJudgePrepared,
      {
        dedupedCandidateTopicCount: distinctCandidates.length,
        offeredTopicIds: distinctCandidates.map((c) => c.topicId),
      }
    );

    let verdicts;
    try {
      this.logResolution(
        { flowId, mode: ResolutionMode.Single, stage: ResolutionStage.JudgeInvocation },
        ResolutionEvent.SingleJudgeInvoked,
        {
          judgeBatchSize: 1,
        }
      );
      verdicts = await llmService.judgeEntityResolution(judgeItems);
    } catch {
      this.logCandidateResolution({
        ctx: { flowId, mode: ResolutionMode.Single, stage: ResolutionStage.JudgeFailure },
        event: ResolutionEvent.JudgeMarkedNew,
        input,
        candidate: trimmed,
        neighbors,
        fields: { reason: EntityResolutionUnmatchedReason.JudgeError },
      });
      return this.unmatchedOutcome(EntityResolutionUnmatchedReason.JudgeError);
    }

    const verdict = verdicts[0];
    if (!verdict || verdict.match === 'NEW') {
      this.logCandidateResolution({
        ctx: { flowId, mode: ResolutionMode.Single, stage: ResolutionStage.JudgeVerdict },
        event: ResolutionEvent.JudgeMarkedNew,
        input,
        candidate: trimmed,
        neighbors,
        fields: { verdict: verdict?.match ?? null },
      });
      return this.unmatchedOutcome(EntityResolutionUnmatchedReason.JudgeRejected);
    }

    const matched = distinctCandidates.find((c) => c.topicId === verdict.match);
    if (!matched) {
      this.logCandidateResolution({
        ctx: { flowId, mode: ResolutionMode.Single, stage: ResolutionStage.JudgeVerdict },
        event: ResolutionEvent.JudgeMarkedNew,
        input,
        candidate: trimmed,
        fields: {
          reason: EntityResolutionUnmatchedReason.InvalidJudgeMatch,
          verdictTopicId: verdict.match,
          offeredTopicIds: distinctCandidates.map((c) => c.topicId),
        },
      });
      return this.unmatchedOutcome(EntityResolutionUnmatchedReason.InvalidJudgeMatch);
    }

    await this.recordAlias(matched.topicId, trimmed, input.candidateEmbedding, input.aliasSource);
    this.logCandidateResolution({
      ctx: { flowId, mode: ResolutionMode.Single, stage: ResolutionStage.JudgeVerdict },
      event: ResolutionEvent.JudgeMatchFound,
      input,
      candidate: trimmed,
      neighbors,
      fields: {
        topicId: matched.topicId,
        primaryNamePreview: this.previewText(matched.primaryName, 80),
        verdictTopicId: verdict.match,
        topNeighborScore: top.score,
      },
    });
    return this.matchedOutcome(
      matched.topicId,
      matched.primaryName,
      EntityResolutionMatchStrategy.JudgeConfirmed
    );
  }

  /**
   * Records the primary `name` alias for a freshly-created topic. Idempotent.
   * Pass an embedding when available; the alias row will still be created
   * without one, but it won't participate in vector candidate search until populated.
   */
  async recordPrimaryAlias(topicId: string, name: string, embedding: number[] | null): Promise<void> {
    await this.recordAlias(topicId, name, embedding, 'name');
  }

  private async recordAlias(
    topicId: string,
    aliasText: string,
    embedding: number[] | null,
    source: TopicAliasSource
  ): Promise<void> {
    const normalizedText = aliasText.trim();
    await this.topicRepository.upsertAlias({
      topicId,
      aliasText: normalizedText,
      aliasTextLower: normalizedText.toLowerCase(),
      aliasEmbedding: embedding ?? null,
      source,
    });
  }

  /**
   * Collapse multiple alias rows from the same topic into one entry per topic
   * (keeping the highest-scoring one). Caps at NEIGHBOR_K distinct topics.
   */
  private dedupeCandidates(neighbors: AliasNeighborRow[]): AliasNeighborRow[] {
    const byTopic = new Map<string, AliasNeighborRow>();
    for (const n of neighbors) {
      const existing = byTopic.get(n.topicId);
      if (!existing || n.score > existing.score) byTopic.set(n.topicId, n);
    }
    return Array.from(byTopic.values()).slice(0, NEIGHBOR_K);
  }

  private previewText(text: string, maxLen = 160): string {
    return truncateForLog(text, maxLen);
  }

  private inputTraceFields(input: ResolveInput): Record<string, unknown> {
    return {
      aliasSource: input.aliasSource,
      candidateEmbeddingPresent: !!input.candidateEmbedding,
      contextSourceName: input.contextHint?.sourceName ?? null,
      contextSourceCategory: input.contextHint?.sourceCategory ?? null,
      resolutionCorrelationFromCaller: !!input.resolutionCorrelationId,
    };
  }

  private neighborTraceFields(neighbors: AliasNeighborRow[]): Record<string, unknown> {
    if (neighbors.length === 0) {
      return { neighborCount: 0, distinctNeighborTopicCount: 0 };
    }
    const top = neighbors[0];
    const competitor = neighbors.find((n) => n.topicId !== top.topicId);
    return {
      neighborCount: neighbors.length,
      distinctNeighborTopicCount: new Set(neighbors.map((n) => n.topicId)).size,
      topNeighborTopicId: top.topicId,
      topNeighborScore: top.score,
      topNeighborPrimaryPreview: this.previewText(top.primaryName, 80),
      competitorNeighborTopicId: competitor?.topicId ?? null,
      competitorNeighborScore: competitor?.score ?? null,
    };
  }

  private logResolution(
    ctx: ResolutionLogContext,
    event: ResolutionEvent,
    fields: Record<string, unknown>
  ): void {
    const reason =
      typeof fields.reason === 'string' ? fields.reason : undefined;
    recordEntityResolutionEvent(event, {
      resolutionMode: ctx.mode,
      ...(reason ? { reason } : {}),
    });
    // Observability policy: keep only decision outcomes at info; stage traces go to debug.
    const logMethod = INFO_LEVEL_EVENTS.has(event)
      ? this.logger.info.bind(this.logger)
      : this.logger.debug.bind(this.logger);
    logMethod(
      {
        component: 'entity_resolution',
        resolutionFlowId: ctx.flowId,
        resolutionMode: ctx.mode,
        resolutionStage: ctx.stage,
        ...(ctx.itemIdx !== undefined ? { resolutionItemIndex: ctx.itemIdx } : {}),
        event,
        ...fields,
      },
      'entity resolution'
    );
  }

  private matchedOutcome(
    topicId: string,
    primaryName: string,
    strategy: EntityResolutionMatchStrategy
  ): ResolveOutcome {
    return { kind: EntityResolutionDecisionKind.Matched, topicId, primaryName, strategy };
  }

  private unmatchedOutcome(reason: EntityResolutionUnmatchedReason): ResolveOutcome {
    return { kind: EntityResolutionDecisionKind.Unmatched, reason };
  }

  private logCandidateResolution(args: {
    ctx: ResolutionLogContext;
    event: ResolutionEvent;
    input: ResolveInput,
    candidate: string;
    neighbors?: AliasNeighborRow[];
    fields?: Record<string, unknown>;
  }): void {
    const payload = {
      candidatePreview: this.previewText(args.candidate),
      ...(args.fields ?? {}),
      ...this.inputTraceFields(args.input),
      ...(args.neighbors ? this.neighborTraceFields(args.neighbors) : {}),
    };
    this.logResolution(args.ctx, args.event, payload);
  }
}

/**
 * Convenience: embed a single candidate name and resolve it. Pass through to
 * the resolver. On embedding failure, falls back to exact-lookup-only resolution.
 */
export async function resolveByName(
  resolver: TopicResolver,
  candidateName: string,
  aliasSource: TopicAliasSource,
  contextHint?: ResolveContextHint | null
): Promise<ResolveOutcome> {
  const flowId = randomUUID();
  let embedding: number[] | null = null;
  try {
    embedding = await embeddingService.embedText(candidateName);
  } catch {
    getModuleLogger('topic.resolver').info(
      {
        component: 'entity_resolution',
        resolutionFlowId: flowId,
        resolutionMode: ResolutionMode.ResolveByName,
        resolutionStage: ResolutionStage.PreflightEmbedding,
        event: ResolutionEvent.EmbeddingPreflightFailed,
        candidatePreview: candidateName.trim().slice(0, 160),
        aliasSource,
        contextSourceName: contextHint?.sourceName ?? null,
        contextSourceCategory: contextHint?.sourceCategory ?? null,
      },
      'entity resolution'
    );
    embedding = null;
  }

  return resolver.resolve({
    candidateName,
    candidateEmbedding: embedding,
    aliasSource,
    contextHint: contextHint ?? null,
    resolutionCorrelationId: flowId,
  });
}
