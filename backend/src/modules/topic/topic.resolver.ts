import { randomUUID } from 'node:crypto';
import { llmService, type JudgeResolutionItem } from '../llm/llm.service.js';
import { embeddingService } from '../shared/embedding/embedding.service.js';
import { getModuleLogger } from '../shared/observability/logger.js';
import { recordEntityResolutionEvent } from '../shared/observability/metrics.js';
import type {
  AliasNeighborRow,
  TopicAliasSource,
  TopicRepository,
} from './topic.repository.js';

/**
 * Three-tier entity resolution thresholds.
 *
 * Calibrated for text-embedding-3-small at 1536 dimensions, where cosine
 * similarity is compressed: same-entity pairs with different surface forms
 * typically score 0.85–0.91, and clearly distinct topics in the same domain
 * score 0.82–0.88.
 *
 * High-confidence: ANN result alone is enough to merge without a judge call.
 *   Set to 0.88 — below this, same-entity pairs from this model reliably
 *   fall, so the judge would be called far too often at 0.92.
 *
 * Low-confidence:  below this, no candidate is plausible — declare NEW.
 *   0.50 is appropriate for text-embedding-3-small. Same-concept pairs
 *   like "REST" vs "REST Architectural Style" score as low as 0.54 with
 *   this model due to embedding compression on short vs long surface forms.
 *   0.75 caused these to be declared NEW without ever reaching the judge.
 *
 * Margin guard:    when the best-scoring alias that belongs to a DIFFERENT topic is within
 *   this gap of the top score, fall through to the judge even if top score
 *   is above HIGH_CONFIDENCE_THRESHOLD (ambiguity protection).
 *   0.02 matches the tight score clustering of this model — a 0.04 guard
 *   was sending clearly-winning candidates to the judge unnecessarily.
 */
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
   * unavailable; resolver will only run Tier 0 (exact alias) in that case.
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
  | { isNew: true; reason: 'tier0_miss_no_embedding' | 'tier3_no_neighbors' | 'tier2_judged_new' }
  | {
      isNew: false;
      topicId: string;
      primaryName: string;
      confidence: 'exact' | 'high_vector' | 'judged';
    };

/** Correlates every log line for one `resolve` or `resolveBatch` invocation (filter in APM by this id). */
interface ResolutionLogContext {
  flowId: string;
  mode: 'single' | 'batch';
  /** 0-based index of the candidate within the batch (omit for single-candidate global lines). */
  itemIdx?: number;
  /** High-level pipeline position for A → Z tracing. */
  stage: string;
}

/**
 * Three-tier entity resolver.
 *
 * Tier 0 — Exact alias match (case-insensitive).
 * Tier 1 — High-confidence ANN over alias embeddings.
 * Tier 2 — LLM judge for borderline candidates in [LOW, HIGH).
 * Tier 3 — Declare NEW.
 *
 * On any successful match (Tiers 0/1/2), the candidate name is inserted as
 * a new alias on the matched topic so future resolutions of the same
 * surface form short-circuit at Tier 0.
 */
export class TopicResolver {
  constructor(private readonly topicRepository: TopicRepository) {}

  /**
   * Resolve many candidates in one pass, batching all borderline (Tier 2)
   * lookups into a single judge LLM call. Order of results matches input
   * order. Used by hyperlink and insight extraction where N candidates are
   * resolved together.
   */
  async resolveBatch(inputs: ResolveInput[]): Promise<ResolveOutcome[]> {
    const flowId = randomUUID();
    const outcomes: ResolveOutcome[] = new Array(inputs.length);
    const judgePending: { idx: number; input: ResolveInput; neighbors: AliasNeighborRow[] }[] = [];

    const trimmedNames = inputs.map((input) => input.candidateName.trim());
    const emptyNameCount = trimmedNames.filter((n) => n.length === 0).length;
    const withEmbeddingCount = inputs.filter((i) => i.candidateEmbedding).length;

    this.logResolution(
      { flowId, mode: 'batch', stage: 'flow_start' },
      'batch_flow_start',
      {
        batchSize: inputs.length,
        batchEmptyNameCount: emptyNameCount,
        batchWithEmbeddingCount: withEmbeddingCount,
        neighborK: NEIGHBOR_K,
      }
    );

    // Tier 0: single IN query for all non-empty candidates (replaces N sequential lookups)
    const namesToLookup = trimmedNames.filter((n) => n.length > 0);
    const exactMap = namesToLookup.length > 0
      ? await this.topicRepository.findAliasExactBatch(namesToLookup)
      : new Map<string, { topicId: string; primaryName: string }>();

    // Resolve Tier-0 hits and collect candidates that need ANN search
    const annPending: { idx: number; input: ResolveInput; trimmed: string }[] = [];
    for (let i = 0; i < inputs.length; i++) {
      const trimmed = trimmedNames[i];
      const input = inputs[i];
      const ctx: ResolutionLogContext = { flowId, mode: 'batch', itemIdx: i, stage: 'tier0' };

      if (trimmed.length === 0) {
        this.logResolution(ctx, 'empty_candidate', {
          outcome: 'tier3_no_neighbors',
          ...this.inputTraceFields(input),
        });
        outcomes[i] = { isNew: true, reason: 'tier3_no_neighbors' };
        continue;
      }

      const exact = exactMap.get(trimmed.toLowerCase());
      if (exact) {
        this.logResolution(ctx, 'tier0_hit', {
          candidatePreview: this.previewText(trimmed),
          topicId: exact.topicId,
          primaryNamePreview: this.previewText(exact.primaryName, 80),
          ...this.inputTraceFields(input),
        });
        outcomes[i] = { isNew: false, topicId: exact.topicId, primaryName: exact.primaryName, confidence: 'exact' };
        continue;
      }

      if (!input.candidateEmbedding) {
        this.logResolution(ctx, 'tier0_miss_no_embedding', {
          candidatePreview: this.previewText(trimmed),
          ...this.inputTraceFields(input),
        });
        outcomes[i] = { isNew: true, reason: 'tier0_miss_no_embedding' };
        continue;
      }

      annPending.push({ idx: i, input, trimmed });
    }

    this.logResolution(
      { flowId, mode: 'batch', stage: 'tier0_complete' },
      'batch_post_tier0',
      {
        annQueueSize: annPending.length,
        tier0ExactMapSize: exactMap.size,
      }
    );

    // Tier 1+: run ANN searches concurrently for all Tier-0 misses (pure reads, safe to parallelize)
    if (annPending.length > 0) {
      const neighborResults = await Promise.all(
        annPending.map((p) => this.topicRepository.findAliasNeighbors(p.input.candidateEmbedding!, NEIGHBOR_K)),
      );

      for (let j = 0; j < annPending.length; j++) {
        const { idx, input, trimmed } = annPending[j];
        const neighbors = neighborResults[j];
        const ctx: ResolutionLogContext = { flowId, mode: 'batch', itemIdx: idx, stage: 'tier1_ann' };

        if (neighbors.length === 0) {
          this.logResolution({ ...ctx, stage: 'tier3' }, 'tier3_new', {
            candidatePreview: this.previewText(trimmed),
            reason: 'no_neighbors',
            ...this.inputTraceFields(input),
          });
          outcomes[idx] = { isNew: true, reason: 'tier3_no_neighbors' };
          continue;
        }

        const top = neighbors[0];
        const bestCompetitor = neighbors.find((n) => n.topicId !== top.topicId);

        if (
          top.score >= HIGH_CONFIDENCE_THRESHOLD &&
          (!bestCompetitor || bestCompetitor.score < HIGH_CONFIDENCE_THRESHOLD || (top.score - bestCompetitor.score) >= MARGIN_GUARD)
        ) {
          await this.recordAlias(top.topicId, trimmed, input.candidateEmbedding, input.aliasSource);
          this.logResolution({ ...ctx, stage: 'tier1' }, 'tier1_hit', {
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
          outcomes[idx] = { isNew: false, topicId: top.topicId, primaryName: top.primaryName, confidence: 'high_vector' };
          continue;
        }

        if (top.score < LOW_CONFIDENCE_THRESHOLD) {
          this.logResolution({ ...ctx, stage: 'tier3' }, 'tier3_new', {
            candidatePreview: this.previewText(trimmed),
            reason: 'below_low_threshold',
            topScore: top.score,
            lowConfidenceThreshold: LOW_CONFIDENCE_THRESHOLD,
            ...this.neighborTraceFields(neighbors),
            ...this.inputTraceFields(input),
          });
          outcomes[idx] = { isNew: true, reason: 'tier3_no_neighbors' };
          continue;
        }

        judgePending.push({ idx, input, neighbors });
      }
    }

    if (judgePending.length === 0) {
      this.logResolution(
        { flowId, mode: 'batch', stage: 'flow_end' },
        'batch_flow_end',
        { outcome: 'no_judge_needed', resultCount: outcomes.length }
      );
      return outcomes;
    }

    this.logResolution(
      { flowId, mode: 'batch', stage: 'tier2_judge_prep' },
      'batch_judge_prep',
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
        { flowId, mode: 'batch', stage: 'tier2_judge_call' },
        'batch_judge_invoked',
        {
          judgeBatchSize: judgeItems.length,
          distinctTopicIdsForJudge: allTopicIds.size,
        }
      );
      verdicts = await llmService.judgeEntityResolution(judgeItems);
    } catch {
      for (const p of judgePending) {
        const ctx: ResolutionLogContext = { flowId, mode: 'batch', itemIdx: p.idx, stage: 'tier2_judge_error' };
        this.logResolution(ctx, 'tier2_hit_new', {
          candidatePreview: this.previewText(p.input.candidateName.trim()),
          reason: 'judge_error',
          ...this.inputTraceFields(p.input),
          ...this.neighborTraceFields(p.neighbors),
        });
        outcomes[p.idx] = { isNew: true, reason: 'tier2_judged_new' };
      }
      this.logResolution(
        { flowId, mode: 'batch', stage: 'flow_end' },
        'batch_flow_end',
        { outcome: 'judge_threw', resultCount: outcomes.length }
      );
      return outcomes;
    }

    for (let k = 0; k < judgePending.length; k++) {
      const p = judgePending[k];
      const verdict = verdicts[k];
      const trimmed = p.input.candidateName.trim();
      const ctx: ResolutionLogContext = { flowId, mode: 'batch', itemIdx: p.idx, stage: 'tier2_verdict' };

      if (!verdict || verdict.match === 'NEW') {
        this.logResolution(ctx, 'tier2_hit_new', {
          candidatePreview: this.previewText(trimmed),
          verdict: verdict?.match ?? null,
          ...this.inputTraceFields(p.input),
          ...this.neighborTraceFields(p.neighbors),
        });
        outcomes[p.idx] = { isNew: true, reason: 'tier2_judged_new' };
        continue;
      }

      const matched = dedupedPerItem[k].find((c) => c.topicId === verdict.match);
      if (!matched) {
        this.logResolution(ctx, 'tier2_hit_new', {
          candidatePreview: this.previewText(trimmed),
          reason: 'invalid_topic_id',
          verdictTopicId: verdict.match,
          offeredTopicIds: dedupedPerItem[k].map((c) => c.topicId),
          ...this.inputTraceFields(p.input),
        });
        outcomes[p.idx] = { isNew: true, reason: 'tier2_judged_new' };
        continue;
      }

      await this.recordAlias(matched.topicId, trimmed, p.input.candidateEmbedding, p.input.aliasSource);
      this.logResolution(ctx, 'tier2_hit_match', {
        candidatePreview: this.previewText(trimmed),
        topicId: matched.topicId,
        primaryNamePreview: this.previewText(matched.primaryName, 80),
        verdictTopicId: verdict.match,
        topNeighborScore: p.neighbors[0]?.score ?? null,
        ...this.inputTraceFields(p.input),
        ...this.neighborTraceFields(p.neighbors),
      });
      outcomes[p.idx] = { isNew: false, topicId: matched.topicId, primaryName: matched.primaryName, confidence: 'judged' };
    }

    this.logResolution(
      { flowId, mode: 'batch', stage: 'flow_end' },
      'batch_flow_end',
      { outcome: 'complete', resultCount: outcomes.length }
    );

    return outcomes;
  }

  async resolve(input: ResolveInput): Promise<ResolveOutcome> {
    const flowId = input.resolutionCorrelationId ?? randomUUID();

    this.logResolution(
      { flowId, mode: 'single', stage: 'flow_start' },
      'flow_start',
      {
        candidatePreview: this.previewText(input.candidateName),
        resolutionEntryPoint: input.resolutionCorrelationId ? 'resolve_by_name' : 'resolve',
        ...this.inputTraceFields(input),
        neighborK: NEIGHBOR_K,
      }
    );

    const trimmed = input.candidateName.trim();
    if (trimmed.length === 0) {
      this.logResolution({ flowId, mode: 'single', stage: 'early_exit' }, 'empty_candidate', {
        outcome: 'tier3_no_neighbors',
        ...this.inputTraceFields(input),
      });
      return { isNew: true, reason: 'tier3_no_neighbors' };
    }

    // Tier 0 — exact alias match
    const exact = await this.topicRepository.findAliasExact(trimmed);
    if (exact) {
      this.logResolution({ flowId, mode: 'single', stage: 'tier0' }, 'tier0_hit', {
        candidatePreview: this.previewText(trimmed),
        topicId: exact.topicId,
        primaryNamePreview: this.previewText(exact.primaryName, 80),
        ...this.inputTraceFields(input),
      });
      return {
        isNew: false,
        topicId: exact.topicId,
        primaryName: exact.primaryName,
        confidence: 'exact',
      };
    }

    if (!input.candidateEmbedding) {
      this.logResolution({ flowId, mode: 'single', stage: 'tier0' }, 'tier0_miss_no_embedding', {
        candidatePreview: this.previewText(trimmed),
        ...this.inputTraceFields(input),
      });
      return { isNew: true, reason: 'tier0_miss_no_embedding' };
    }

    // Tier 1 — high-confidence ANN
    const neighbors = await this.topicRepository.findAliasNeighbors(input.candidateEmbedding, NEIGHBOR_K);

    if (neighbors.length === 0) {
      this.logResolution({ flowId, mode: 'single', stage: 'tier3' }, 'tier3_new', {
        candidatePreview: this.previewText(trimmed),
        reason: 'no_neighbors',
        ...this.inputTraceFields(input),
      });
      return { isNew: true, reason: 'tier3_no_neighbors' };
    }

    const top = neighbors[0];
    const bestCompetitor = neighbors.find((n) => n.topicId !== top.topicId);

    if (
      top.score >= HIGH_CONFIDENCE_THRESHOLD &&
      (!bestCompetitor || bestCompetitor.score < HIGH_CONFIDENCE_THRESHOLD || (top.score - bestCompetitor.score) >= MARGIN_GUARD)
    ) {
      await this.recordAlias(top.topicId, trimmed, input.candidateEmbedding, input.aliasSource);
      this.logResolution({ flowId, mode: 'single', stage: 'tier1' }, 'tier1_hit', {
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
      return {
        isNew: false,
        topicId: top.topicId,
        primaryName: top.primaryName,
        confidence: 'high_vector',
      };
    }

    if (top.score < LOW_CONFIDENCE_THRESHOLD) {
      this.logResolution({ flowId, mode: 'single', stage: 'tier3' }, 'tier3_new', {
        candidatePreview: this.previewText(trimmed),
        reason: 'below_low_threshold',
        topScore: top.score,
        lowConfidenceThreshold: LOW_CONFIDENCE_THRESHOLD,
        ...this.neighborTraceFields(neighbors),
        ...this.inputTraceFields(input),
      });
      return { isNew: true, reason: 'tier3_no_neighbors' };
    }

    // Tier 2 — judge call
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
      { flowId, mode: 'single', stage: 'tier2_judge_prep' },
      'single_judge_prep',
      {
        dedupedCandidateTopicCount: distinctCandidates.length,
        offeredTopicIds: distinctCandidates.map((c) => c.topicId),
      }
    );

    let verdicts;
    try {
      this.logResolution({ flowId, mode: 'single', stage: 'tier2_judge_call' }, 'single_judge_invoked', {
        judgeBatchSize: 1,
      });
      verdicts = await llmService.judgeEntityResolution(judgeItems);
    } catch {
      this.logResolution({ flowId, mode: 'single', stage: 'tier2_judge_error' }, 'tier2_hit_new', {
        candidatePreview: this.previewText(trimmed),
        reason: 'judge_error',
        ...this.inputTraceFields(input),
        ...this.neighborTraceFields(neighbors),
      });
      return { isNew: true, reason: 'tier2_judged_new' };
    }

    const verdict = verdicts[0];
    if (!verdict || verdict.match === 'NEW') {
      this.logResolution({ flowId, mode: 'single', stage: 'tier2_verdict' }, 'tier2_hit_new', {
        candidatePreview: this.previewText(trimmed),
        verdict: verdict?.match ?? null,
        ...this.inputTraceFields(input),
        ...this.neighborTraceFields(neighbors),
      });
      return { isNew: true, reason: 'tier2_judged_new' };
    }

    const matched = distinctCandidates.find((c) => c.topicId === verdict.match);
    if (!matched) {
      this.logResolution({ flowId, mode: 'single', stage: 'tier2_verdict' }, 'tier2_hit_new', {
        candidatePreview: this.previewText(trimmed),
        reason: 'invalid_topic_id',
        verdictTopicId: verdict.match,
        offeredTopicIds: distinctCandidates.map((c) => c.topicId),
        ...this.inputTraceFields(input),
      });
      return { isNew: true, reason: 'tier2_judged_new' };
    }

    await this.recordAlias(matched.topicId, trimmed, input.candidateEmbedding, input.aliasSource);
    this.logResolution({ flowId, mode: 'single', stage: 'tier2_verdict' }, 'tier2_hit_match', {
      candidatePreview: this.previewText(trimmed),
      topicId: matched.topicId,
      primaryNamePreview: this.previewText(matched.primaryName, 80),
      verdictTopicId: verdict.match,
      topNeighborScore: top.score,
      ...this.inputTraceFields(input),
      ...this.neighborTraceFields(neighbors),
    });
    return {
      isNew: false,
      topicId: matched.topicId,
      primaryName: matched.primaryName,
      confidence: 'judged',
    };
  }

  /**
   * Records the primary `name` alias for a freshly-created topic. Idempotent.
   * Pass an embedding when available; the alias row will still be created
   * without one, but it won't participate in Tier-1 ANN until populated.
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
    const t = text.trim();
    if (t.length <= maxLen) return t;
    return `${t.slice(0, maxLen)}…`;
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
    event: string,
    fields: Record<string, unknown>
  ): void {
    recordEntityResolutionEvent(event);
    getModuleLogger('topic.resolver').info(
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
}

/**
 * Convenience: embed a single candidate name and resolve it. Pass through to
 * the resolver. On embedding failure, falls back to Tier-0-only resolution.
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
        resolutionMode: 'resolve_by_name',
        resolutionStage: 'preflight_embedding',
        event: 'embedding_failed_fallback_tier0_only',
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
