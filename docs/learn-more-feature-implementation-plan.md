# Learn More Feature Implementation Plan (Codebase-Verified)

Status: Ready for implementation by coding agent
Last validated against code: 2026-03-16

## 1. Goal

Add a new Learn More section to Topic Details that shows up to 5 relevant external resources when available.

The section must appear in both existing Topic detail display paths:

1. Discovery render path from POST /topics (SSE stream).
2. Detail render path from GET /topics/:id (JSON response).

If no relevant links are available, or Brave retrieval fails, return an empty array and let frontend hide the section.

## 2. Non-Negotiable Requirements

1. Learn More is part of Topic response contract, not a separate endpoint.
2. HTTPS-only links are allowed.
3. Do not break existing SSE framing and streaming UX.
4. Use retrieval-first sourcing (Brave API), not LLM-generated URLs.
5. Use stale-while-revalidate for link freshness.
6. Empty array is the fallback for missing/unavailable links.

## 3. Current Code Flow (Verified)

### 3.1 POST /topics streaming path

1. Route: backend/src/modules/topic/topic.routes.ts
2. Controller: backend/src/modules/topic/topic.controller.ts, method discoverTopic
3. Service: backend/src/modules/topic/topic.service.ts, methods discoverTopic, streamCachedTopic, toFlatTopicContent
4. Frontend service stream reconstruction: src/services/topicService.ts, method streamDiscoverTopic
5. Frontend rendering: src/components/discover/SurpriseMeFlow.tsx and src/components/discover/GuideMeFlow.tsx -> src/components/discover/TopicCard.tsx

Important: frontend reconstructs Topic from a flat streamed payload validated by FlatTopicContentSchema in src/services/topicService.ts.

### 3.2 GET /topics/:id JSON path

1. Route: backend/src/modules/topic/topic.routes.ts
2. Controller: backend/src/modules/topic/topic.controller.ts, method getTopicDetail
3. Service: backend/src/modules/topic/topic.service.ts, methods getTopicDetail and toTopicResponse
4. Frontend screen: app/topic-detail.tsx, fallback call to topicService.getTopicDetail
5. TopicCard receives full Topic with nested content object.

## 4. Contract Design

### 4.1 Frontend Topic type changes

File: src/types/index.ts

Add to TopicContent:

1. learnMoreLinks: LearnMoreLink[]

Add interface:

1. LearnMoreLink
2. title: string
3. url: string

Recommendation: keep learnMoreLinks required in app-level Topic shape, defaulting to [] after parsing.

### 4.2 Backend JSON response shape changes

File: backend/src/modules/topic/topic.schemas.ts

Extend TopicResponseSchema.content:

1. learnMoreLinks: z.array(z.object({ title: z.string(), url: z.url() }))

Note: z.url() allows non-https; add explicit https enforcement in service-level sanitizer and schema refinement if desired.

### 4.3 Backend flat stream shape changes

File: backend/src/modules/topic/topic.schemas.ts

Extend FlatTopicContentSchema with optional fields:

1. learnMore_0_title, learnMore_0_url
2. learnMore_1_title, learnMore_1_url
3. learnMore_2_title, learnMore_2_url
4. learnMore_3_title, learnMore_3_url
5. learnMore_4_title, learnMore_4_url

Why optional: stream is progressive and partial; cached legacy topics may not have link fields initially or the service might not find valid links to associate with the requested topic.

### 4.4 SSE framing constraints

Do not change:

1. data: {"text": "..."} chunks
2. data: {"type":"meta","topicId":"...","cached":...}
3. data: [DONE]

Controller implementation in backend/src/modules/topic/topic.controller.ts must remain protocol-compatible.

## 5. Database and Persistence Changes

### 5.1 Topics table extensions

File: backend/src/modules/shared/database/schema.ts

Add columns to topics table:

1. contentLearnMore jsonb not null default '[]'::jsonb
2. learnMoreLastRefreshedAt timestamp nullable

Rationale:

1. contentLearnMore stores served links as a jsonb array of {title, url} objects, consistent with existing content columns (contentPros, contentCons, etc.).
2. learnMoreLastRefreshedAt enables stale-while-revalidate checks (null = never refreshed, compare against 7-day TTL).
3. Refresh status and error tracking are handled by structured logs (Phase F), not dedicated columns. Can be promoted to columns in v2 if logging proves insufficient.

Naming: follows the existing content\* column convention (contentPros, contentCons) while staying concise.

Backward compatibility: existing topic rows receive [] via the column default. learnMoreLastRefreshedAt is null, which the refresh logic treats as "never refreshed" — links are lazily backfilled on first access via getTopicDetail or discoverTopic.

### 5.2 Migration

1. Generate drizzle migration.
2. Migration is additive: new columns with defaults, no data transforms needed.
3. Existing rows get contentLearnMore = '[]'::jsonb and learnMoreLastRefreshedAt = null automatically.

## 6. Retrieval, Sanitization, and Relevance Pipeline

### 6.1 New internal service

Create files:

1. backend/src/modules/topic/link-resource.service.ts
2. backend/src/modules/topic/link-resource.schemas.ts

Primary method example:

1. getLearnMoreLinksForTopic(topicContext): Promise<LearnMoreLink[]>

### 6.2 Brave API integration

Use server-side HTTP client from backend.

Add env in backend/src/modules/shared/config/env.ts:

1. BRAVE_API_KEY required in environments where feature is enabled
2. Optional BRAVE_API_URL with default Brave endpoint

### 6.3 Sanitization rules (server-side)

For each candidate:

1. URL must parse.
2. Protocol must be https exactly.
3. Reject javascript, data, file, mailto, ftp and non-https.
4. Reject localhost, loopback, private network hosts.
5. Normalize URL and dedupe by canonical URL.
6. Enforce max lengths for title and url.

### 6.4 Relevance rules

1. Score candidate by overlap with topic name, category, subcategory.
2. Boost high-signal sources relevant to software architecture content.
3. Penalize generic SEO pages and weakly-related pages.
4. Keep top 1 to 5 links above threshold.
5. If none pass threshold, return [].

## 7. Refresh Strategy (Stale-While-Revalidate)

### 7.1 Read behavior

1. If links are fresh, return stored links.
2. If links are stale, return stored links immediately and trigger async refresh.
3. If links are missing, return [] and trigger async refresh.

### 7.2 Refresh triggers

Apply trigger checks in:

1. TopicService.getTopicDetail
2. TopicService.discoverTopic after topic row is resolved (both cached and generated path)

Note: do NOT trigger refreshes from TopicService.getTopics (list endpoint). That path only uses toTopicListItemResponse and never returns content — firing Brave fetches for every topic in a paginated list would be wasteful.

### 7.3 Refresh safety

1. Add cooldown to prevent repeated refresh for same topic.
2. Add in-process dedupe map keyed by topicId for v1.
3. Keep timeouts and retry budget small.

Suggested defaults:

1. Freshness TTL: 7 days
2. Cooldown between refresh attempts: 6 hours
3. Brave request timeout: 5 seconds
4. Retry: 1 retry max for transient failures

## 8. Backend Implementation Tasks

### Phase A: Schema and types

1. Update topics table in backend/src/modules/shared/database/schema.ts.
2. Generate and verify migration.

### Phase B: Topic schemas

1. Update backend/src/modules/topic/topic.schemas.ts:
2. Add LearnMore item schema.
3. Extend TopicResponseSchema.content.
4. Extend FlatTopicContentSchema with optional stream fields.

### Phase C: Repository

1. Update backend/src/modules/topic/topic.repository.ts for:
2. persisting contentLearnMore and learnMoreLastRefreshedAt.
3. selective update method for learn more refresh path.

### Phase D: Service mapping

1. Update backend/src/modules/topic/topic.service.ts:
2. getOrCreateTopic maps flat learnMore stream fields to DB.
3. toFlatTopicContent emits learnMore flat fields in cached stream path.
4. toTopicResponse includes content.learnMoreLinks.
5. add non-blocking refresh orchestration callsites.

### Phase E: Retrieval integration

1. Implement link-resource service and Brave client calls.
2. Integrate sanitization and relevance filtering.
3. Persist [] when no valid relevant links exist.

### Phase F: Observability

1. Add structured logs for refresh started/success/failure.
2. Log rejection reasons for sanitizer and relevance filter.
3. Add counters if existing telemetry sink is available.

## 9. Frontend Implementation Tasks

### Phase A: Types and parsing

1. Update src/types/index.ts with LearnMoreLink and TopicContent.learnMoreLinks.
2. Update FlatTopicContentSchema in src/services/topicService.ts for optional learnMore flat fields.
3. In streamDiscoverTopic reconstruction, build content.learnMoreLinks from flat fields with [] default.

### Phase B: Streaming helpers

1. Update src/utils/streamingParser.ts hasSectionData with learnMore section logic.
2. Ensure section detects both flat stream fields and nested content.learnMoreLinks.

### Phase C: TopicCard UI

1. Add Learn More rendering in src/components/discover/TopicCard.tsx.
2. Render for both streaming state and completed state.
3. Hide section when no links.
4. Cap rendered items at five.
5. Add link open handler:
6. native: in-app browser.
7. web: new tab.

### Phase D: Styling

1. Add visual styles in src/components/discover/topicCardStyles.ts.
2. Ensure accessible tap target and contrast.

## 10. Test Plan

### 10.1 Backend tests

1. Topic schemas accept optional stream learnMore fields.
2. TopicResponse includes learnMoreLinks array.
3. Sanitizer rejects non-https and unsafe URLs.
4. Relevance filter drops off-topic results.
5. TopicService maps learnMore correctly in both toFlatTopicContent and toTopicResponse.

### 10.2 Integration tests

1. POST /topics stream can reconstruct learnMore links at completion.
2. GET /topics/:id returns content.learnMoreLinks.
3. Stale links returned immediately while async refresh runs.
4. Missing links return [] and trigger refresh.
5. Brave failure path returns [] without API error for topic payload.

### 10.3 Frontend tests

1. topicService stream reconstruction yields Topic.content.learnMoreLinks.
2. TopicCard shows Learn More when links exist.
3. TopicCard hides Learn More when links are [].
4. Link open behavior works on web/native.

### 10.4 Regression checks

1. Existing sections what/why/pros/cons/compare remain unchanged.
2. Existing SSE parser behavior remains compatible with old payloads.
3. Old topics with no learnMore fields still render safely.

## 11. Rollout Plan

1. Add feature flag LEARN_MORE_ENABLED.
2. Deploy backend schema and response additions first.
3. Deploy frontend rendering with hidden-empty behavior.
4. Enable Brave retrieval gradually and monitor quality.
5. Tune relevance thresholds and cooldown based on telemetry.

## 12. Acceptance Criteria

1. Learn More appears in discovery render (POST /topics path) when links are available.
2. Learn More appears in detail render (GET /topics/:id path) when links are available.
3. Only https links are persisted and returned.
4. If Brave fails or no relevant links exist, learnMoreLinks is [].
5. TopicCard hides Learn More gracefully for empty arrays.
6. Existing streaming UX and SSE protocol remain unchanged.
7. Legacy topic rows remain compatible and can populate links over time.

## 13. File-Level Change Map

1. backend/src/modules/shared/database/schema.ts
2. backend/src/modules/shared/config/env.ts
3. backend/src/modules/topic/topic.schemas.ts
4. backend/src/modules/topic/topic.repository.ts
5. backend/src/modules/topic/topic.service.ts
6. backend/src/modules/topic/link-resource.service.ts (new)
7. backend/src/modules/topic/link-resource.schemas.ts (new)
8. src/types/index.ts
9. src/services/topicService.ts
10. src/utils/streamingParser.ts
11. src/components/discover/TopicCard.tsx
12. src/components/discover/topicCardStyles.ts
13. backend/.env and deployment env configs for BRAVE_API_KEY and feature flags

## 14. Notes for Implementing Agent

1. Trust code paths over docs where conflicts exist.
2. Keep Topic response parity across stream reconstruction and JSON APIs.
3. Preserve backward compatibility and parser tolerance at every step.
4. Prefer additive changes and defaults over breaking refactors.
