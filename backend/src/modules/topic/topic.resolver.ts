import { llmService, type JudgeResolutionItem } from '../llm/llm.service.js';
import { embeddingService } from '../shared/embedding/embedding.service.js';
import type {
    AliasNeighborRow,
    TopicAliasSource,
    TopicRepository,
} from './topic.repository.js';

/**
 * Three-tier entity resolution thresholds.
 *
 * High-confidence: ANN result alone is enough to merge. Conservative.
 * Low-confidence:  below this, no candidate is plausible — declare NEW.
 * Margin guard:    when the top two candidates are within this score gap
 *                  AND map to different topics, fall through to the judge
 *                  even if the top score is high (ambiguity protection).
 */
export const HIGH_CONFIDENCE_THRESHOLD = 0.92;
export const LOW_CONFIDENCE_THRESHOLD = 0.75;
export const MARGIN_GUARD = 0.04;

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
}

export type ResolveOutcome =
  | { isNew: true; reason: 'tier0_miss_no_embedding' | 'tier3_no_neighbors' | 'tier2_judged_new' }
  | {
      isNew: false;
      topicId: string;
      primaryName: string;
      confidence: 'exact' | 'high_vector' | 'judged';
    };

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
    const outcomes: ResolveOutcome[] = new Array(inputs.length);
    const judgePending: { idx: number; input: ResolveInput; neighbors: AliasNeighborRow[] }[] = [];

    // First pass: handle Tier 0/1/3 inline; defer Tier 2 to a single batched call
    for (let i = 0; i < inputs.length; i++) {
      const input = inputs[i];
      const trimmed = input.candidateName.trim();
      if (trimmed.length === 0) {
        outcomes[i] = { isNew: true, reason: 'tier3_no_neighbors' };
        continue;
      }

      const exact = await this.topicRepository.findAliasExact(trimmed);
      if (exact) {
        this.logResolution('tier0_hit', { candidate: trimmed, topicId: exact.topicId });
        outcomes[i] = { isNew: false, topicId: exact.topicId, primaryName: exact.primaryName, confidence: 'exact' };
        continue;
      }

      if (!input.candidateEmbedding) {
        this.logResolution('tier0_miss_no_embedding', { candidate: trimmed });
        outcomes[i] = { isNew: true, reason: 'tier0_miss_no_embedding' };
        continue;
      }

      const neighbors = await this.topicRepository.findAliasNeighbors(input.candidateEmbedding, NEIGHBOR_K);
      if (neighbors.length === 0) {
        this.logResolution('tier3_new', { candidate: trimmed, reason: 'no_neighbors' });
        outcomes[i] = { isNew: true, reason: 'tier3_no_neighbors' };
        continue;
      }

      const top = neighbors[0];
      const second = neighbors[1];
      const topicConsistent = neighbors
        .filter((n) => n.score >= HIGH_CONFIDENCE_THRESHOLD)
        .every((n) => n.topicId === top.topicId);

      if (
        top.score >= HIGH_CONFIDENCE_THRESHOLD &&
        topicConsistent &&
        (!second || second.score < HIGH_CONFIDENCE_THRESHOLD || (top.score - second.score) >= MARGIN_GUARD || second.topicId === top.topicId)
      ) {
        await this.recordAlias(top.topicId, trimmed, input.candidateEmbedding, input.aliasSource);
        this.logResolution('tier1_hit', { candidate: trimmed, topicId: top.topicId, topScore: top.score, secondScore: second?.score ?? null });
        outcomes[i] = { isNew: false, topicId: top.topicId, primaryName: top.primaryName, confidence: 'high_vector' };
        continue;
      }

      if (top.score < LOW_CONFIDENCE_THRESHOLD) {
        this.logResolution('tier3_new', { candidate: trimmed, reason: 'below_low_threshold', topScore: top.score });
        outcomes[i] = { isNew: true, reason: 'tier3_no_neighbors' };
        continue;
      }

      // Defer to judge batch
      judgePending.push({ idx: i, input, neighbors });
    }

    if (judgePending.length === 0) return outcomes;

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
      verdicts = await llmService.judgeEntityResolution(judgeItems);
    } catch {
      // Judge failed — mark all pending as NEW (conservative)
      for (const p of judgePending) {
        this.logResolution('tier2_hit_new', { candidate: p.input.candidateName.trim(), reason: 'judge_error' });
        outcomes[p.idx] = { isNew: true, reason: 'tier2_judged_new' };
      }
      return outcomes;
    }

    for (let k = 0; k < judgePending.length; k++) {
      const p = judgePending[k];
      const verdict = verdicts[k];
      const trimmed = p.input.candidateName.trim();

      if (!verdict || verdict.match === 'NEW') {
        this.logResolution('tier2_hit_new', { candidate: trimmed });
        outcomes[p.idx] = { isNew: true, reason: 'tier2_judged_new' };
        continue;
      }

      const matched = dedupedPerItem[k].find((c) => c.topicId === verdict.match);
      if (!matched) {
        this.logResolution('tier2_hit_new', { candidate: trimmed, reason: 'invalid_topic_id' });
        outcomes[p.idx] = { isNew: true, reason: 'tier2_judged_new' };
        continue;
      }

      await this.recordAlias(matched.topicId, trimmed, p.input.candidateEmbedding, p.input.aliasSource);
      this.logResolution('tier2_hit_match', { candidate: trimmed, topicId: matched.topicId, topScore: p.neighbors[0].score });
      outcomes[p.idx] = { isNew: false, topicId: matched.topicId, primaryName: matched.primaryName, confidence: 'judged' };
    }

    return outcomes;
  }

  async resolve(input: ResolveInput): Promise<ResolveOutcome> {
    const trimmed = input.candidateName.trim();
    if (trimmed.length === 0) {
      return { isNew: true, reason: 'tier3_no_neighbors' };
    }

    // Tier 0 — exact alias match
    const exact = await this.topicRepository.findAliasExact(trimmed);
    if (exact) {
      // Already a known alias; nothing to insert.
      this.logResolution('tier0_hit', { candidate: trimmed, topicId: exact.topicId });
      return {
        isNew: false,
        topicId: exact.topicId,
        primaryName: exact.primaryName,
        confidence: 'exact',
      };
    }

    if (!input.candidateEmbedding) {
      this.logResolution('tier0_miss_no_embedding', { candidate: trimmed });
      return { isNew: true, reason: 'tier0_miss_no_embedding' };
    }

    // Tier 1 — high-confidence ANN
    const neighbors = await this.topicRepository.findAliasNeighbors(input.candidateEmbedding, NEIGHBOR_K);

    if (neighbors.length === 0) {
      this.logResolution('tier3_new', { candidate: trimmed, reason: 'no_neighbors' });
      return { isNew: true, reason: 'tier3_no_neighbors' };
    }

    const top = neighbors[0];
    const second = neighbors[1];
    const topicConsistent = neighbors
      .filter((n) => n.score >= HIGH_CONFIDENCE_THRESHOLD)
      .every((n) => n.topicId === top.topicId);

    if (
      top.score >= HIGH_CONFIDENCE_THRESHOLD &&
      topicConsistent &&
      (!second || second.score < HIGH_CONFIDENCE_THRESHOLD || (top.score - second.score) >= MARGIN_GUARD || second.topicId === top.topicId)
    ) {
      await this.recordAlias(top.topicId, trimmed, input.candidateEmbedding, input.aliasSource);
      this.logResolution('tier1_hit', {
        candidate: trimmed,
        topicId: top.topicId,
        topScore: top.score,
        secondScore: second?.score ?? null,
      });
      return {
        isNew: false,
        topicId: top.topicId,
        primaryName: top.primaryName,
        confidence: 'high_vector',
      };
    }

    // Tier 3 — top neighbor is below LOW threshold: nothing plausible
    if (top.score < LOW_CONFIDENCE_THRESHOLD) {
      this.logResolution('tier3_new', {
        candidate: trimmed,
        reason: 'below_low_threshold',
        topScore: top.score,
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

    let verdicts;
    try {
      verdicts = await llmService.judgeEntityResolution(judgeItems);
    } catch {
      // Judge failed — be conservative, treat as new
      this.logResolution('tier2_hit_new', { candidate: trimmed, reason: 'judge_error' });
      return { isNew: true, reason: 'tier2_judged_new' };
    }

    const verdict = verdicts[0];
    if (!verdict || verdict.match === 'NEW') {
      this.logResolution('tier2_hit_new', { candidate: trimmed });
      return { isNew: true, reason: 'tier2_judged_new' };
    }

    const matched = distinctCandidates.find((c) => c.topicId === verdict.match);
    if (!matched) {
      // Judge returned an id we did not offer — defensive fallback to NEW
      this.logResolution('tier2_hit_new', { candidate: trimmed, reason: 'invalid_topic_id' });
      return { isNew: true, reason: 'tier2_judged_new' };
    }

    await this.recordAlias(matched.topicId, trimmed, input.candidateEmbedding, input.aliasSource);
    this.logResolution('tier2_hit_match', {
      candidate: trimmed,
      topicId: matched.topicId,
      topScore: top.score,
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
    await this.topicRepository.upsertAlias({
      topicId,
      aliasText,
      aliasTextLower: aliasText.toLowerCase(),
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

  private logResolution(event: string, fields: Record<string, unknown>): void {
    // Structured log line — Pino picks it up via stdout. Keep tag stable.
    console.log(JSON.stringify({ tag: 'entity_resolution', event, ...fields }));
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
  let embedding: number[] | null = null;
  try {
    embedding = await embeddingService.embedText(candidateName);
  } catch {
    embedding = null;
  }
  return resolver.resolve({
    candidateName,
    candidateEmbedding: embedding,
    aliasSource,
    contextHint: contextHint ?? null,
  });
}
