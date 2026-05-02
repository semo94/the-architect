# Topics Feature Architecture (Code-Derived)

This document is derived from runtime code only. It covers topic discovery, persistence, relationship generation, relationship resolution, and retrieval across the Expo client and the Fastify backend.

Validated against code on 2026-05-01.

## Code Anchors

Frontend

- [src/services/topicService.ts](../src/services/topicService.ts)
- [src/components/discover/SurpriseMeFlow.tsx](../src/components/discover/SurpriseMeFlow.tsx)
- [src/components/discover/GuideMeFlow.tsx](../src/components/discover/GuideMeFlow.tsx)
- [src/components/discover/DiscoverDeepLinkScreen.tsx](../src/components/discover/DiscoverDeepLinkScreen.tsx)
- [src/components/discover/TopicDetailScreen.tsx](../src/components/discover/TopicDetailScreen.tsx)
- [src/components/discover/TopicCard.tsx](../src/components/discover/TopicCard.tsx)
- [src/components/common/LinkedText.tsx](../src/components/common/LinkedText.tsx)
- [src/store/useAppStore.ts](../src/store/useAppStore.ts)
- [src/services/sseService.ts](../src/services/sseService.ts)

Backend

- [backend/src/modules/topic/topic.routes.ts](../backend/src/modules/topic/topic.routes.ts)
- [backend/src/modules/topic/topic.controller.ts](../backend/src/modules/topic/topic.controller.ts)
- [backend/src/modules/topic/topic.service.ts](../backend/src/modules/topic/topic.service.ts)
- [backend/src/modules/topic/topic.repository.ts](../backend/src/modules/topic/topic.repository.ts)
- [backend/src/modules/topic/topic.resolver.ts](../backend/src/modules/topic/topic.resolver.ts)
- [backend/src/modules/topic/topic.utils.ts](../backend/src/modules/topic/topic.utils.ts)
- [backend/src/modules/topic/link-resource.service.ts](../backend/src/modules/topic/link-resource.service.ts)
- [backend/src/modules/llm/llm.service.ts](../backend/src/modules/llm/llm.service.ts)
- [backend/src/modules/llm/prompts.ts](../backend/src/modules/llm/prompts.ts)
- [backend/src/modules/shared/database/schema.ts](../backend/src/modules/shared/database/schema.ts)

## Runtime Topology

```mermaid
flowchart LR
    subgraph Client["Expo client"]
        Discover["DiscoverScreen<br/>SurpriseMeFlow<br/>GuideMeFlow<br/>DiscoverDeepLinkScreen"]
        Detail["TopicDetailScreen"]
        Topics["TopicsScreen"]
        TopicFE["src/services/topicService.ts"]
        StreamHook["useStreamingData.ts"]
        LinkRender["TopicCard + LinkedText"]
        EventClient["SSEClient"]
        Store["useAppStore"]
    end

    subgraph API["Fastify backend"]
        TopicRoutes["/topics routes"]
        CategoryRoute["/llm/categories"]
        TopicController["TopicController"]
        TopicService["TopicService"]
        TopicResolver["TopicResolver"]
        TopicRepo["TopicRepository"]
        LLM["LLMService"]
        Embed["embeddingService"]
        Resources["LinkResourceService"]
    end

    subgraph DB["PostgreSQL"]
        TopicsTable[(topics)]
        UserTopicsTable[(user_topics)]
        RelationshipsTable[(topic_relationships)]
        AliasesTable[(topic_aliases)]
    end

    Discover --> TopicFE
    Discover --> StreamHook
    Discover --> CategoryRoute
    Detail --> TopicFE
    Detail --> EventClient
    Detail --> LinkRender
    Topics --> Store
    Store --> TopicFE
    TopicFE --> TopicRoutes
    TopicRoutes --> TopicController --> TopicService
    TopicService --> TopicRepo
    TopicService --> TopicResolver
    TopicService --> LLM
    TopicService --> Embed
    TopicService --> Resources
    TopicResolver --> TopicRepo
    TopicRepo --> TopicsTable
    TopicRepo --> UserTopicsTable
    TopicRepo --> RelationshipsTable
    TopicRepo --> AliasesTable
```

## Topic Discovery Flow

This is the runtime discovery flow for `surprise`, `guided`, and `deep_link`. It reflects how the app decides between cached topics, existing topics, and LLM generation.

```mermaid
---
config:
    htmlLabels: false
    markdownAutoWrap: true
---
flowchart TD
    Start["User wants a topic"] --> Mode{"Entry point"}

        Mode --> Surprise["`Surprise route
        app/discover-surprise.tsx`"]
        Mode --> Guided["`Guided route
        app/discover-guided.tsx`"]
        Mode --> DeepLink["`Deep link route
        /discover-deep-link`"]

    Guided --> LoadSchema["GET /llm/categories"]
        LoadSchema --> GuideQuestions["`Ask category
        subcategory
        optional topicType
        learningGoal`"]
        GuideQuestions --> GuidedRequest["`POST /topics
        mode=guided + constraints`"]

        Surprise --> SurpriseRequest["`POST /topics
        mode=surprise`"]
        DeepLink --> DeepLinkRequest["`POST /topics
        mode=deep_link
        topicId? + topicName?`"]

    SurpriseRequest --> SurpriseCache{"findUnservedTopicForUser() hit?"}
        GuidedRequest --> GuidedCache{"`findUnservedTopicForUser()
        with category/subcategory/topicType hit?`"}

        SurpriseCache -->|yes| CachedStream["`streamCachedTopic()
        simulate SSE from stored topic JSON`"]
    GuidedCache -->|yes| CachedStream
    SurpriseCache -->|no| SurpriseGenerate["llmService.generateTopicStream(mode=surprise)"]
    GuidedCache -->|no| GuidedGenerate["llmService.generateTopicStream(mode=guided)"]

    DeepLinkRequest --> DeepLinkResolve{"topicId lookup or resolver.resolve(topicName)"}
        DeepLinkResolve -->|existing topic| ExistingResources{"learningResources already present?"}
        ExistingResources -->|no| FetchExistingResources["`fetchLearningResources()
        update topics`"]
        ExistingResources -->|yes| RefreshExistingResources["`Serve stored resources
        maybe background refresh`"]
    FetchExistingResources --> CachedStream
    RefreshExistingResources --> CachedStream

    DeepLinkResolve -->|no existing topic| DeepLinkGenerate["llmService.generateTopicStream(mode=deep_link, topicName)"]

        SurpriseGenerate --> PersistFresh["`persistGeneratedTopic()
        reuse existing or insert topic
        set processing statuses`"]
    GuidedGenerate --> PersistFresh
    PersistFresh --> FreshResources["fetchLearningResources()"]

        DeepLinkGenerate --> PersistDeepLink["`persistGeneratedTopic()
        reuse existing or insert topic
        set processing statuses`"]
        PersistDeepLink --> DeepLinkResources["fetchLearningResources()"]

        FreshResources --> EmitFresh["`SSE emits learningResources?
        meta(topicId, cached=false)
        [DONE]`"]
    DeepLinkResources --> EmitFresh
        CachedStream --> EmitCached["`SSE emits meta(topicId, cached=true)
        [DONE]`"]

        EmitFresh --> Preview["`Preview renders TopicCard only
        plain text only
        no active hyperlinks
        no insights bulb`"]
    EmitCached --> Preview

    Preview --> Action{"User action"}
    Action -->|Dismiss| PatchDismiss["PATCH /topics/:id status=dismissed"]
    Action -->|Add to Bucket| PatchDiscovered["PATCH /topics/:id status=discovered"]
        Action -->|Acquire Now| PatchQuiz["`PATCH /topics/:id
        status=discovered
        cache detail
        router.replace('/quiz')`"]
```

Discovery facts that matter:

- Guided discovery loads its taxonomy from `GET /llm/categories`, then conditionally skips the topic-type question when the selected subcategory exposes exactly one topic type.
- Guided cache reuse filters by `category`, `subcategory`, and `topicType`. `learningGoal` is forwarded to generation but does not affect cached-topic selection.
- Surprise, guided, and deep-link previews do not create `user_topics` until the user acts on the preview via `PATCH /topics/:id`.
- Deep-link discovery still differs in how it resolves the preview topic, but ownership is deferred the same way as the other discovery modes.
- Cached discovery still streams over SSE because `streamCachedTopic()` slices stored JSON into 32-character chunks with a 12 ms delay.

## Relationship Resolution Algorithm

`TopicResolver` is the shared dedupe and name-resolution engine used by deep-link lookup, hyperlink extraction, insight generation, and post-create reverse resolution.

```mermaid
---
config:
  htmlLabels: false
  markdownAutoWrap: true
---
flowchart TD
    subgraph Resolve["TopicResolver.resolve / resolveBatch"]
        Input["`candidateName
        candidateEmbedding
        aliasSource
        contextHint`"] --> Exact{"findAliasExact(trimmedName)?"}
        Exact -->|hit| ExactReturn["`Match existing topic
        confidence=exact`"]
        Exact -->|miss| HasEmbedding{"Embedding available?"}
        HasEmbedding -->|no| NewNoEmbedding["`Return NEW
        tier0_miss_no_embedding`"]
        HasEmbedding -->|yes| Neighbors["`findAliasNeighbors()
        candidateEmbedding, k=5`"]
        Neighbors --> AnyNeighbors{"Any neighbors?"}
        AnyNeighbors -->|no| NewNoNeighbors["`Return NEW
        tier3_no_neighbors`"]
        AnyNeighbors -->|yes| HighGate{"`top.score >= 0.92
        topic-consistent
        margin guard passes`"}
        HighGate -->|yes| RecordHighAlias["`upsertAlias(candidateName,
        matchedTopicId,
        aliasSource)`"]
        RecordHighAlias --> HighReturn["`Match existing topic
        confidence=high_vector`"]
        HighGate -->|no| LowGate{"top.score < 0.75?"}
        LowGate -->|yes| NewLow["`Return NEW
        below low threshold`"]
        LowGate -->|no| JudgePrep["`Deduplicate candidate topics
        load aliases for each topic`"]
        JudgePrep --> Judge["LLM judgeEntityResolution()"]
        Judge --> JudgeMatch{"Judge returned offered topicId?"}
        JudgeMatch -->|yes| RecordJudgeAlias["`upsertAlias(candidateName,
        matchedTopicId,
        aliasSource)`"]
        RecordJudgeAlias --> JudgeReturn["`Match existing topic
        confidence=judged`"]
        JudgeMatch -->|no or judge error| NewJudge["`Return NEW
        tier2_judged_new`"]
    end

    subgraph Materialize["How hyperlinks and insights use the resolver"]
        HyperSource["`Hyperlink extraction
        extractMentionedTopics()
        from [[markers]]`"] --> BatchHyper["resolveBatch(names, aliasSource=hyperlink_marker)"]
        InsightSource["`Insight generation
        LLM returns targetName + relationKind`"] --> BatchInsight["resolveBatch(names, aliasSource=insight_target)"]
        BatchHyper --> InsertHyper["`insert topic_relationships rows
        kind=hyperlink
        resolved targetTopicId or null`"]
        BatchInsight --> InsertInsight["`insert topic_relationships rows
        kind=insight
        relationKind set`"]
    end

    subgraph ReverseResolve["After a new topic is created"]
        NewTopic["`persistGeneratedTopic()
        upsertTopic()
        recordPrimaryAlias`"] --> HasTopicEmbedding{"Topic embedding available?"}
        HasTopicEmbedding -->|no| End["Stop"]
        HasTopicEmbedding -->|yes| NearRows["`findUnresolvedRelationshipsNear()
        topicEmbedding, 0.75, 50`"]
        NearRows --> HaveRows{"Any unresolved rows near the new topic?"}
        HaveRows -->|no| End
        HaveRows -->|yes| ReverseInputs["`Build ResolveInput from each unresolved row
        candidateName=targetName
        candidateEmbedding=targetNameEmbedding`"]
        ReverseInputs --> ReverseBatch["resolveBatch(...)"]
        ReverseBatch --> FlipMatches["`resolveRelationships()
        set target_topic_id + resolved_at
        only when outcome.topicId == new topic`"]
    end
```

Resolution facts that matter:

- Every successful match grows the alias graph by inserting the candidate surface form into `topic_aliases`.
- Borderline names do not each trigger their own judge call. `resolveBatch()` combines them into one LLM judgment pass.
- Relationship rows can remain unresolved with `target_topic_id = null` until a later topic creation flips them during reverse resolution.

## Sequence Diagrams

### 1. New Topic Generation

This is the fresh-generation path for surprise, guided, or unresolved deep-link discovery.

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant UI as Discovery UI
    participant FE as topicService.ts
    participant SSE as SSEClient
    participant API as TopicController POST /topics
    participant Service as backend TopicService
    participant Repo as TopicRepository
    participant LLM as LLMService
    participant Resolver as TopicResolver
    participant Embed as embeddingService
    participant Resources as LinkResourceService

    User->>UI: Start discovery
    alt Surprise
        UI->>FE: discoverTopic("surprise")
    else Guided
        UI->>FE: discoverTopic("guided", constraints)
    else Unresolved deep link
        UI->>FE: discoverDeepLinkTopic(undefined, topicName)
    end

    FE->>SSE: connect POST /topics
    SSE->>API: POST /topics
    API->>Service: discoverTopic(userId, request, callbacks)

    Service->>Repo: getDiscoveredTopicNames(userId)
    Service->>Repo: getDismissedTopicNames(userId)

    Service->>LLM: generateTopicStream(...)
    loop each streamed chunk
        LLM-->>Service: onChunk(text)
        Service-->>API: callbacks.onChunk(text)
        API-->>SSE: data {text}
        SSE-->>UI: onProgress(accumulatedText)
        UI->>UI: parseStreamingJson() and render partial TopicCard
    end

    Service->>Service: extractJson() and validate FlatTopicContent
    Service->>Embed: embedText(validated.name)
    Embed-->>Service: candidate embedding or failure
    Service->>Resolver: resolve(name, embedding, aliasSource=name)

    alt Resolver matched existing topic
        Resolver-->>Service: existing topicId
        Service->>Repo: findById(topicId)
    else Resolver declared new
        Service->>Repo: upsertTopic(validated content)
        Service->>Resolver: recordPrimaryAlias(topic.id, topic.name, embedding)
        Service->>Repo: setProcessingStatus(hyperlinks=processing, insights=processing)
        par fire-and-forget jobs
            Service->>Service: runHyperlinkExtractionAsync()
        and
            Service->>Service: runInsightGenerationAsync()
        and
            Service->>Service: reverseResolveUnresolvedRelationships()
        end
    end

    Service->>Resources: getLearningResourcesForTopic(topic)
    Resources-->>Service: resources or []
    Service->>Repo: updateLearningResources(topic.id, resources)
    opt resources present
        Service-->>API: callbacks.onLearningResources(resources)
        API-->>SSE: data {type:"learningResources"}
    end

    Service-->>API: callbacks.onMeta({topicId, cached:false})
    API-->>SSE: data {type:"meta", topicId, cached:false}
    Service-->>API: callbacks.onComplete()
    API-->>SSE: data [DONE]
    SSE-->>FE: stream completed
    FE-->>UI: return {topic, topicId}
    UI->>UI: render final preview and ActionButtons
```

### 2. Cached Discovery and Existing Deep Link Retrieval

This is the no-new-LLM path used when surprise/guided can reuse an unowned topic or when deep-link lookup resolves an existing topic.

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant UI as Discovery UI
    participant FE as topicService.ts
    participant SSE as SSEClient
    participant API as TopicController POST /topics
    participant Service as backend TopicService
    participant Repo as TopicRepository
    participant Resources as LinkResourceService

    User->>UI: Request a topic that may already exist

    alt Surprise or guided cached topic
        UI->>FE: discoverTopic(mode, constraints?)
        FE->>SSE: connect POST /topics
        SSE->>API: POST /topics
        API->>Service: discoverTopic(userId, request, callbacks)
        Service->>Repo: findUnservedTopicForUser(userId, request)
        Repo-->>Service: cached topic
    else Deep link existing topic
        UI->>FE: discoverDeepLinkTopic(topicId? or topicName)
        FE->>SSE: connect POST /topics
        SSE->>API: POST /topics
        API->>Service: discoverTopic(userId, {mode:deep_link, ...}, callbacks)
        alt topicId provided
            Service->>Repo: findById(topicId)
        else topicName provided
            Service->>Service: resolver.resolve(topicName, aliasSource=user_query)
            Service->>Repo: findById(resolvedTopicId)
        end
    end

    alt topic has no learning resources
        Service->>Resources: getLearningResourcesForTopic(topic)
        Resources-->>Service: resources or []
        Service->>Repo: updateLearningResources(topic.id, resources)
    else topic already has resources
        Service->>Service: triggerLearningResourcesRefreshIfNeeded(topic)
    end

    Service->>Service: streamCachedTopic(topic.id, toFlatTopicContent(topic))
    loop 32-character slices
        Service-->>API: callbacks.onChunk(slice)
        API-->>SSE: data {text}
        SSE-->>UI: onProgress(accumulatedText)
    end

    Service-->>API: callbacks.onMeta({topicId, cached:true})
    API-->>SSE: data {type:"meta", topicId, cached:true}
    Service-->>API: callbacks.onComplete()
    API-->>SSE: data [DONE]
    UI->>UI: render preview with plain text and actions
```

### 3. Hyperlink and Insight Generation

These jobs are kicked off from `persistGeneratedTopic()` after the topic record exists and both processing flags are written.

```mermaid
sequenceDiagram
    autonumber
    participant Service as backend TopicService
    participant Utils as topic.utils.ts
    participant LLM as LLMService
    participant Embed as embeddingService
    participant Resolver as TopicResolver
    participant Repo as TopicRepository

    Note over Service: Background work begins after setProcessingStatus(hyperlinks=processing, insights=processing)

    par Hyperlink extraction
        Service->>Utils: extractMentionedTopics(flatContent, sourceTopicName)
        Utils-->>Service: unique marker names from allowed fields
        opt at least one marker
            Service->>Embed: embedTexts(mentionedNames)
            Embed-->>Service: embeddings or failure
        end
        Service->>Resolver: resolveBatch(names, aliasSource=hyperlink_marker)
        opt borderline names exist
            Resolver->>LLM: judgeEntityResolution(batch)
            LLM-->>Resolver: topicId or NEW per item
        end
        Service->>Repo: insertRelationships(kind=hyperlink, targetNameEmbedding, targetTopicId or null)
        Service->>Repo: setProcessingStatus(hyperlinks=ready)
    and Insight generation
        Service->>LLM: generateInsights(topic summary)
        LLM-->>Service: [{targetName, relationKind}, ...]
        opt at least one insight target
            Service->>Embed: embedTexts(targetNames)
            Embed-->>Service: embeddings or failure
        end
        Service->>Resolver: resolveBatch(names, aliasSource=insight_target)
        opt borderline names exist
            Resolver->>LLM: judgeEntityResolution(batch)
            LLM-->>Resolver: topicId or NEW per item
        end
        Service->>Repo: insertRelationships(kind=insight, relationKind, targetNameEmbedding, targetTopicId or null)
        Service->>Repo: setProcessingStatus(insights=ready)
    and Reverse resolution
        opt new topic has embedding
            Service->>Repo: findUnresolvedRelationshipsNear(topicEmbedding, 0.75, 50)
            Repo-->>Service: unresolved rows near the new topic
            Service->>Resolver: resolveBatch(candidateName=targetName, candidateEmbedding=targetNameEmbedding)
            Service->>Repo: resolveRelationships(rows whose outcome.topicId == new topic)
        end
    end

    alt any hyperlink job failure
        Service->>Repo: setProcessingStatus(hyperlinks=failed)
    end

    alt any insight job failure
        Service->>Repo: setProcessingStatus(insights=failed)
    end
```

### 4. Topic Detail Retrieval, Hyperlink Retrieval, and Insight Retrieval

This is the owned-topic path used after a topic is in `user_topics` and the app navigates to `/topic-detail`.

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Detail as TopicDetailScreen
    participant FE as topicService.ts
    participant API as TopicController
    participant Service as backend TopicService
    participant Repo as TopicRepository
    participant Resources as LinkResourceService
    participant Events as GET /topics/:id/events SSE

    User->>Detail: Open /topic-detail?topicId=...
    Detail->>Detail: Read cached topicDetails[topicId] if present
    Detail->>FE: getTopicDetail(topicId)
    FE->>API: GET /topics/:id
    API->>Service: getTopicDetail(userId, topicId)
    par
        Service->>Repo: findById(topicId)
    and
        Service->>Repo: findUserTopic(userId, topicId)
    and
        Service->>Repo: findHyperlinks(topicId, userId)
    end

    alt learningResources empty
        Service->>Resources: getLearningResourcesForTopic(topic)
        Resources-->>Service: resources or []
        Service->>Repo: updateLearningResources(topic.id, resources)
    else learningResources already present
        Service->>Service: triggerLearningResourcesRefreshIfNeeded(topic)
    end

    Service-->>API: TopicResponse with hyperlinks and statuses
    API-->>FE: topic detail
    FE-->>Detail: set topic state and cache entry

    alt hyperlinksStatus == failed
        Detail->>FE: triggerHyperlinks(topic.id)
        FE->>API: POST /topics/:id/hyperlinks
        API->>Service: triggerHyperlinks(topic.id)
        Service->>Repo: setProcessingStatus(hyperlinks=processing)
        Service->>Service: runHyperlinkExtractionAsync()
        API-->>FE: 202 processing
    end

    alt hyperlinksStatus == processing or insightsStatus == processing
        Detail->>Events: open SSE connection
        loop every 3 seconds, max 40 polls
            Events->>Service: getTopicDetail(userId, topicId)
            Service->>Repo: read topic, userTopic, hyperlinks
            Events-->>Detail: data {type:status, hyperlinksStatus, insightsStatus, hyperlinks}
        end
        alt both statuses ready or neither processing
            Events-->>Detail: data {type:done}
            Detail->>Detail: close SSE connection
        end
    end

    User->>Detail: Tap inline hyperlink
    Detail->>Detail: Match targetName against topic.hyperlinks
    alt targetTopicId present and owned
        Detail->>Detail: router.push('/topic-detail', {topicId})
    else targetTopicId present but not owned
        Detail->>Detail: router.push('/discover-deep-link', {topicId})
    else targetTopicId is null
        Detail->>Detail: router.push('/discover-deep-link', {topicName})
    end

    User->>Detail: Tap bulb icon
    alt insightsStatus == ready
        Detail->>FE: getInsights(topic.id)
        FE->>API: GET /topics/:id/insights
        API->>Service: getInsights(userId, topicId)
        Service->>Repo: findInsights(topicId, userId)
        API-->>FE: {status:ready, groups}
        FE-->>Detail: open panel with groups
    else insightsStatus == processing
        Detail->>Detail: open panel skeleton and wait for events SSE
        opt SSE later reports insightsStatus=ready while panel is open
            Detail->>FE: getInsights(topic.id)
            FE->>API: GET /topics/:id/insights
            API->>Service: getInsights(userId, topicId)
            Service->>Repo: findInsights(topicId, userId)
            API-->>FE: {status:ready, groups}
            FE-->>Detail: panel transitions to ready
        end
    else insightsStatus is null or failed
        Detail->>FE: triggerInsights(topic.id)
        FE->>API: POST /topics/:id/insights
        API->>Service: triggerInsights(topic.id)
        Service->>Repo: setProcessingStatus(insights=processing)
        Service->>Service: runInsightGenerationAsync()
        API-->>FE: 202 processing
        Detail->>Detail: open panel skeleton and ensure events SSE is active
    end

    User->>Detail: Tap insight chip
    alt targetTopicId present and owned
        Detail->>Detail: router.push('/topic-detail', {topicId})
    else targetTopicId present but not owned
        Detail->>Detail: router.push('/discover-deep-link', {topicId})
    else targetTopicId is null
        Detail->>Detail: router.push('/discover-deep-link', {topicName})
    end
```

### 5. Topics List Retrieval

This is the collection retrieval path used by the Topics tab, including pagination and facet loading.

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Screen as TopicsScreen
    participant Store as useAppStore
    participant FE as topicService.ts
    participant API as TopicController
    participant Service as backend TopicService
    participant Repo as TopicRepository

    User->>Screen: Open Topics tab or return after discovery
    Screen->>Store: fetchTopics(filters, append=false)
    Store->>FE: getTopics(filters)
    FE->>API: GET /topics?search&status&topicType&category&subcategory&page&limit
    API->>Service: getTopics(userId, filters)
    Service->>Repo: findUserTopics(userId, filters)
    Repo-->>Service: rows + total count
    Service-->>API: {topics, total, page, limit}
    API-->>FE: paged result
    FE-->>Store: topic summaries
    Store-->>Screen: render TopicListCard list

    Screen->>FE: getTopicFacets()
    FE->>API: GET /topics/facets
    API->>Service: getTopicFacets(userId)
    Service->>Repo: getUserTopicFacetRows(userId)
    Repo-->>Service: category + subcategory counts
    Service-->>API: categories + subcategoriesByCategory
    API-->>FE: facets
    FE-->>Screen: update filter sheets

    opt user scrolls near the end
        Screen->>Store: fetchTopics(filters, append=true)
        Store->>FE: getTopics(nextPage)
        FE->>API: GET /topics?page=n
        API->>Service: getTopics(userId, filters)
        Service->>Repo: findUserTopics(userId, filters)
        API-->>FE: next page
        FE-->>Store: merge unique topics by id
    end

    User->>Screen: Tap a topic row
    Screen->>Screen: router.push('/topic-detail', {topicId})
```

## Data and Status Facts That Matter

| Field                               | Stored on             | Meaning in the running system                                                      |
| ----------------------------------- | --------------------- | ---------------------------------------------------------------------------------- |
| `status`                            | `user_topics`         | Per-user ownership state: `discovered`, `learned`, or `dismissed`                  |
| `discoveryMethod`                   | `user_topics`         | Which UX flow attached the user to the topic: `surprise`, `guided`, or `deep_link` |
| `hyperlinksStatus`                  | `topics`              | Async hyperlink extraction state for the shared topic record                       |
| `insightsStatus`                    | `topics`              | Async insight generation state for the shared topic record                         |
| `targetTopicId`                     | `topic_relationships` | Resolved target topic if known; `null` means the relationship exists by name only  |
| `aliasTextLower` + `aliasEmbedding` | `topic_aliases`       | The durable surface-form lookup index used by the resolver                         |

## Implementation Facts Worth Keeping In Mind

- Discovery previews are always plain text because `TopicCard` only gets `getLinkVariant` and `onTopicPress` from `TopicDetailScreen`. Without those props, `LinkedText` strips `[[markers]]` and renders non-clickable text.
- `GET /topics/:id` requires both a shared `topics` row and a per-user `user_topics` row. Missing either one returns `TOPIC_NOT_FOUND`.
- `GET /topics/:id/events` is not push from the database. The controller polls `getTopicDetail()` every 3 seconds, up to 40 times, and emits SSE frames with the latest statuses and hyperlinks.
- Failed hyperlink extraction is retried automatically by `TopicDetailScreen` on load. Failed insight generation is retried only after user action, either by reopening insights from the bulb icon or by tapping Retry in `InsightsPanel`.
- Learning resources are fetched synchronously when missing during discovery or detail retrieval so the first response can include them. When resources already exist, the backend may refresh them in the background if they are stale and not on cooldown.
- Hyperlink extraction only scans the allowed content fields in `FlatTopicContent`. Insight generation is a separate LLM call that returns `targetName` and `relationKind` pairs.
- Surprise and guided discovery choose from topics that have no `user_topics` row for the current user. Dismissed topics are therefore excluded from future surprise/guided reuse until their `user_topics` row changes.
