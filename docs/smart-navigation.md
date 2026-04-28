# Smart Navigation — Hyperlinks + Insights

**Status:** Implemented  
**Last validated against code:** 2026-04-28

---

## 1. Product Vision

Topics in Breadthwise are currently disconnected islands. A user learns about CQRS and has no visual path to Event Sourcing, even though the content naturally references it. The Smart Navigation feature turns topics into a navigable knowledge graph by activating two surfaces on any **owned** topic:

1. **Inline hyperlinks** — words in the topic description that naturally reference other topics animate into tappable spans after the content finishes loading.
2. **Insights panel** — a bottom sheet reachable via a bulb icon in the topic header that surfaces semantically related topics grouped by learning relationship type (prerequisites, alternatives, commonly used with, etc.).

Both surfaces let the user navigate to another topic. If that topic is already in their bucket, it opens directly on the topic detail screen. If not, it opens on the same universal discovery preview screen used by Surprise Me and Guide Me — complete with [Dismiss / Add to Bucket / Acquire Now].

The graph grows organically as users discover topics. No admin work or manual curation is required.

---

## 2. Core UX Rules

These rules are the source of truth. All technical decisions below are derived from them.

**Rule 1 — Hyperlinks and Insights are only active on owned topics.**  
During a discovery preview (Surprise, Guide, or Deep Link), the topic content renders as plain text — no hyperlinks, no insights bulb. Only after the user accepts the topic (Add to Bucket or Acquire Now) and views it on the topic detail screen do these surfaces activate.

**Rule 2 — Navigation always returns to the originating topic.**  
When a user taps a hyperlink from Topic A and lands on Topic B, pressing back returns them to Topic A exactly where they were. Stack navigation (`router.push`) is used, never replace.

**Rule 3 — Ownership determines the destination, not the user.**  
The frontend does not decide whether a hyperlink tap goes to the topic detail screen or the discovery preview. The backend always answers the ownership question. The routing decision is made server-side and is encoded in the `GET /topics/:id` and `GET /topics/:id/insights` responses at load time — not at tap time.

**Rule 4 — No loading state on tap.**  
When a user taps a hyperlink, the navigation is instant. Ownership has already been resolved when the page loaded. There is no per-tap API call.

**Rule 5 — Discovery preview screens are never nested.**  
From within a discovery preview (reached via a hyperlink tap), hyperlinks and the insights bulb are not active. The user must accept the topic first. This prevents unbounded discovery chains from an unaccepted topic.

---

## 3. Navigation Flows

### 3.1 Tapping a hyperlink on an owned topic

```
User reads Topic A (owned, in their bucket)
  │
  │ tap [[Topic B]]
  │
  ├── targetTopicId is resolved (not null) ──────────→ router.push('/topic-detail?topicId=<id>')
  │                                                     (instant navigation — ownership was pre-resolved at page load)
  │
  └── targetTopicId is null (unresolved) ────────────→ router.push('/discover-deep-link?topicName=<name>')
                                                        (target topic not yet in DB — backend fuzzy-matches or generates)
                                                        ┌─ [Dismiss]       → router.back() to Topic A
                                                        ├─ [Add to Bucket] → updateStatus, router.back() to Topic A
                                                        └─ [Acquire Now]   → updateStatus, router.replace('/quiz')
```

> **Note on ownership vs routing:** The `owned` flag on a hyperlink item controls the _visual style_ of the link span (solid underline for owned, dashed + `+` prefix for discoverable). It does **not** determine the navigation target — that is determined solely by whether `targetTopicId` is null. Any resolved hyperlink (`targetTopicId` set) navigates to `/topic-detail` regardless of the `owned` value.

### 3.2 Tapping an Insights chip on an owned topic

```
User taps bulb icon on Topic A header
  │
  └── Insights bottom sheet opens — instant if insightsStatus is 'ready' (data already in parent state);
  │    skeleton if still 'processing' (parent SSE delivers completion event, panel re-renders automatically);
  │    POST trigger + skeleton if null or 'failed' (bulb tap calls POST /topics/:id/insights)
        │
        │ tap chip "Topic C"
        │
        ├── targetTopicId resolved ─→ dismiss sheet, router.push('/topic-detail?topicId=<id>')
        └── targetTopicId null ─────→ dismiss sheet, router.push('/discover-deep-link?topicName=<name>')
```

> **Note:** Navigation from insight chips follows the same 2-way pattern as hyperlinks: resolved `targetTopicId` always navigates to `/topic-detail`; null `targetTopicId` goes to `/discover-deep-link?topicName=...`.

`hyperlinksStatus` and `insightsStatus` mirror the corresponding columns on the `topics` table. Values: `'processing'` (background block in flight), `'ready'` (complete), `'failed'` (async generation failed — FE can re-trigger), `null` (pre-feature topic). The FE uses these status values to decide whether to open a `GET /topics/:id/events` SSE connection for push updates.

`GET /topics/:id/insights` returns a `status` field alongside the ownership-annotated groups:

```json
{
  "topicId": "...",
  "status": "ready",
  "groups": [
    {
      "relationKind": "PREREQUISITE_OF",
      "heading": "Prerequisites",
      "items": [
        {
          "targetName": "Distributed Systems",
          "targetTopicId": "xyz",
          "owned": true
        },
        {
          "targetName": "CAP Theorem",
          "targetTopicId": null,
          "owned": false
        }
      ]
    }
  ]
}
```

When `status` is `'processing'`, `groups` is `[]` and the panel shows a skeleton — the parent `TopicDetailScreen` is already receiving push updates via `GET /topics/:id/events` and will update the panel automatically when insights become ready. When `status` is `'failed'`, `groups` is `[]` and the panel shows a Retry button — tapping it calls `POST /topics/:id/insights` to re-trigger async generation.

The frontend uses `owned` to decide the visual style and the navigation destination at render time. No logic runs at tap time beyond calling `router.push`.

---

## 4. Relationship Model

### 4.1 Unified edge table: `topic_relationships`

All topic-to-topic connections — whether a content mention (hyperlink) or a semantic relationship (insight) — are edges in one table. The `kind` column discriminates.

| Column            | Type                      | Notes                                                      |
| ----------------- | ------------------------- | ---------------------------------------------------------- |
| `id`              | uuid PK                   |                                                            |
| `source_topic_id` | uuid NOT NULL FK → topics | ON DELETE CASCADE                                          |
| `target_topic_id` | uuid NULL FK → topics     | ON DELETE SET NULL; null until the target topic is created |
| `target_name`     | varchar(255) NOT NULL     | Canonical name as emitted by LLM                           |
| `kind`            | varchar(16) NOT NULL      | `'hyperlink'` or `'insight'`                               |
| `relation_kind`   | varchar(32) NULL          | NULL for hyperlinks; see §4.2 for insight values           |
| `created_at`      | timestamp default now()   |                                                            |
| `resolved_at`     | timestamp NULL            | Set when `target_topic_id` is first populated              |

**Hyperlink rows** (`kind = 'hyperlink'`): Record that Topic A's content mentions Topic B by name. Created fire-and-forget when a topic is first generated. `relation_kind` is always NULL.

**Insight rows** (`kind = 'insight'`): Record a semantic learning relationship between Topic A and Topic B. Generated fire-and-forget at new topic creation time. The `insights_status` column on the `topics` table tracks state: `'processing'` while the block runs, `'ready'` on success, `'failed'` if the block errors. The FE receives status push events via `GET /topics/:id/events` — no client-side polling loop. On `'failed'`, the FE shows a Retry button; tapping it calls `POST /topics/:id/insights` to re-trigger async generation. `null` means pre-feature topic — bulb tap calls `POST /topics/:id/insights` to generate for the first time. Carries `relation_kind`. Group headings are computed deterministically from `relation_kind` at response time — not stored.

### 4.2 Relationship taxonomy (Insights only)

Every `relation_kind` answers a specific learner question. Directional edges (A → B) have a specific meaning based on direction. Bidirectional relationships are symmetric by nature — each topic's LLM independently generates rows from its own perspective. Bidirectional visibility is emergent: both sides of a symmetric relationship become visible once the bulb has been tapped on each topic independently.

#### Directional (A → B, direction carries meaning)

| `relation_kind`   | Learner question                   | Example                                        |
| ----------------- | ---------------------------------- | ---------------------------------------------- |
| `PREREQUISITE_OF` | "What must I learn before B?"      | CAP Theorem → Consistency Models               |
| `BUILDS_ON`       | "What helps to know before B?"     | Distributed Systems → Event Sourcing           |
| `PART_OF`         | "What is A a component of?"        | Load Balancing → Scalability                   |
| `TYPE_OF`         | "What kind of thing is A?"         | Kafka → Message Queue                          |
| `EXAMPLE_OF`      | "What is A a concrete example of?" | Saga Pattern → Distributed Transaction Pattern |
| `IMPLEMENTS`      | "What concretely realizes B?"      | Kafka → Event Streaming                        |
| `CAUSES`          | "What happens as a result of A?"   | Caching → Reduced Read Latency                 |

#### Bidirectional (A ↔ B, symmetric by nature)

| `relation_kind`  | Learner question                     | Example                    |
| ---------------- | ------------------------------------ | -------------------------- |
| `USED_WITH`      | "What is commonly used with A?"      | Event Sourcing ↔ CQRS      |
| `ALTERNATIVE_TO` | "What can I use instead of A?"       | Event Sourcing ↔ CRUD      |
| `SIMILAR_TO`     | "What is conceptually related to A?" | Pub/Sub ↔ Event Streaming  |
| `TRADEOFF_WITH`  | "What do I give up by choosing A?"   | Consistency ↔ Availability |

### 4.3 Deduplication — two partial unique indexes

A single `UNIQUE (source_topic_id, target_name, kind, relation_kind)` constraint silently fails for hyperlinks because `NULL ≠ NULL` in Postgres unique-index evaluation — `ON CONFLICT DO NOTHING` never fires and duplicates accumulate. Two partial indexes solve this cleanly:

```sql
-- One hyperlink row per (source, target name) pair
CREATE UNIQUE INDEX uq_topic_relationships_hyperlink
  ON topic_relationships (source_topic_id, target_name)
  WHERE kind = 'hyperlink';

-- Same target may appear under different relation_kinds in insights, but not twice in the same bucket
CREATE UNIQUE INDEX uq_topic_relationships_insight
  ON topic_relationships (source_topic_id, target_name, relation_kind)
  WHERE kind = 'insight';
```

### 4.4 How the graph grows organically

The graph self-assembles through normal user activity — no curation needed:

```
User A discovers "CQRS" (brand-new, LLM-generated)
  → [DONE] sent to client
  → synchronously: hyperlinks_status = 'processing', hyperlinks_started_at = now(),
                   insights_status = 'processing', insights_started_at = now() written to topics row
  → fire-and-forget Block 1 (hyperlinks): regex-extracts [[markers]] from validated content fields
       → [[Event Sourcing]], [[Kafka]], [[DDD]] found; 3 hyperlink rows inserted
       → Kafka and DDD have no DB row yet → target_topic_id = null
       → sets hyperlinks_status = 'ready'
  → fire-and-forget Block 2 (insights): calls generateInsights LLM
       → insight rows inserted → sets insights_status = 'ready'
  → GET /topics/:id (initial FE load) → { hyperlinksStatus: 'processing', insightsStatus: 'processing', hyperlinks: [] }
  → FE opens GET /topics/:id/events SSE connection (server polls DB every 3s)
  → SSE server sends { type: 'status', hyperlinksStatus: 'ready', insightsStatus: 'ready', hyperlinks: [...] }
  → FE receives status event → topic state updated → hyperlink chips activate automatically, no remount
  → SSE server detects both statuses ready → sends { type: 'done' } → SSE connection closed
  → bulb tap opens InsightsPanel; GET /topics/:id/insights returns groups instantly

User B later discovers "Kafka" (via Surprise Me)
  → topics row for Kafka created
  → Reverse resolution: finds CQRS→Kafka hyperlink row (target_topic_id was null)
  → sets target_topic_id = Kafka.id, resolved_at = now() ✓
  → next time User A opens CQRS (useFocusEffect re-fetch): hyperlinks response includes Kafka with targetTopicId filled
```

---

## 5. How Relationships Are Created (Backend Lifecycle)

### 5.1 Hyperlinks — at topic creation, fire-and-forget

When any topic is newly generated (Surprise, Guide, or Deep Link mode), the LLM emits inline `[[markers]]` in content fields. Before `callbacks.onComplete()` fires (and before `[DONE]` is sent to the client), `setProcessingStatus` is awaited to record the processing state atomically. The two fire-and-forget blocks are then kicked off. The following runs asynchronously in `runHyperlinkExtractionAsync`:

1. **Extract topic names** via `extractMentionedTopics(validated, topicName)` — scans each allowed field (`what`, `why`, `pro_0`–`pro_4`, `con_0`–`con_4`, `compare_0_tech`, `compare_1_tech`) for `[[...]]` captures, deduplicates case-insensitively, and excludes self-references.

2. For each extracted name: call `findByNameFuzzy` to attempt resolution. Build a `topic_relationships` row.
3. Batch insert with `ON CONFLICT DO NOTHING`.
4. Run reverse resolution (§5.3).
5. Update the topic row: `UPDATE topics SET hyperlinks_status = 'ready' WHERE id = $1`.

On failure: write `hyperlinksStatus: 'failed'` to the DB. On the next `TopicDetailScreen` load, the frontend detects `hyperlinksStatus === 'failed'` and silently calls `POST /topics/:id/hyperlinks` to re-trigger extraction. The client has already received `[DONE]` — this block has zero UX impact on the SSE stream.

**`upsertTopic` — applies to ALL modes:** The existing `findByName → create` pattern is a TOCTOU race: two concurrent LLM completions for the same topic name both find no existing row and both attempt an INSERT, causing the second to throw a unique-constraint violation. `upsertTopic` uses an upsert pattern regardless of discovery mode:

```typescript
// In TopicRepository
async upsertTopic(data: NewTopic): Promise<Topic> {
  const inserted = await db
    .insert(topics)
    .values(data)
    .onConflictDoNothing()
    .returning();

  if (inserted.length > 0) {
    return inserted[0];
  }

  // Another concurrent request won the insert race — fetch the existing row.
  const existing = await db.select().from(topics).where(eq(topics.name, data.name));
  return existing[0]; // guaranteed to exist
}
```

All callers of `topicRepository.create(...)` in the topic-creation path use `topicRepository.upsertTopic(...)`. The separate `create` method remains available for other callers (e.g. tests) that require strict insert semantics.

### 5.2 Insights — at new topic creation, fire-and-forget (alongside hyperlinks)

When a brand-new topic is generated (any mode), **before** `callbacks.onComplete()` fires, two **independent** fire-and-forget blocks are kicked off in parallel — one for hyperlinks (§5.1) and one for insights:

```typescript
// Synchronous DB write before any async work — sets both statuses + timestamps atomically
// This runs BEFORE callbacks.onMeta() and callbacks.onComplete() are called.
await topicRepository.setProcessingStatus(topicId, {
  hyperlinksStatus: "processing",
  hyperlinksStartedAt: new Date(),
  insightsStatus: "processing",
  insightsStartedAt: new Date(),
});

// Both fire-and-forget blocks are independent and run in parallel
void runHyperlinkExtractionAsync(topicId, validated);
void runInsightGenerationAsync(topic);

// Learning resources are then fetched synchronously, then:
callbacks.onMeta({ topicId: topic.id, cached: false });
callbacks.onComplete(); // writes [DONE] and closes the socket
```

The `setProcessingStatus` call is a single `UPDATE topics SET ... WHERE id = $1` — negligible latency. It runs before `[DONE]` is delivered to the client. The status flags and timestamps are set before either async block begins, giving the `GET /topics/:id/events` SSE endpoint a reliable baseline immediately.

This code path executes only in the **new-topic branch** of `discoverTopic()`. `streamCachedTopic` calls `callbacks.onComplete()` and returns without writing any status or launching any fire-and-forget blocks — cached topics already have `hyperlinks_status = 'ready'` and `insights_status = 'ready'` from their original creation.

The insights fire-and-forget block:

1. Call `llmService.generateInsights(topic)` (5–15s, dedicated prompt — §6.2).
2. Persist returned items: filter self-references, dedupe by `(relation_kind, target_name)`, fuzzy-resolve each `targetName`, insert rows with `ON CONFLICT DO NOTHING`, run reverse resolution (§5.3).
3. Update the topic row: `UPDATE topics SET insights_status = 'ready' WHERE id = $1`.
4. **On failure:** write `insights_status = 'failed'` to the DB. The SSE endpoint delivers this status to the client; the panel surfaces a Retry button. The FE re-triggers via `POST /topics/:id/insights`.

This block runs **only for newly LLM-generated topics**. Cached topics (served by `streamCachedTopic`) already have insight rows and `insights_status = 'ready'` from when they were first created — no second generation is triggered.

**`GET /topics/:id/insights` — pure read endpoint:**

`GET /topics/:id/insights` is a side-effect-free read. It never triggers LLM generation. The endpoint inspects `insights_status` and responds:

| DB state                         | Endpoint response                                        |
| -------------------------------- | -------------------------------------------------------- |
| `insights_status = 'ready'`      | `{ status: 'ready', groups: [...] }` — instant cache hit |
| `insights_status = 'processing'` | `{ status: 'processing', groups: [] }`                   |
| `insights_status = 'failed'`     | `{ status: 'failed', groups: [] }`                       |
| `insights_status = null`         | `{ status: 'processing', groups: [] }`                   |

**`POST /topics/:id/insights` — trigger endpoint:**

The FE calls this to start (or restart) async generation. Idempotent: if `insights_status` is already `'processing'`, returns `{ status: 'processing', groups: [] }` without firing a duplicate job. Otherwise: sets `insights_status = 'processing'`, fires `runInsightGenerationAsync` (fire-and-forget), returns `{ status: 'processing', groups: [] }` with HTTP 202. The FE opens the `GET /topics/:id/events` SSE connection after this call to receive the completion push.

### 5.3 Reverse resolution — runs inside all fire-and-forget blocks

When a new topic is inserted, existing unresolved `topic_relationships` rows that name this topic become resolvable. In the same async block as hyperlink insertion or insight persistence:

1. Exact case-insensitive update first:
   ```sql
   UPDATE topic_relationships
   SET target_topic_id = :newTopicId, resolved_at = now()
   WHERE target_topic_id IS NULL
     AND LOWER(target_name) = LOWER(:newTopicName)
   ```
2. Trigram fallback (only if step 1 affected zero rows):
   ```sql
   UPDATE topic_relationships
   SET target_topic_id = :newTopicId, resolved_at = now()
   WHERE target_topic_id IS NULL
     AND similarity(LOWER(target_name), LOWER(:newTopicName)) >= 0.45
   ```

Idempotent — the `target_topic_id IS NULL` guard prevents double-writes. The partial index `idx_topic_relationships_unresolved` bounds the scan.

> **Threshold:** `FUZZY_MATCH_THRESHOLD = 0.45` — handles plural/singular and minor phrasing variants; rejects fundamentally different names.

---

## 6. LLM Output Contract

### 6.1 Hyperlinks in topic content

The LLM emits **inline `[[Canonical Topic Name]]` markers** inside specific content fields. No `mentioned_topics` array is required from the LLM. Topic name extraction is performed entirely server-side after the response is parsed — the backend applies the `\[\[([^\]]+)\]\]` regex to the allowed fields of the validated `FlatTopicContent` object. This gives a single authoritative source of truth and eliminates the LLM consistency requirement of keeping a separate array in sync with inline markers.

**Fields that may contain markers:**
`what`, `why`, `pro_0`–`pro_4`, `con_0`–`con_4`, `compare_0_tech`, `compare_1_tech`

**Fields that must never contain markers:**
`name`, `topicType`, `category`, `subcategory`, `compare_0_text`, `compare_1_text`, `resource_*_title`, `resource_*_url`

Markers in forbidden fields are stripped server-side before persistence. Markers in allowed fields are parsed by `extractMentionedTopics(validated, topicName)` (see §5.1) after `FlatTopicContentSchema.parse()` succeeds — no pre-validation raw-object access required.

**LLM instructions (appended to FORMATTING block in system prompt):**

> When your content naturally references other architecturally significant topics, wrap the full canonical name in double brackets: `[[Canonical Topic Name]]`. Only annotate genuine references — do not alter your writing to insert mentions. Use the full standard name, not abbreviations (`[[Command Query Responsibility Segregation]]`, not `[[CQRS]]`). Markers are allowed only in `what`, `why`, `pro_0`–`pro_4`, `con_0`–`con_4`, `compare_0_tech`, and `compare_1_tech`. Never place markers in name, category, subcategory, comparison text fields, or resource fields.

No `mentioned_topics` field is added to the JSON scaffold. The LLM contract is a single output format: inline markers only.

### 6.2 Insights LLM output

New prompt template `promptTemplates.generateInsights(topic)`. Returns JSON:

```json
{
  "groups": [
    {
      "relationKind": "PREREQUISITE_OF",
      "items": [
        { "targetName": "Distributed Systems" },
        { "targetName": "CAP Theorem" }
      ]
    }
  ]
}
```

Constraints given to the LLM:

- Maximum 10 total items across all groups. No minimum — never fabricate a relationship to meet a count.
- Maximum 3 items per group. Omit a group entirely if you have no confident items for it.
- `targetName` must be a canonical full name an architect would recognize.
- Must NOT include the source topic itself.
- `relationKind` must be one of the 11 values in §4.2.
- Quality over quantity: two strong, confident relationships are better than five weak ones.

### 6.3 Deterministic heading computation (backend)

Group headings are computed from `relationKind` by the backend — not by the LLM, not stored in the database. The frontend renders whatever `heading` is returned in the API response and has no knowledge of this mapping. This fully decouples insights business logic from the frontend.

```typescript
const INSIGHT_HEADING: Record<string, string> = {
  PREREQUISITE_OF: "Prerequisites",
  BUILDS_ON: "Helpful Background",
  PART_OF: "Part Of",
  TYPE_OF: "Type Of",
  EXAMPLE_OF: "Example Of",
  IMPLEMENTS: "Implements",
  CAUSES: "Leads To",
  USED_WITH: "Used With",
  ALTERNATIVE_TO: "Alternatives",
  SIMILAR_TO: "Similar Topics",
  TRADEOFF_WITH: "Tradeoffs",
};
```

> **Note:** Headings are static strings — they do not include the topic name. The mapping object is named `INSIGHT_HEADING` (singular). The frontend renders these strings verbatim as section headers in the InsightsPanel.

### 6.4 Marker stripping utility

Markers are stored in the DB as-is. Any code path that serves topic content outside a hyperlink-aware render context must strip them before exposing the text. A single regex utility handles this:

```typescript
// backend/src/modules/topic/topic.utils.ts  (or a shared utils module)
export function stripMarkers(text: string): string {
  return text.replace(/\[\[([^\]]+)\]\]/g, "$1");
}
```

This preserves the inner topic name and removes only the `[[` and `]]` brackets. The same regex used by `extractMentionedTopics` — just replacing instead of capturing.

**Backend call sites (apply `stripMarkers` before using content as text):**

- **Quiz service** (`backend/src/modules/quiz/quiz.service.ts`): apply `stripMarkers` to all content fields before passing them to `promptTemplates.generateQuizQuestions()`. The quiz service reads directly from the DB row, so the DB column names apply here (`contentWhat`, `contentWhy`):

  ```typescript
  content: {
    what:  stripMarkers(topic.contentWhat),
    why:   stripMarkers(topic.contentWhy),
    pros:  (topic.contentPros as string[]).map(stripMarkers),
    cons:  (topic.contentCons as string[]).map(stripMarkers),
    compareToSimilar: (topic.contentCompareToSimilar as { topic: string; comparison: string }[])
      .map(c => ({ topic: c.topic, comparison: stripMarkers(c.comparison) })),
  },
  ```

- Any future endpoint that returns topic content as a plain-text snippet (search results, admin tooling, notifications, etc.).

**Frontend call sites:**

- `LinkedText` without `getLinkVariant` already strips markers to plain text (§8.1, behaviour 2) — this covers all discovery previews, the streaming path via `TypewriterText` (§8.2), and the pre-feature-topic fallback in section components (§8.3). No additional frontend call sites are needed as long as all content rendering flows through `LinkedText` rather than raw `<Text>`.

---

## 7. API Contract

### 7.1 Extended `POST /topics` request

File: [backend/src/modules/topic/topic.schemas.ts](../backend/src/modules/topic/topic.schemas.ts)

Add `'deep_link'` to the mode enum and optional `topicId` / `topicName` fields. When `targetTopicId` is set in the hyperlinks response, the frontend navigates by `topicId` directly (avoiding fuzzy matching). When `targetTopicId` is null (unresolved hyperlink), the frontend navigates by `topicName` and the backend fuzzy-matches or generates the topic.

```typescript
// Current
mode: z.enum(["surprise", "guided"]);

// New
mode: z.enum(["surprise", "guided", "deep_link"]);
topicId: z.string().uuid().optional();
topicName: z.string().optional();

// Refine: at least one of topicId or topicName required when mode === 'deep_link';
// both forbidden when mode is 'surprise' or 'guided'
```

For `deep_link` mode the backend skips `findUnservedTopicForUser` (which picks a random unserved topic) and instead resolves the topic via this three-step chain:

1. If `topicId` is provided → look up the topic by ID directly.
2. If only `topicName` is provided → call `findByNameFuzzy(topicName)`.
3. If still not found → treat as a new topic and generate via LLM (STATE 1).

When step 3 creates a new topic, `getOrCreateTopic` uses the upsert pattern defined in §5.1 (`upsertTopic`). This guards against the realistic race where two users simultaneously tap hyperlinks to the same unresolved topic name. The `deep_link` path calls the same `upsertTopic` method as all other modes — no special-casing required.

`topicName` received from the client is trimmed of leading/trailing whitespace and normalized to single internal spaces before fuzzy matching. This prevents spurious mismatches from whitespace artefacts in hyperlink markers.

The SSE response for `deep_link` is identical to the existing cached/new topic response — no new event types. The `meta` event carries `{ topicId, cached: true|false }` as today.

`discoveryMethod` column on `user_topics` gains `'deep_link'` as a valid value. This is a varchar column — no migration change needed.

`UpdateTopicStatusRequestSchema` (`PATCH /topics/:id` request body) must also have `'deep_link'` added to its `discoveryMethod` enum — without this, the action buttons in `discover-deep-link.tsx` will receive a 400 from the status update call:

```typescript
// In topic.schemas.ts — UpdateTopicStatusRequestSchema
discoveryMethod: z.enum(["surprise", "guided", "deep_link"]).optional(),
```

### 7.2 Extended `GET /topics/:id` response

File: [backend/src/modules/topic/topic.service.ts](../backend/src/modules/topic/topic.service.ts), [backend/src/modules/topic/topic.schemas.ts](../backend/src/modules/topic/topic.schemas.ts)

The `getTopicDetail` response is extended with a `hyperlinks` array. `getTopicDetail` has no background work to trigger — insights are generated at topic creation time (§5.2). The repository fetches hyperlinks via a single JOIN:

```sql
SELECT
  tr.id            AS "relationshipId",
  tr.target_name   AS "targetName",
  tr.target_topic_id AS "targetTopicId",
  CASE WHEN ut.user_id IS NOT NULL THEN true ELSE false END AS owned
FROM topic_relationships tr
LEFT JOIN user_topics ut
  ON ut.topic_id = tr.target_topic_id
  AND ut.user_id = :userId
WHERE tr.source_topic_id = :topicId
  AND tr.kind = 'hyperlink'
```

Response shape addition:

```typescript
hyperlinksStatus: "processing" | "ready" | "failed" | null; // null = pre-feature topic
insightsStatus: "processing" | "ready" | "failed" | null; // null = pre-feature topic
hyperlinks: Array<{
  relationshipId: string;
  targetName: string;
  targetTopicId: string | null; // null = topic not yet in DB
  owned: boolean; // false when targetTopicId is null
}>;
```

When `targetTopicId` is null, `owned` is always false. The frontend renders the span but tapping it navigates to `/discover-deep-link?topicName=...` (the deep_link request carries `topicName`; see §7.1 fallback chain).

### 7.3 `POST /topics/:id/hyperlinks`

Files: [backend/src/modules/topic/topic.routes.ts](../backend/src/modules/topic/topic.routes.ts), [backend/src/modules/topic/topic.controller.ts](../backend/src/modules/topic/topic.controller.ts)

- **Auth:** authenticated user. Topic must exist (404 if not found).

Idempotent trigger for (re-)running hyperlink extraction. Returns HTTP 202 immediately. Behavior:

- If `hyperlinks_status` is already `'ready'` or `'processing'`: returns 202 with no side effects (no new block is kicked off).
- If `hyperlinks_status` is `null`, `'failed'`, or not set: sets `hyperlinks_status = 'processing'`, `hyperlinks_started_at = now()`, then launches `runHyperlinkExtractionAsync` as a fire-and-forget.

The frontend calls this endpoint **automatically on page load** when `hyperlinksStatus === 'failed'` (auto-retry without user interaction). The open SSE connection will deliver the updated status once the block completes.

```
POST /topics/:id/hyperlinks

Request body: (none)

Response 202:
{
  "message": "Hyperlinks processing triggered"
}

Response 404:
{
  "message": "Topic not found"
}
```

### 7.4 `GET /topics/:id/insights` and `POST /topics/:id/insights`

Files: [backend/src/modules/topic/topic.routes.ts](../backend/src/modules/topic/topic.routes.ts), [backend/src/modules/topic/topic.controller.ts](../backend/src/modules/topic/topic.controller.ts), [backend/src/modules/topic/topic.service.ts](../backend/src/modules/topic/topic.service.ts)

- **Auth:** authenticated user. No ownership check — insights are a per-topic shared cache.

**`GET /topics/:id/insights`** (idempotent read)

Pure read — never triggers LLM generation. Returns current status and groups:

| DB state                         | Response                                                 |
| -------------------------------- | -------------------------------------------------------- |
| `insights_status = 'ready'`      | `{ status: 'ready', groups: [...] }` — instant cache hit |
| `insights_status = 'processing'` | `{ status: 'processing', groups: [] }`                   |
| `insights_status = 'failed'`     | `{ status: 'failed', groups: [] }`                       |
| `insights_status = null`         | `{ status: 'processing', groups: [] }`                   |

**`POST /topics/:id/insights`** (trigger, HTTP 202)

Starts or restarts async insight generation. Idempotent — if already `'processing'`, returns immediately without firing a duplicate job. Otherwise: sets `insights_status = 'processing'`, `insights_started_at = now()`, fires `runInsightGenerationAsync` (fire-and-forget), returns `{ status: 'processing', groups: [] }`.

- **Response:**

```typescript
{
  topicId: string;
  status: "processing" | "ready" | "failed";
  groups: Array<{
    relationKind: string; // raw value for client-side ordering
    heading: string; // backend-computed via INSIGHT_HEADINGS mapping (§6.3); shown in UI
    items: Array<{
      targetName: string;
      targetTopicId: string | null;
      owned: boolean;
    }>;
  }>; // empty when status is 'processing' or 'failed'
}
```

Ownership annotation uses the same LEFT JOIN pattern as §7.2.

### 7.5 New `GET /topics/:id/events` SSE endpoint

Files: [backend/src/modules/topic/topic.routes.ts](../backend/src/modules/topic/topic.routes.ts), [backend/src/modules/topic/topic.controller.ts](../backend/src/modules/topic/topic.controller.ts)

- **Auth:** authenticated user.
- **Method:** GET, `Content-Type: text/event-stream`.
- **Purpose:** Pushes status updates to the client as the hyperlinks and insights fire-and-forget blocks complete. The server polls the DB every 3s (`POLL_INTERVAL_MS = 3000`, `MAX_POLLS = 40` → 120s ceiling) — the client has zero polling loops.

**Event frames:**

```
data: {"type":"status","hyperlinksStatus":"ready","insightsStatus":"processing","hyperlinks":[...]}

data: {"type":"status","hyperlinksStatus":"ready","insightsStatus":"ready","hyperlinks":[...]}

data: {"type":"done"}
```

- `type: 'status'` is sent on **every poll** (every 3 seconds) with the current values.
- `type: 'done'` is sent when: both statuses are `'ready'`, OR neither is `'processing'` (e.g. one failed), OR after 40 polls (120 seconds max). After `done`, the connection closes.
- There are no `hyperlinks_ready` or `insights_ready` event types.
- There is no stale-detection or auto-re-trigger logic inside the SSE handler.

The connection is opened by `TopicDetailScreen` only when `hyperlinksStatus` or `insightsStatus` is `'processing'` on initial load. When both statuses are already `'ready'` on the first REST call, no SSE connection is opened.

---

## 8. Frontend Implementation

### 8.1 `LinkedText` primitive

New file: `src/components/common/LinkedText.tsx`

```typescript
interface LinkedTextProps {
  text: string;
  style?: TextStyle;
  getLinkVariant?: (name: string) => "owned" | "discoverable";
  onTopicPress?: (targetName: string) => void;
}
```

Behavior:

1. Parses `text` with regex `\[\[([^\]]+)\]\]` (non-greedy, no nested brackets).
2. When `getLinkVariant` is **not** provided, markers render as plain text (brackets stripped, inner name only). Used for all discovery previews — no visual link effects.
3. When `getLinkVariant` **is** provided, emits a single root `<Text>` with alternating plain strings and nested `<Text onPress>` spans. Each span’s style is determined by `getLinkVariant(name)`: `'owned'` → solid underline, primary color; `'discoverable'` → dashed underline, secondary color.
4. **Unclosed marker** — if a `[[` has no closing `]]` in the remaining text, render that tail as plain text. Safe at any streaming boundary.
5. The `onTopicPress` callback receives the raw name string from inside the markers.

### 8.2 `TypewriterText` integration

File: [src/components/common/StreamingAnimations.tsx](../src/components/common/StreamingAnimations.tsx)

Replace the final `return <Text style={style}>{displayedText}</Text>` with `<LinkedText text={displayedText} style={style} />`. No additional props needed — `LinkedText` without `getLinkVariant` renders markers as plain text, which is correct for all streaming contexts.

### 8.3 Section components

Files: `TextSection.tsx`, `ListSection.tsx`, `ComparisonSection.tsx` under [src/components/discover/sections/](../src/components/discover/sections/)

Each section adds optional props:

- `onTopicPress?: (name: string) => void`
- `getLinkVariant?: (name: string) => 'owned' | 'discoverable'`

Non-streaming path (`TopicDetailScreen`, `isComplete={true}` — `ContentWrapper` is never passed from this screen): always render `<LinkedText text={content} style={styles.contentText} />` — with `getLinkVariant` and `onTopicPress` forwarded when `hyperlinksStatus === 'ready'`, omitted otherwise. When `getLinkVariant` is omitted, `LinkedText` strips markers to plain text (§8.1 behaviour 2), which is exactly what pre-feature topics and the processing window require. **Never use a raw `<Text>{content}</Text>` fallback in this path** — doing so would expose `[[marker]]` syntax to the user when `hyperlinks` are not yet ready.

Streaming path (discovery previews): `ContentWrapper` is `TypewriterText`, which now renders `<LinkedText>` internally to strip markers to plain text. Sections do not forward `onTopicPress` or `getLinkVariant` to `ContentWrapper` — those props apply only to the static non-streaming path above.

`ComparisonSection` applies `LinkedText` (with `getLinkVariant` and `onTopicPress`) to the **tech label** (`vs ${comparison.topic}`), NOT to the comparison text body (`comparison.comparison`), which is rendered as a plain `<Text>` element.

### 8.4 `TopicCard`

File: [src/components/discover/TopicCard.tsx](../src/components/discover/TopicCard.tsx)

Add props:

- `onTopicPress?: (name: string) => void`
- `getLinkVariant?: (name: string) => 'owned' | 'discoverable'`

Forward both to all section components. When neither prop is provided (all discovery previews), `LinkedText` renders markers as plain text — no activation logic needed at the card level.

### 8.5 `onTopicPress` handler

Both handlers live in `TopicDetailScreen`:

- `handleTopicPress(name)`: looks up `name` in `topic.hyperlinks` (case-insensitive). Routes to `/topic-detail` if `targetTopicId` is set; otherwise to `/discover-deep-link?topicName=name`.
- `getLinkVariant(name)`: returns `'owned'` or `'discoverable'` based on the matched hyperlink's `owned` field.

Both are passed to `TopicCard` **only when `hyperlinksStatus === 'ready'`**. While status is `'processing'` or `null`, neither prop is passed — `TopicCard` receives no `getLinkVariant` and no `onTopicPress`, so `LinkedText` renders all markers as plain text. This is how "no chips during processing" is enforced: an empty `hyperlinks[]` with `getLinkVariant` still passed would cause every marker to silently resolve as `'discoverable'` and become a tappable link pointing at an unresolved name.

`InsightsPanel` does **not** call `handleTopicPress`. Insight items carry `{ targetTopicId, owned }` from their own API response — the panel uses `handleInsightPress(item)`, which dismisses the panel and routes to `/topic-detail` if `targetTopicId` is set, otherwise to `/discover-deep-link?topicName=item.targetName`.

> **Note:** Both `handleTopicPress` and `handleInsightPress` use 2-way routing: if `targetTopicId` is set (regardless of whether the topic is `owned`), the user is sent to `/topic-detail`. Only when `targetTopicId` is null does navigation fall through to `/discover-deep-link?topicName=...`. The `owned` field on a link/insight item controls the visual chip style only.

### 8.6 `TopicDetailScreen` additions

File: [src/components/discover/TopicDetailScreen.tsx](../src/components/discover/TopicDetailScreen.tsx)

1. Extend the API call result to parse `hyperlinks`, `hyperlinksStatus`, and `insightsStatus` from the extended `GET /topics/:id` response.
2. Store `hyperlinks`, `hyperlinksStatus`, `insightsStatus` in the `topic` state (they arrive from `GET /topics/:id`). Maintain separate panel state: `insightsPanelVisible`, `insightsPanelStatus: 'processing' | 'ready' | 'failed'`, and `insightGroups: InsightGroup[]`. The panel's status is **driven exclusively by its own local state** — never derived directly from `topic.insightsStatus`.
3. **SSE push for processing statuses** — if the initial REST load returns `hyperlinksStatus === 'processing'` or `insightsStatus === 'processing'`, open a single `GET /topics/:id/events` SSE connection using a **dedicated `SSEClient` instance** stored in a `useRef` (see §8.9). Do NOT use the module-level `sseClient` singleton. The server polls the DB internally (every 3s) — the client has zero polling loops. The connection delivers two event types:
   - `type: 'status'` (per-poll update, every 3 seconds): update `topic` state with the latest `hyperlinksStatus`, `insightsStatus`, and `hyperlinks`. Hyperlink chips activate automatically once `hyperlinksStatus` becomes `'ready'`.
   - `type: 'done'`: cancel the SSE connection.

   Cancel the SSE connection on screen blur (`useFocusEffect` cleanup). The server auto-closes after 120s (40 polls × 3s) or when both statuses are no longer `'processing'`. On timeout for hyperlinks: markers stay as plain text — no error surfaced (hyperlinks are a progressive enhancement).

4. **Auto-transition when SSE delivers `insightsStatus = 'ready'` or `'failed'` while panel is open** — a `useEffect` watching `topic.insightsStatus` and `insightsPanelVisible` reacts when `insightsPanelStatus === 'processing'`:
   - `'ready'` → auto-fetch `GET /topics/:id/insights`, populate `insightGroups`, set panel to `'ready'`
   - `'failed'` → set panel to `'failed'` (shows Retry button)

5. Re-fetch `GET /topics/:id` on screen focus using `useFocusEffect`. This refreshes `topic`, `hyperlinks`, and status fields whenever the screen regains focus — for example, after the user navigates back from a deep-link preview having added a linked topic to their bucket. This is a focus-event refresh, not a tap-time call, and does not conflict with Rule 4 or Decision #2.
6. Add the bulb icon to the sticky header (right side). The bulb is always visible on the topic detail screen.
7. **On bulb tap — three branches based on `topic.insightsStatus`:**
   - **`'processing'`** — the fire-and-forget block is still running and the SSE connection is already open. Open `InsightsPanel` immediately with `status: 'processing'` (skeleton). The `useEffect` from step 4 will transition the panel automatically when SSE delivers the status change. No API call at tap time.
   - **`'ready'`** — open `InsightsPanel` with `status: 'processing'` (skeleton), then immediately call `GET /topics/:id/insights`. This is an instant DB cache hit. On success: set panel to `'ready'` and populate `insightGroups`. On failure: set panel to `'failed'`.
   - **`null` or `'failed'`** — call `POST /topics/:id/insights` to trigger async generation. Open `InsightsPanel` with `status: 'processing'` (skeleton). Update local `topic.insightsStatus` to `'processing'`, start the `GET /topics/:id/events` SSE connection. The `useEffect` from step 4 handles the subsequent transition.
8. Pass `handleTopicPress` and `getLinkVariant` to `TopicCard` only when `hyperlinksStatus === 'ready'`. Pass neither prop otherwise.

### 8.7 `discover-deep-link.tsx` route

Route file: `app/discover-deep-link.tsx`. Component: `src/components/discover/DiscoverDeepLinkScreen.tsx`.

Reads either `topicId` or `topicName` from `useLocalSearchParams`. Calls `topicService.discoverDeepLinkTopic(targetTopicId, targetTopicName, onProgress)` — a **dedicated method** on `topicService`, separate from `discoverTopic` (which only handles `'surprise'` and `'guided'` modes).

Structurally mirrors `SurpriseMeFlow` with these differences:

- Action buttons call `updateTopicStatus(resolvedTopicId, status, 'deep_link')`.
- After Dismiss or Add to Bucket: `router.back()`.
- After Acquire Now: `updateTopicStatus`, then `router.replace({ pathname: '/quiz', params: { topicId: resolvedTopicId } })`.
- `TopicCard` does NOT receive `onTopicPress` or `getLinkVariant` — `LinkedText` renders all markers as plain text.
- The bulb icon is NOT shown on this screen.

### 8.8 `InsightsPanel` bottom sheet

New file: `src/components/topics/InsightsPanel.tsx`

`InsightsPanel` is a **pure presenter component** — it performs no data fetching. All data and status flow down as props from `TopicDetailScreen`.

```typescript
interface InsightsPanelProps {
  visible: boolean;
  onDismiss: () => void;
  status: "processing" | "ready" | "failed";
  groups: InsightGroup[];
  onInsightPress: (item: InsightItem) => void;
  onRetry?: () => void; // called when user taps Retry; parent calls POST /topics/:id/insights
}
```

- Tall bottom sheet (~80% screen height), swipe-to-dismiss.
- Branches on the `status` prop (passed from parent, not fetched internally):
  - `'ready'`: render groups immediately — instant render, no async work (common case once SSE has delivered the data, or on any revisit to a ready topic).
  - `'processing'`: show skeleton — the parent `TopicDetailScreen` is already watching via SSE and will update the `status` and `groups` props when the `type: 'status'` event delivers `insightsStatus: 'ready'`. The panel re-renders automatically via props. No internal polling.
  - `'failed'`: show a compact inline error with a **Retry** button. `onRetry` triggers `POST /topics/:id/insights` in the parent, which sets status back to `'processing'` and starts async generation. The SSE connection is re-opened and the panel transitions via the `useEffect` in §8.6 step 4.
- Renders groups in fixed client-side order: `PREREQUISITE_OF`, `BUILDS_ON`, `TYPE_OF`, `EXAMPLE_OF`, `IMPLEMENTS`, `CAUSES`, `USED_WITH`, `ALTERNATIVE_TO`, `SIMILAR_TO`, `TRADEOFF_WITH`, `PART_OF`.
- Skips any group that has no items.
- Each group: `heading` as a section label, items as tappable chips.
- Chip visual treatment:
  - `owned: true` → filled chip (solid background color)
  - `owned: false` → outlined chip with a `+` prefix ("+ Kafka")
- On chip tap: dismiss sheet, then call `onInsightPress(item)` (which is `handleInsightPress` from §8.5). Navigation is the parent's responsibility.
- Error state: compact inline message with Retry button.

### 8.9 `topicService` extensions

File: [src/services/topicService.ts](../src/services/topicService.ts)

1. `discoverTopic` only accepts `'surprise' | 'guided'`. Deep-link discovery is handled by a **separate method**:

   ```typescript
   async discoverDeepLinkTopic(
     topicId?: string,
     topicName?: string,
     onProgress?: (partialText: string) => void,
   ): Promise<{ topic: Topic; topicId: string }>
   ```

   This method is called by `DiscoverDeepLinkScreen`. `discoverTopic` is not extended — no existing callers need changing.

2. Add `getInsights(topicId: string): Promise<InsightsResponse>` — plain authenticated GET, no SSE. Used by `TopicDetailScreen` for two cases: (a) pre-feature topics where `insightsStatus === null`, called on first bulb tap; (b) Retry after a `'failed'` response from the panel.
3. Add `triggerHyperlinks(topicId: string): Promise<void>` — calls `POST /topics/:id/hyperlinks`. Used by `TopicDetailScreen` on page load when `hyperlinksStatus === 'failed'` to silently auto-retry hyperlink extraction.
4. Extend `updateTopicStatus` to accept `discoveryMethod: 'surprise' | 'guided' | 'deep_link'`.
5. For the `GET /topics/:id/events` SSE connection, instantiate a **dedicated `SSEClient`** local to `TopicDetailScreen`, stored in a `useRef` (`eventsClientRef`). A `connectGet()` method on `SSEClient` (distinct from `connect()` which uses POST) opens the connection. `handleStatusEvent` dispatches on `data.type`: `'status'` → merge `hyperlinksStatus`, `insightsStatus`, `hyperlinks` into topic state; `'done'` → call `eventsClientRef.current?.cancel()`. Cancel on unmount and `useFocusEffect` cleanup.

Inline marker extraction (`mentioned_topics`) is backend-internal only. It is never added to `FlatTopicContentSchema`, never sent in the SSE stream, and never present on the client-side `Topic` type.

### 8.10 Type additions

File: [src/types/index.ts](../src/types/index.ts)

```typescript
// Existing DiscoveryMethod — extend
export type DiscoveryMethod = "surprise" | "guided" | "deep_link";

// New
export interface HyperlinkItem {
  relationshipId: string;
  targetName: string;
  targetTopicId: string | null;
  owned: boolean;
}

export interface InsightItem {
  targetName: string;
  targetTopicId: string | null;
  owned: boolean;
}

export interface InsightGroup {
  relationKind: string;
  heading: string;
  items: InsightItem[];
}

export interface InsightsResponse {
  topicId: string;
  status: "processing" | "ready" | "failed"; // 'processing' → skeleton; 'ready' → render; 'failed' → retry
  groups: InsightGroup[]; // empty when status is 'processing' or 'failed'
}
```

---

## 9. Database Migration

### 9.1 New table and indexes

File: `backend/src/modules/shared/database/migrations/0003_smart_navigation.sql`

Full migration (additive only, fully idempotent):

```sql
-- pg_trgm extension for fuzzy name matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Trigram index on topics.name for fuzzy resolution
CREATE INDEX IF NOT EXISTS idx_topics_name_trgm
  ON topics USING gin (name gin_trgm_ops);

-- Relationship edge table
CREATE TABLE IF NOT EXISTS topic_relationships (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_topic_id   UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  target_topic_id   UUID          REFERENCES topics(id) ON DELETE SET NULL,
  target_name       VARCHAR(255) NOT NULL,
  kind              VARCHAR(16)  NOT NULL,  -- 'hyperlink' | 'insight'
  relation_kind     VARCHAR(32),            -- NULL for hyperlinks; see taxonomy for insights
  created_at        TIMESTAMP DEFAULT NOW(),
  resolved_at       TIMESTAMP               -- set when target_topic_id is first populated
);

-- Deduplication indexes (two partial indexes — see §4.3 for rationale)
CREATE UNIQUE INDEX IF NOT EXISTS uq_topic_relationships_hyperlink
  ON topic_relationships (source_topic_id, target_name)
  WHERE kind = 'hyperlink';

CREATE UNIQUE INDEX IF NOT EXISTS uq_topic_relationships_insight
  ON topic_relationships (source_topic_id, target_name, relation_kind)
  WHERE kind = 'insight';

-- Query performance indexes
CREATE INDEX IF NOT EXISTS idx_topic_relationships_source_kind
  ON topic_relationships (source_topic_id, kind);

CREATE INDEX IF NOT EXISTS idx_topic_relationships_target_name_trgm
  ON topic_relationships USING gin (target_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_topic_relationships_unresolved
  ON topic_relationships (target_name)
  WHERE target_topic_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_topic_relationships_target_topic_id
  ON topic_relationships (target_topic_id)
  WHERE target_topic_id IS NOT NULL;

-- Processing status columns on the topics table (tracks async fire-and-forget blocks)
ALTER TABLE topics
  ADD COLUMN IF NOT EXISTS hyperlinks_status     VARCHAR(16),  -- NULL | 'processing' | 'ready' | 'failed'
  ADD COLUMN IF NOT EXISTS hyperlinks_started_at TIMESTAMP,    -- timestamp when hyperlink extraction was last started
  ADD COLUMN IF NOT EXISTS insights_status       VARCHAR(16),  -- NULL | 'processing' | 'ready' | 'failed'
  ADD COLUMN IF NOT EXISTS insights_started_at   TIMESTAMP;    -- timestamp when insight generation was last started
```

### 9.2 Drizzle schema addition

File: [backend/src/modules/shared/database/schema.ts](../backend/src/modules/shared/database/schema.ts)

Two changes required:

1. **New table** — add the `topicRelationships` table definition using Drizzle ORM syntax, mirroring the `topic_relationships` SQL above.
2. **Existing table** — extend the `topics` table definition with four new nullable columns:
   - `hyperlinksStatus` → `hyperlinks_status` (`varchar(16)`, no default)
   - `hyperlinksStartedAt` → `hyperlinks_started_at` (`timestamp`, no default)
   - `insightsStatus` → `insights_status` (`varchar(16)`, no default)
   - `insightsStartedAt` → `insights_started_at` (`timestamp`, no default)

   All four are nullable with no default, matching the migration SQL — do not call `.default()` on any of these columns.

### 9.3 No backfill

Existing topics have no `[[markers]]` in their content and no `topic_relationships` rows. Hyperlinks and insights apply only to topics generated after this feature ships. Existing topics continue to render as plain text without any hyperlink or insight activation. On first bulb tap for a pre-feature topic, `GET /topics/:id/insights` returns `{ status: 'processing', groups: [] }`. The frontend then calls `POST /topics/:id/insights` to trigger async generation. There is no synchronous LLM generation path in `GET /topics/:id/insights`.

---

## 10. Repository Additions

File: [backend/src/modules/topic/topic.repository.ts](../backend/src/modules/topic/topic.repository.ts)

### 10.1 `setProcessingStatus`

Called before `callbacks.onComplete()` fires (before `[DONE]` is sent) to atomically initialize both processing statuses. Called once more at the end of each block to mark it `'ready'` (or `'failed'` on error). On block failure: write the `'failed'` status to the DB so the frontend can surface a Retry affordance or auto-retry.

```typescript
async setProcessingStatus(
  topicId: string,
  status: {
    hyperlinksStatus?: 'processing' | 'ready' | 'failed';
    hyperlinksStartedAt?: Date;
    insightsStatus?:   'processing' | 'ready' | 'failed';
    insightsStartedAt?: Date;
  }
): Promise<void> {
  await db
    .update(topics)
    .set({
      ...(status.hyperlinksStatus   !== undefined && { hyperlinksStatus:     status.hyperlinksStatus }),
      ...(status.hyperlinksStartedAt !== undefined && { hyperlinksStartedAt: status.hyperlinksStartedAt }),
      ...(status.insightsStatus      !== undefined && { insightsStatus:      status.insightsStatus }),
      ...(status.insightsStartedAt   !== undefined && { insightsStartedAt:   status.insightsStartedAt }),
    })
    .where(eq(topics.id, topicId));
}
```

Single `UPDATE` — sets only the fields explicitly passed. Callers:

| Call site               | Arguments                                                                                                                          |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Before both blocks      | `{ hyperlinksStatus: 'processing', hyperlinksStartedAt: new Date(), insightsStatus: 'processing', insightsStartedAt: new Date() }` |
| Hyperlink block success | `{ hyperlinksStatus: 'ready' }`                                                                                                    |
| Hyperlink block failure | `{ hyperlinksStatus: 'failed' }`                                                                                                   |
| Insights block success  | `{ insightsStatus: 'ready' }`                                                                                                      |
| Insights block failure  | `{ insightsStatus: 'failed' }`                                                                                                     |

### 10.2 `findByNameFuzzy`

New method `findByNameFuzzy(name: string): Promise<Topic | undefined>`:

0. **Normalization (pre-step):** trim the input string and collapse internal whitespace to a single space before passing to either tier. This prevents spurious mismatches from whitespace artefacts in hyperlink marker names.
1. **Tier 1 — exact, case-insensitive:** `WHERE LOWER(name) = LOWER($1)`
2. **Tier 2 — trigram similarity:** `WHERE similarity(LOWER(name), LOWER($1)) >= FUZZY_MATCH_THRESHOLD ORDER BY similarity DESC LIMIT 1`

The threshold is defined as a named constant:

```typescript
const FUZZY_MATCH_THRESHOLD = 0.45; // handles plural/singular drift and minor phrasing variants
```

Returns `undefined` when no match at either tier. The existing `findByName` (exact-only) is preserved for callers that require strict matching.

---

## 11. SSE Contract (Unchanged + Extended)

### 11.1 Existing frames — do not change

```
data: {"text":"..."}
data: {"type":"meta","topicId":"...","cached":true|false}
data: {"type":"learningResources","resources":[...]}
data: [DONE]
data: {"error":"..."}
```

### 11.2 Deep link mode behavior

`POST /topics` with `mode='deep_link'` emits the **same frames** as surprise/guided. No new event type. The client receives text chunks, then `learningResources`, then `meta` with `topicId`, then `[DONE]`.

The frontend only calls `POST /topics` for `owned: false` topics — ownership was already determined at page load.

---

## 12. Edge Cases

1. **Marker present in forbidden field** — stripped server-side before persistence. No error surfaced.
2. **Marker in allowed field but no fuzzy match** — a `topic_relationships` row is inserted with `target_topic_id = NULL`. On tap, frontend routes to `/discover-deep-link?topicName=...`. Backend fuzzy-matches; if no match, LLM generates. One extra LLM call as the cost of an unresolved link.
3. **Self-reference** in extracted topic names or insight items — filtered before insert.
4. **Duplicate target in same insight group** — prevented by `uq_topic_relationships_insight`.
5. **User taps content during discovery preview** — `getLinkVariant` is not passed to `LinkedText`, so markers render as plain text. No tappable spans exist. Guaranteed no-op.
6. **Unclosed `[[...` at streaming boundary** — rendered as plain text; promoted to span on next render when `]]` arrives.
7. **`targetTopicId` is null in hyperlinks response** — frontend routes to `/discover-deep-link?topicName=...`. Backend normalizes and fuzzy-matches the name; if still not found, runs LLM generation.
8. **Insights fire-and-forget block fails (LLM timeout, network error)** — `insights_status = 'failed'` is written to DB. The SSE endpoint delivers this to the client; the panel transitions from skeleton to the Retry error state. User taps Retry → `POST /topics/:id/insights` → status resets to `'processing'` → SSE drives the new attempt.
9. **Two concurrent new topic creations race (same topic name)** — `upsertTopic` (§5.1) ensures only one `topics` row is created. Both fire-and-forget blocks for insights may still run (one per server that processed the request), but the unique constraint (`uq_topic_relationships_insight`) absorbs duplicate inserts silently. The last `UPDATE insights_status = 'ready'` wins — idempotent. At most one wasted LLM call.
10. **User taps bulb before insights fire-and-forget completes** — `GET /topics/:id` returns `insightsStatus: 'processing'` (not stale). `InsightsPanel` opens with a skeleton. The parent `TopicDetailScreen` is already listening to `GET /topics/:id/events`; when the SSE `type: 'status'` event delivers `insightsStatus: 'ready'`, the `useEffect` auto-calls `GET /topics/:id/insights` and the panel re-renders automatically. No race condition; no sync fallback triggered during the processing window.
11. **Two concurrent topic creations with same extracted marker name** — `upsertTopic` (§5.1) is idempotent via `ON CONFLICT DO NOTHING`. The second INSERT returns no rows; the fallback SELECT returns the winning row. No exception thrown, no data corruption.
12. **Back navigation from deep-link preview** — `router.back()` returns to Topic A. Stack is not polluted because the preview only uses `router.push` (not replace) for this navigation.
13. **SSE connection dropped before both events delivered** — `req.on('close', cleanup)` cancels the interval immediately. No dangling timers. On the next page open, `GET /topics/:id` re-checks current status; if still `'processing'`, a new SSE connection is opened.
14. **Both statuses already `'ready'` on initial load** — no SSE connection is opened. All data is served from the initial `GET /topics/:id` REST call.

---

## 13. Backend Tests

### 13.1 Unit

1. `findByNameFuzzy`: exact match, case variant (`cqrs` → `CQRS`), trigram near-miss above threshold, near-miss below threshold returns undefined.
2. Marker stripping: marker inside `name` / `compare_0_text` is stripped (forbidden fields); marker in `what` / `compare_0_tech` is extracted (allowed fields).
3. `extractMentionedTopics` dedupe and self-reference filter: markers `['Foo', 'foo', 'FOO', '<self>']` across allowed fields → one unique entry `'Foo'` returned, self-reference excluded.
4. Hyperlink insert: 5 mentions extracted from allowed fields, 2 pre-existing targets → 5 rows, 2 resolved.
5. Reverse resolution: insert A mentioning unresolved "Bar"; create "Bar" topic; assert row has `target_topic_id` and `resolved_at` set.
6. Reverse resolution trigram fallback: create A mentioning "Kafka Streams"; create "Kafka Streaming" topic (genuine near-miss, not a case variant) → assert resolved by Tier 2 (similarity ≥ `FUZZY_MATCH_THRESHOLD`), with `target_topic_id` and `resolved_at` set. A case-only difference must resolve via Tier 1 and never reach Tier 2.
7. Insights fire-and-forget at topic creation: new topic generated → `insights_status = 'processing'` + `insights_started_at` set synchronously → insights block fires → rows inserted → `insights_status = 'ready'` → `GET /topics/:id/insights` returns `{ status: 'ready', groups }`, zero LLM calls.
8. `POST /topics/:id/insights` trigger: topic with `insights_status = null` → sets `'processing'`, fires async job, returns 202. Second `POST` while `'processing'` → returns 202 without re-firing (idempotent).
9. Insights failure: async block throws → `insights_status = 'failed'` written to DB. `GET /topics/:id/insights` returns `{ status: 'failed', groups: [] }`. `POST /topics/:id/insights` resets to `'processing'` and re-fires.
10. Insights self-reference filter: LLM returns source topic's own name → dropped before insert.
11. `upsertTopic` race: two concurrent calls with identical `name` → one INSERT wins, other returns no rows → fallback SELECT returns the winner. No exception thrown.
12. `GET /topics/:id` with hyperlinks: response includes `hyperlinks` array with correct `owned` values per user.
13. `GET /topics/:id/insights`: response includes `owned` annotation per insight item.

### 13.2 Integration

1. `POST /topics mode=deep_link topicId=<cached-not-owned>` → SSE yields chunks, `meta { cached: true }`, `[DONE]`. No new event types.
2. `POST /topics mode=deep_link topicName=<fuzzy-match>` (topicName fuzzy-matches an existing topic via `findByNameFuzzy`) → SSE yields cached content, `meta { cached: true }`, `[DONE]`. No LLM call.
3. `POST /topics mode=deep_link topicName=<brand-new>` (no topicId, no fuzzy match) → LLM generates, `meta { cached: false }`, `[DONE]`. DB row created.
4. `POST /topics mode=deep_link` with neither `topicId` nor `topicName` → 400.
5. `POST /topics mode=surprise` with `topicId` supplied → 400.
6. `POST /topics mode=surprise` new topic → after `[DONE]`, `insights_status = 'processing'` + `insights_started_at` set synchronously; fire-and-forget block runs → `insights_status = 'ready'`; subsequent `GET /topics/:id/insights` returns `{ status: 'ready', groups }`, zero LLM calls.
7. `GET /topics/:id/insights` cache miss (fire-and-forget failed or pre-feature topic) — returns `{ status: 'processing' | 'failed', groups: [] }` immediately (no sync generation). Frontend calls `POST /topics/:id/insights` to trigger async generation.
8. `GET /topics/:id/insights` for topic the requesting user does NOT own → 200 (auth only, no ownership check).
9. `GET /topics/:id` → response includes `hyperlinks` with `owned: true` for user's own topics, `owned: false` for others.

### 13.3 Migration

1. `0003_smart_navigation.sql` applies cleanly on a fresh DB.
2. Re-running is a no-op (all `IF NOT EXISTS`).
3. Existing topics fixture still returns valid `GET /topics/:id` after migration: `hyperlinks: []`, `hyperlinksStatus: null`, `insightsStatus: null`. `GET /topics/:id/insights` returns `{ status: 'processing', groups: [] }`. `POST /topics/:id/insights` triggers async generation.

---

## 14. Frontend Tests

### 14.1 `LinkedText`

1. Plain text passes through unchanged.
2. Single `[[X]]` produces one tappable span; `onPress` called with `'X'`.
3. Multiple adjacent markers `[[A]][[B]]` produce two distinct spans.
4. Unclosed `[[Comm` renders as plain text, no crash.
5. No `getLinkVariant` prop: `[[markers]]` render as plain text (brackets stripped), no link styling, `onPress` never invoked.

### 14.2 `TypewriterText`

6. Feeding `"see [[Comm"` then `" and Query]]"` with `getLinkVariant` provided → final render has one styled span; no raw `[[` visible at any intermediate render.

### 14.3 Navigation handlers

7. `onTopicPress` — `targetTopicId` resolved routes to `/topic-detail`; `targetTopicId: null` routes to `/discover-deep-link?topicName=...`. The `owned` field controls the link style, not the navigation target.

### 14.4 `InsightsPanel`

8. Owned chip renders filled; not-owned chip renders outlined with `+` prefix.
9. `status: 'ready'` prop → groups render immediately; no skeleton shown; no async work initiated.
10. `status: 'processing'` prop → skeleton shown; parent SSE connection delivers `type: 'status'` event with `insightsStatus: 'ready'` → parent `useEffect` auto-calls `GET /topics/:id/insights` → parent passes updated `status: 'ready'` and `groups` down via props → panel re-renders automatically; no internal polling loop.
11. `status: 'failed'` prop → error state shown; Retry button present; `onRetry` called when tapped; parent re-calls `GET /topics/:id/insights`.
12. Sheet dismissal before parent SSE delivers data: no dangling state updates; `InsightsPanel` is pure presenter — it holds no async state of its own.

### 14.5 `TopicDetailScreen` SSE connection

13. Initial load with `hyperlinksStatus: 'processing'` → `LinkedText` renders all markers as plain text; `GET /topics/:id/events` SSE connection is opened.
14. SSE `type: 'status'` event with `hyperlinksStatus: 'ready'` received → `topic` state updates with new `hyperlinks` array; `getLinkVariant` now returns correct variants; chips become active without remounting the component.
15. SSE `type: 'status'` event with `insightsStatus: 'ready'` received → `topic.insightsStatus` updates in state; `useEffect` auto-calls `GET /topics/:id/insights` and re-renders InsightsPanel if open.
16. 120s server ceiling (40 polls) elapses without hyperlinks completing → connection closes; content remains as plain text; no error surfaced to the user (hyperlinks are a progressive enhancement).
17. Component unmount → SSE connection is cancelled; no state update after unmount.

---

## 15. Manual End-to-End Scenarios

Seed: user A owns topics X and Y; user B owns topic Y only; topic Z does not exist.

| Action                                                 | Expected                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A opens owned topic X, sees `[[Y]]` in content         | Span renders with solid underline (owned) — tap goes directly to Y detail                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| A opens owned topic X, sees `[[Z]]` in content         | Span renders with dashed underline (discoverable) — tap goes to Z's topic-detail (targetTopicId is set, Z exists in DB)                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| A opens owned topic X, sees `[[Unknown]]` (unresolved) | Span renders with dashed underline (discoverable) — tap opens Deep Link, LLM generates Unknown                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| A taps bulb on X                                       | If `insightsStatus: 'processing'`: InsightsPanel opens with skeleton immediately; SSE delivers `type: 'status'` event with `insightsStatus: 'ready'`; `useEffect` auto-calls `GET /topics/:id/insights`; panel transitions to data — no user action needed. If `insightsStatus: 'ready'`: InsightsPanel opens with skeleton immediately, `GET /topics/:id/insights` is called at tap time (fast DB cache hit), panel transitions to data on response. If `insightsStatus: null` or `'failed'`: `POST /topics/:id/insights` is called, panel opens with skeleton, SSE drives the completion. |
| A taps insight chip (resolved) from X's panel          | Sheet dismisses, navigates to `/topic-detail` (regardless of `owned` flag)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| A taps insight chip (unresolved) from X's panel        | Sheet dismisses, opens Deep Link preview via `/discover-deep-link?topicName=...`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| While X streams (Surprise), spans appear               | Markers render as plain text — no visual link effects                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| A navigates X→Y→Z via hyperlinks                       | Back from Z lands on Y; back from Y lands on X                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| B opens Deep Link preview for Z (not owned)            | No bulb icon, no active hyperlinks in preview content                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| B accepts Z from preview (Add to Bucket)               | `router.back()` returns to originating topic; `useFocusEffect` triggers a fresh `GET /topics/:id`; Z span updates to owned (solid underline)                                                                                                                                                                                                                                                                                                                                                                                                                                                |

---

## 16. Decisions Locked

1. Hyperlinks and Insights activate only on owned topics — never on discovery previews.
2. Ownership pre-resolved at page load via `GET /topics/:id`. Zero per-tap API calls. `TopicDetailScreen` re-fetches on screen focus (`useFocusEffect`) to refresh ownership annotations after back-navigation.
3. One unified `topic_relationships` table for both features, discriminated by `kind`.
4. LLM output: inline `[[markers]]` only. Topic names are extracted server-side post-Zod parse using `extractMentionedTopics()`. No `mentioned_topics` array is emitted or expected from the LLM.
5. Markers allowed only in specific content fields (§6.1); stripped defensively from forbidden fields.
6. Hyperlink rows created fire-and-forget after `[DONE]`, using the same async pattern as learning resource refresh.
7. Insight rows and hyperlink rows generated fire-and-forget at new topic creation time, in independent parallel async blocks. Both status columns are set atomically (single `UPDATE topics`) before the blocks kick off, **before** `callbacks.onComplete()` is called. Each block writes `'ready'` on success or `'failed'` on error.
8. Deep Link mode uses `topicId` (preferred) or `topicName` (fallback for unresolved links). Same SSE response frames as surprise/guided — no new event types.
9. Two partial unique indexes instead of a compound unique constraint — `NULL ≠ NULL` in Postgres unique-index evaluation makes a single constraint silently fail for hyperlinks.
10. Reverse resolution runs synchronously inside the fire-and-forget post-insert block.
11. Back navigation from deep-link preview returns to originating topic (stack push, not replace).
12. Insight group headings are deterministic backend templates (`INSIGHT_HEADINGS` mapping in §6.3) — never LLM-generated, never stored in the database.
13. Discovery previews (Surprise, Guide, Deep Link) render topic content as plain text: markers stripped from display, no link styling, no bulb icon shown.
14. `getOrCreateTopic` uses the `upsertTopic` pattern (`INSERT ... ON CONFLICT (name) DO NOTHING RETURNING *` + fallback SELECT) for ALL discovery modes. Eliminates the TOCTOU race in the old `findByName → create` pattern.
15. Insight and hyperlink generation happen once, at topic creation time. No per-request background work on `GET /topics/:id`. Cross-instance duplicate generation is absorbed by the unique constraint.
16. `topicName` inputs are trimmed and internal whitespace normalized before fuzzy matching.
17. `GET /topics/:id/events` is the sole push mechanism for processing completion. Server polls the DB every 3 seconds. Client opens the connection only when initial REST load shows `'processing'`; auto-closes after 40 polls (120s max) or when both statuses leave `'processing'`.
18. On block failure, `'failed'` is written to the DB: for hyperlinks, the frontend auto-retries on page load (`POST /topics/:id/hyperlinks`); for insights, the frontend shows a Retry button (`POST /topics/:id/insights`). No stale-detection logic in the SSE handler.

---

## 17. Out of Scope

1. Backfill of markers or insights for topics generated before this feature ships.
2. Hyperlinks or insights on discovery preview screens (Surprise, Guide, Deep Link).
3. Admin or user-facing regeneration of extracted markers or insights.
4. Abbreviation / alias resolution — LLM must emit canonical names.
5. Link graph visualization.
6. Breadcrumb trail across hyperlink hops.
7. Rate limiting specific to deep_link beyond current discovery limits.
8. Advisory locking around concurrent insight generation (post-launch hardening; unique constraint absorbs the race).
9. `GET /topics/:id/graph?depth=N` graph traversal endpoint.
