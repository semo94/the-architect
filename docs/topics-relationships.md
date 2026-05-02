Imagine a big box of topic cards.

- `topics` is the box of cards.
- `user_topics` is a sticky note saying “this user owns this card”.
- `topic_relationships` is string connecting one card to another card.
- `topic_aliases` is a pile of nickname stickers for a card.

Now the tricky part:

- Drawing string is easy.
- Figuring out whether “Kubernetes”, “K8s”, and “that container orchestrator thing” are the same card is the hard part.

That hard part is the resolver in topic.resolver.ts.

A simple story:

1. The app creates a topic card, like “Kafka”.
2. It reads the text on that card and sees names wrapped like `[[Event Sourcing]]`.
3. For each name, it asks: “Do I already have a card for this exact thing?”
4. If yes, it ties the string directly to that card.
5. If no, it keeps the name anyway, but leaves the other end of the string hanging for later.
6. Later, if a real card for that hanging name gets created, the backend comes back and snaps the string onto it.

That “leave it hanging, then fix it later” behavior is why the system feels more complex than a normal CRUD feature.

**When It Runs**

There are three main times this system wakes up.

- Fresh surprise or guided discovery. The client calls discovery from SurpriseMeFlow.tsx or GuideMeFlow.tsx. The backend then reaches topic.service.ts, parses the LLM result, and calls topic.service.ts. Right there, it immediately starts three background jobs: hyperlink extraction, insight generation, and reverse resolution at topic.service.ts.
- Deep-link discovery. The preview screen starts at DiscoverDeepLinkScreen.tsx. On the backend, topic.service.ts first tries to resolve the requested name to an existing topic using the same resolver. If it finds one, it just streams the existing topic. If not, it generates a new topic through topic.service.ts, which again funnels into topic.service.ts and starts the same background jobs.
- Topic detail view and retries. Opening a detail screen hits TopicDetailScreen.tsx and fetches current hyperlinks and statuses. If hyperlinks previously failed, the screen auto-retries them at TopicDetailScreen.tsx. If either hyperlinks or insights are still processing, the screen opens the events endpoint and watches progress. That endpoint is exposed in topic.routes.ts and implemented by polling in topic.controller.ts. It is not push-from-db magic; it polls every 3 seconds.
- Insights are slightly different from hyperlinks. Hyperlinks are kicked off automatically for newly created topics. Insights are also kicked off automatically for newly created topics, but for older topics with `null` or `failed` insight state, the user usually triggers them by tapping the bulb in TopicDetailScreen.tsx, which calls topic.service.ts.

One more subtle but important behavior: discovery previews are plain text, not live links. That happens because TopicCard.tsx only gets link callbacks on the detail screen, and LinkedText.tsx strips `[[markers]]` to plain text when no link handler is passed.

**How The Relationship Builder Actually Works**

There are really two edge builders and one shared identity checker.

1. Hyperlink extraction

The topic content generator is allowed to place `[[Topic Name]]` markers into specific content fields. Those fields are hardcoded in topic.utils.ts, and extraction happens in topic.utils.ts. That gives a clean list of mentioned topic names.

Then topic.service.ts does this:

- batch-embeds all mentioned names
- sends them all through `resolveBatch`
- inserts one `topic_relationships` row per mention with `kind = hyperlink`
- marks each row either resolved now or unresolved for later

If a target is unresolved, the row still exists. It just has `targetTopicId = null`.

2. Insight generation

This is a second, separate pipeline. It does not read `[[markers]]`. It asks the LLM to invent semantic learning connections like “prerequisite of”, “used with”, or “alternative to”. The prompt lives in prompts.ts. The job itself is topic.service.ts, and it:

- asks the LLM for up to 10 relationship suggestions
- batch-embeds the target names
- sends them through the same resolver
- inserts `topic_relationships` rows with `kind = insight` and a `relationKind`

So hyperlinks come from explicit text markers. Insights come from a second LLM pass.

3. The resolver

This is the brain of the whole thing. It is shared by deep-link lookup, hyperlink resolution, insight resolution, and reverse resolution.

The thresholds are defined at topic.resolver.ts:

- high confidence: `0.92`
- low confidence: `0.75`
- ambiguity margin guard: `0.04`

The resolver works like this:

1. Exact alias match. Check whether the candidate name already exists in `topic_aliases` using topic.repository.ts. If yes, done.
2. Vector neighbor search. If there is an embedding, search nearest alias vectors with topic.repository.ts.
3. Auto-accept strong matches. If the top score is at least `0.92`, the nearby matches are consistent, and the ambiguity guard passes, it treats that as the same topic.
4. Auto-reject weak matches. If the top score is below `0.75`, it declares the name new.
5. Ask the LLM judge for borderline cases. That prompt is in prompts.ts. Importantly, topic.resolver.ts groups all borderline items into one judge call instead of one call per name.
6. Grow the alias graph. Whenever a match succeeds, the resolver records the new surface form as another alias for that topic. That is why the system gets better over time.

This alias growth is the quiet superpower of the design. Every successful match teaches the system a new nickname.

4. Reverse resolution

This is the cleanup crew. When a brand-new topic gets created, topic.service.ts looks for unresolved relationship rows whose target-name embedding is close to the new topic embedding using topic.repository.ts. It then runs those names back through the resolver. If any of them now point to the new topic, it flips those rows with topic.repository.ts.

That means a link can be born “dangling” today and become a real edge tomorrow.

**Complexity**

Conceptually, this feature is medium-high complexity because it has delayed completion. A relationship is not always fully known at creation time.

Algorithmically, the local CPU work is pretty tame:

- Hyperlink extraction is basically `O(text)` over a fixed list of allowed fields.
- For `N` candidate names, batching embeddings and building rows is roughly `O(N)`.
- Resolver work is roughly `O(N)` app-side, with one exact lookup and one nearest-neighbor lookup per candidate. The nearest-neighbor set is capped to 5 aliases, so the in-memory candidate work is effectively constant per item.
- Borderline names do not cause `N` LLM judge calls. They collapse into one batched judge call, which is a major complexity and cost reduction.
- Reverse resolution is bounded to 50 nearby unresolved rows in topic.service.ts, so it does not blindly re-check the whole graph from application code.

So the system is not CPU-complex in the normal algorithm-class sense. Its real cost is external latency and coordination: embeddings, vector search, LLM judgment, retries, and delayed reconciliation.

If you remember only three things, remember these:

- The graph is shared across users, but ownership is per-user.
- Hyperlinks come from `[[markers]]`; insights come from a second LLM pass.
- The resolver is the real heart of the system, because identity is harder than edge creation.
