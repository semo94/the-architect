import categorySchema, { getAllExamplesFromSubcategory } from './categories.js';

export const INSIGHT_RELATION_KINDS = [
  'PREREQUISITE_OF',
  'BUILDS_ON',
  'PART_OF',
  'TYPE_OF',
  'EXAMPLE_OF',
  'IMPLEMENTS',
  'CAUSES',
  'USED_WITH',
  'ALTERNATIVE_TO',
  'SIMILAR_TO',
  'TRADEOFF_WITH',
] as const;

export type InsightRelationKind = (typeof INSIGHT_RELATION_KINDS)[number];

export const MAX_INSIGHTS_TOTAL = 10;

export const INSIGHT_PER_KIND_CAP: Record<InsightRelationKind, number> = {
  PART_OF: 1,
  TYPE_OF: 1,
  EXAMPLE_OF: 1,
  PREREQUISITE_OF: 2,
  BUILDS_ON: 2,
  IMPLEMENTS: 2,
  CAUSES: 2,
  USED_WITH: 3,
  ALTERNATIVE_TO: 3,
  SIMILAR_TO: 3,
  TRADEOFF_WITH: 3,
};

/** Lower index = higher retention priority when applying the total cap. */
export const INSIGHT_KIND_PRIORITY: InsightRelationKind[] = [
  'PREREQUISITE_OF',
  'BUILDS_ON',
  'PART_OF',
  'TYPE_OF',
  'EXAMPLE_OF',
  'IMPLEMENTS',
  'CAUSES',
  'USED_WITH',
  'ALTERNATIVE_TO',
  'SIMILAR_TO',
  'TRADEOFF_WITH',
];

const VALID_KINDS = new Set<string>(INSIGHT_RELATION_KINDS);

const KIND_PRIORITY_INDEX = new Map<InsightRelationKind, number>(
  INSIGHT_KIND_PRIORITY.map((kind, index) => [kind, index])
);

export interface InsightSubcategoryContext {
  categoryDescription: string;
  subcategoryDescription: string;
  topicTypes: string[];
  exampleNames: string[];
}

export interface RawInsightSuggestion {
  targetName: string;
  relationKind: string;
}

export function getInsightSubcategoryContext(
  category: string,
  subcategory: string,
  maxExamples = 12
): InsightSubcategoryContext | null {
  const categoryEntry = categorySchema[category];
  const sub = categoryEntry?.subcategories[subcategory];
  if (!categoryEntry || !sub) {
    return null;
  }

  const exampleNames = getAllExamplesFromSubcategory(sub)
    .map((e) => e.name)
    .slice(0, maxExamples);

  return {
    categoryDescription: categoryEntry.description,
    subcategoryDescription: sub.description,
    topicTypes: [...sub.topicTypes],
    exampleNames,
  };
}

export function formatInsightSubcategoryContextForPrompt(
  ctx: InsightSubcategoryContext | null
): string {
  if (!ctx) {
    return 'Category context unavailable; rely on granularity rules below.';
  }

  const examples =
    ctx.exampleNames.length > 0
      ? ctx.exampleNames.join(', ')
      : '(no examples in schema)';

  return [
    `Category: ${ctx.categoryDescription}`,
    `Subcategory: ${ctx.subcategoryDescription}`,
    `Topic types at this level: ${ctx.topicTypes.join(', ')}`,
    `Example graph nodes at this granularity (not a menu): ${examples}`,
  ].join('\n');
}

function normalizeTargetName(name: string): string {
  return name.trim().replace(/^\[\[|\]\]$/g, '').trim();
}

function isInsightRelationKind(kind: string): kind is InsightRelationKind {
  return VALID_KINDS.has(kind);
}

function kindPriority(kind: InsightRelationKind): number {
  return KIND_PRIORITY_INDEX.get(kind) ?? INSIGHT_KIND_PRIORITY.length;
}

/**
 * Enforces relation-aware caps, total cap, self-exclusion, and in-batch target dedupe.
 */
export function sanitizeInsightSuggestions(
  items: RawInsightSuggestion[],
  sourceTopicName: string
): RawInsightSuggestion[] {
  const sourceLower = normalizeTargetName(sourceTopicName).toLowerCase();
  const seenTargets = new Set<string>();
  const perKindCount = new Map<InsightRelationKind, number>();
  const kept: RawInsightSuggestion[] = [];

  for (const item of items) {
    const targetName = normalizeTargetName(item.targetName ?? '');
    const relationKind = (item.relationKind ?? '').trim().toUpperCase();

    if (targetName.length === 0 || !isInsightRelationKind(relationKind)) {
      continue;
    }

    if (targetName.toLowerCase() === sourceLower) {
      continue;
    }

    const targetKey = targetName.toLowerCase();
    if (seenTargets.has(targetKey)) {
      continue;
    }

    const kindCount = perKindCount.get(relationKind) ?? 0;
    if (kindCount >= INSIGHT_PER_KIND_CAP[relationKind]) {
      continue;
    }

    seenTargets.add(targetKey);
    perKindCount.set(relationKind, kindCount + 1);
    kept.push({ targetName, relationKind });
  }

  if (kept.length <= MAX_INSIGHTS_TOTAL) {
    return kept;
  }

  // Drop lowest-priority kinds first; within a kind, drop later items (higher index).
  const indexed = kept.map((item, originalIndex) => ({
    item,
    originalIndex,
    priority: kindPriority(item.relationKind as InsightRelationKind),
  }));

  indexed.sort((a, b) => {
    if (b.priority !== a.priority) {
      return b.priority - a.priority;
    }
    return b.originalIndex - a.originalIndex;
  });

  const toRemove = indexed.slice(0, kept.length - MAX_INSIGHTS_TOTAL);
  const removeIndices = new Set(toRemove.map((entry) => entry.originalIndex));

  return kept.filter((_, index) => !removeIndices.has(index));
}

export function formatPerKindCapsForPrompt(): string {
  return INSIGHT_RELATION_KINDS.map(
    (kind) => `- ${kind}: max ${INSIGHT_PER_KIND_CAP[kind]}`
  ).join('\n');
}
