# LLM Migration Plan: Frontend → Backend

## Executive Summary

Move all LLM integration (API keys, prompt engineering, provider abstraction, streaming) from the Expo frontend into the Fastify backend as a new `llm` module. The frontend becomes a thin SSE consumer that sends structured requests and progressively renders streamed JSON chunks — it never touches LLM credentials or prompt templates again.

**Key clarification on the proxy (`scripts/llm-proxy.mjs`):** The proxy is NOT being "migrated" into the backend — it is being **replaced and deleted**. The proxy was a dev-only CORS workaround to let the web bundle call LLM APIs. With a proper backend, the backend itself is the proxy: it receives FE requests, calls LLM APIs, and relays the stream. There is no proxy code to carry forward — the backend's LLM module is built from scratch following the existing Fastify patterns (routes → controller → service).

---

## 1. Current Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                             │
│                                                             │
│  SurpriseMeFlow / GuideMeFlow / quiz.tsx                    │
│       ↓                                                     │
│  useStreamingData hook  ←  streamingParser.ts                │
│       ↓                                                     │
│  llmService.ts  (prompt building, Zod validation,           │
│                  provider auth, model selection)             │
│       ↓                                                     │
│  sseService.ts  (SSE fetch client)                          │
│       ↓                                                     │
│  ┌──── Web ─────────────┐  ┌──── Mobile ─────────────┐      │
│  │ llm-proxy.mjs:8787   │  │ Direct Anthropic/OpenAI │      │
│  │ (Express, CORS fix)  │  │ API calls               │      │
│  └──────────────────────┘  └─────────────────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### What lives in FE today (to be moved)

| Concern                                                          | File(s)                              | Destination                                                                      |
| ---------------------------------------------------------------- | ------------------------------------ | -------------------------------------------------------------------------------- |
| LLM API keys & config                                            | `app.config.js` (extra.\*), env vars | `backend/.env`, `backend/src/modules/shared/config/env.ts`                       |
| Provider abstraction (Anthropic/OpenAI headers, URLs)            | `llmService.ts`                      | `backend/src/modules/llm/llm.provider.ts`                                        |
| Prompt templates                                                 | `src/utils/prompts.ts`               | `backend/src/modules/llm/prompts.ts`                                             |
| Zod validation schemas (TopicContentSchema, QuizQuestionsSchema) | `llmService.ts`                      | `backend/src/modules/llm/llm.schemas.ts`                                         |
| JSON extraction from LLM response                                | `llmService.ts` (`extractJSON`)      | `backend/src/modules/llm/llm.service.ts`                                         |
| SSE relay (proxy streaming)                                      | `scripts/llm-proxy.mjs`              | `backend/src/modules/llm/llm.controller.ts` (SSE response)                       |
| Flat→nested Topic transform                                      | `llmService.ts` (`generateTopic`)    | `backend/src/modules/llm/llm.service.ts`                                         |
| Topic type definitions & quiz guidance                           | `src/utils/prompts.ts`               | `backend/src/modules/llm/prompts.ts`                                             |
| Category schema constant                                         | `src/constants/categories.ts`        | Move to backend as single source of truth; FE fetches it from backend (see §3.8) |

### What stays in FE (modified)

| Concern                 | File(s)                                     | Change                                                                                    |
| ----------------------- | ------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `useStreamingData` hook | `src/hooks/useStreamingData.ts`             | No change — it already expects `onProgress(partialText)`                                  |
| `streamingParser.ts`    | `src/utils/streamingParser.ts`              | No change — still parses progressive JSON on client                                       |
| Zod schemas             | `src/services/llmService.ts`                | **Keep** — `TopicContentSchema` and `QuizQuestionsSchema` validate final accumulated text |
| `extractJSON()`         | `src/services/llmService.ts`                | **Keep** — parses accumulated text after stream completes                                 |
| `sseService.ts`         | `src/services/sseService.ts`                | Simplified — always talks to backend, no more provider-specific branch                    |
| `llmService.ts`         | `src/services/llmService.ts`                | **Rewrite** — thin HTTP client + Zod validation on accumulated text                       |
| Category schema         | `src/constants/categories.ts`               | **Delete** — FE fetches schema from backend via `GET /llm/categories`                     |
| Components              | `SurpriseMeFlow`, `GuideMeFlow`, `quiz.tsx` | No change — they call `llmService.*` which now delegates to backend                       |

---

## 2. Target Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                 │
│                                                                  │
│  SurpriseMeFlow / GuideMeFlow / quiz.tsx                         │
│       ↓                                                          │
│  useStreamingData hook  ←  streamingParser.ts                     │
│       ↓                                                          │
│  llmService.ts  (thin HTTP client — sends structured             │
│                  request, receives SSE text chunks)               │
│       ↓                                                          │
│  sseService.ts  (SSE fetch client, always proxy mode)            │
│       ↓                                                          │
│  Backend API (port 3000)                                         │
└──────────────┬───────────────────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────────────────────┐
│                         BACKEND (Fastify)                        │
│                                                                  │
│  POST /llm/topic   →  llm.controller  →  llm.service   │
│  POST /llm/quiz    →  llm.controller  →  llm.service   │
│                                                                  │
│  llm.service:                                                    │
│    - Builds prompt (prompts.ts)                                  │
│    - Calls LLM provider (llm.provider.ts)                        │
│    - Streams response back as SSE                                │
│    - On completion: validates (Zod), transforms, returns final   │
│                                                                  │
│  llm.provider.ts:                                                │
│    - Provider abstraction (Anthropic/OpenAI)                     │
│    - Handles auth headers, streaming API format                  │
│    - Returns ReadableStream                                      │
│                                                                  │
│  env.ts:                                                         │
│    - LLM_PROVIDER, LLM_API_KEY, LLM_MODEL, etc.                 │
└──────────────────────────────────────────────────────────────────┘
```

---

## 3. Backend: New `llm` Module

### 3.1 File Structure

```
backend/src/modules/llm/
├── llm.routes.ts          # Fastify route registration
├── llm.controller.ts      # Request handling, SSE response writing
├── llm.service.ts         # Business logic: prompt → LLM → validate → transform
├── llm.provider.ts        # Provider abstraction (Anthropic/OpenAI API calls)
├── llm.schemas.ts         # Zod schemas for request validation + LLM response validation
└── prompts.ts             # Prompt templates (moved from FE)
```

### 3.2 `llm.routes.ts`

```
POST /llm/topic     →  controller.generateTopic()
POST /llm/quiz       →  controller.generateQuizQuestions()
```

All endpoints accept JSON body, return `text/event-stream` SSE responses, and are **auth-protected** using the existing `fastify.authenticate` pre-handler (JWT guard).

```ts
// All LLM routes require authentication
fastify.post(
  "/topic",
  {
    onRequest: [fastify.authenticate],
  },
  async (request, reply) => {
    await controller.generateTopic(request, reply);
  },
);
```

The FE must include the JWT access token (via cookie or Authorization header) on all `/llm/*` requests — the same auth flow already used for `/users/*` and `/auth/session`.

### 3.3 `llm.schemas.ts`

**Request schemas (Zod):**

```ts
// POST /llm/topic
const GenerateTopicRequestSchema = z.object({
  mode: z.enum(["surprise", "guided"]),
  alreadyDiscovered: z.array(z.string()),
  dismissed: z.array(z.string()),
  // categorySchema removed — backend owns it
  constraints: z
    .object({
      // Required for guided mode
      category: z.string(),
      subcategory: z.string(),
      topicType: z.string(), // TopicType enum validated separately
      learningGoal: z.string(),
    })
    .optional(),
});

// POST /llm/quiz
const GenerateQuizRequestSchema = z.object({
  topic: z.object({
    name: z.string(),
    topicType: z.string(),
    category: z.string(),
    subcategory: z.string(),
    content: z.object({
      what: z.string(),
      why: z.string(),
      pros: z.array(z.string()),
      cons: z.array(z.string()),
      compareToSimilar: z.array(
        z.object({
          topic: z.string(),
          comparison: z.string(),
        }),
      ),
    }),
  }),
});
```

**LLM response schemas (moved from FE `llmService.ts`):**

```ts
const TopicContentSchema = z.object({ ... });   // Flat format, same as current
const QuizQuestionsSchema = z.object({ ... });   // Same as current
```

### 3.4 `llm.provider.ts`

Provider abstraction encapsulating:

- **Anthropic**: `x-api-key` header, `anthropic-version`, `POST https://api.anthropic.com/v1/messages` with `stream: true`
- **OpenAI**: `Authorization: Bearer` header, `POST https://api.openai.com/v1/chat/completions` with `stream: true`

Exposes a single method:

```ts
async streamCompletion(messages: LLMMessage[], options?: { maxTokens, temperature }): Promise<ReadableStream>
```

Reads config from `env` (not from request body — no client model override).

### 3.5 `llm.controller.ts`

SSE response pattern for Fastify:

```ts
async generateTopic(request: FastifyRequest, reply: FastifyReply) {
  const body = GenerateTopicRequestSchema.parse(request.body);

  // Set SSE headers
  reply.raw.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  // Handle client disconnect — abort upstream LLM fetch
  const abortController = new AbortController();
  request.raw.on('close', () => abortController.abort());

  await this.llmService.generateTopicStream(body, {
    onChunk: (text: string) => {
      reply.raw.write(`data: ${JSON.stringify({ text })}\n\n`);
    },
    onComplete: () => {
      reply.raw.write('data: [DONE]\n\n');
      reply.raw.end();
    },
    onError: (error: Error) => {
      reply.raw.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      reply.raw.end();
    },
  }, abortController.signal);
}
```

### 3.6 `llm.service.ts`

Core logic moved from FE `llmService.ts`:

1. **`generateTopicStream(params, callbacks, signal)`**:
   - Build prompt via `promptTemplates.generateTopic(...)` using backend-owned `categorySchema`
   - Call `provider.streamCompletion(...)` to get upstream ReadableStream
   - Read chunks, parse provider-specific format (Anthropic `content_block_delta` / OpenAI `choices[0].delta.content`)
   - Forward each text chunk via `callbacks.onChunk(text)` (raw relay — no accumulation or validation)
   - On stream done: `callbacks.onComplete()` — backend does NOT validate the LLM output; FE handles that
   - Respect `signal` for abort on client disconnect

2. **`generateQuizStream(params, callbacks, signal)`**:
   - Build prompt via `promptTemplates.generateQuizQuestions(...)`
   - Same streaming relay pattern
   - On stream done: `callbacks.onComplete()`

3. **`extractJSON(text)`** — moved from FE, handles markdown code blocks

### 3.7 `prompts.ts`

Direct copy of `src/utils/prompts.ts` with adjustments:

- Remove `__DEV__` references (use `env.NODE_ENV` for log gating)
- Remove dependency on FE-specific imports
- Export same `promptTemplates` object
- Topic type definitions, quiz focus areas, quiz question guidance — all move here
- Type imports (`Topic`, `TopicType`) — define locally or in `llm.schemas.ts`

### 3.8 Category Schema: Single Source of Truth

The 828-line category schema (`src/constants/categories.ts`) is currently only in FE. It serves two purposes:

1. **Prompt context** — passed to LLM prompts so it knows the architectural knowledge space
2. **Guide Me UI** — FE uses it to render category/subcategory/topicType selection steps

**Strategy: Backend owns it, FE fetches it.**

1. Move `categories.ts` to `backend/src/modules/llm/categories.ts` (the single source of truth)
2. Add a new endpoint: `GET /llm/categories` — returns the category schema as JSON
3. FE fetches and caches the schema on app load (it's static data — can aggressively cache)
4. When FE calls `POST /llm/topic`, it no longer sends `categorySchema` in the body — the backend already has it
5. Delete `src/constants/categories.ts` from FE

**Benefits:**

- No duplication — one file, one owner
- Schema updates don't require FE deploys
- Request bodies shrink significantly (no more sending 800+ lines of JSON per LLM call)
- Guide Me UI fetches the same data the backend uses for prompts

**Updated request schema for topic generation:**

```ts
const GenerateTopicRequestSchema = z.object({
  mode: z.enum(["surprise", "guided"]),
  alreadyDiscovered: z.array(z.string()),
  dismissed: z.array(z.string()),
  // categorySchema removed — backend owns it
  constraints: z
    .object({
      category: z.string(),
      subcategory: z.string(),
      topicType: z.string(),
      learningGoal: z.string(),
    })
    .optional(),
});
```

**Updated endpoint:**

```ts
// GET /llm/categories — public or auth-protected, returns category schema
fastify.get(
  "/categories",
  {
    onRequest: [fastify.authenticate],
  },
  async (_request, reply) => {
    return reply.send(categorySchema);
  },
);
```

---

## 4. Backend: Env Changes

### 4.1 Add to `backend/.env` and `.env.example`

```env
# LLM Configuration
LLM_PROVIDER=anthropic
LLM_API_KEY=sk-ant-...
LLM_API_URL=https://api.anthropic.com/v1/messages
LLM_MODEL=claude-3-5-sonnet-20241022
LLM_ANTHROPIC_VERSION=2023-06-01
LLM_MAX_TOKENS=4000
LLM_TEMPERATURE=0.7
```

### 4.2 Extend `backend/src/modules/shared/config/env.ts`

Add LLM fields to the Zod env schema:

```ts
// LLM
LLM_PROVIDER: z.enum(['anthropic', 'openai']).default('anthropic'),
LLM_API_KEY: z.string().min(1),
LLM_API_URL: z.url().optional(),
LLM_MODEL: z.string().default('claude-3-5-sonnet-20241022'),
LLM_ANTHROPIC_VERSION: z.string().default('2023-06-01'),
LLM_MAX_TOKENS: z.string().default('4000').transform(Number),
LLM_TEMPERATURE: z.string().default('0.7').transform(Number),
```

### 4.3 Register routes in `backend/src/app.ts`

```ts
import { llmRoutes } from "./modules/llm/llm.routes.js";

// ... inside buildApp()
await app.register(llmRoutes, { prefix: "/llm" });
```

---

## 5. Frontend: Changes

### 5.1 Rewrite `src/services/llmService.ts`

The service becomes a thin HTTP client. It no longer knows about:

- LLM API keys, providers, or models
- Prompt templates
- Raw LLM response formats

New responsibilities:

- Send structured request body to backend (no `categorySchema` — backend owns it)
- Use `sseService` to consume SSE stream
- Accumulate text chunks and pass to `onProgress` for progressive rendering
- On stream complete: run `extractJSON()` → Zod validation → transform (same as today)
- Return final validated result

```ts
class LLMService {
  private getBackendUrl(): string {
    return Constants.expoConfig?.extra?.backendUrl || "http://localhost:3000";
  }

  async generateTopic(
    mode: "surprise" | "guided",
    alreadyDiscovered: string[],
    dismissed: string[],
    categorySchema: any, // Still accepted for backward compat but NOT sent to backend
    constraints?: { category; subcategory; topicType; learningGoal },
    onProgress?: (partialText: string) => void,
  ): Promise<Topic> {
    const url = `${this.getBackendUrl()}/llm/topic`;
    const body = { mode, alreadyDiscovered, dismissed, constraints };
    const rawJson = await this.streamRequest(url, body, onProgress);

    // Validate and transform (same logic as current callLLMStream → extractJSON → Zod)
    const validated = TopicContentSchema.parse(rawJson);
    return this.transformToTopic(validated);
  }

  async generateQuizQuestions(
    topic: Topic,
    onProgress?: (partialText: string) => void,
  ): Promise<QuizQuestion[]> {
    const url = `${this.getBackendUrl()}/llm/quiz`;
    const body = { topic: { name: topic.name, topicType: topic.topicType, ... } };
    const rawJson = await this.streamRequest(url, body, onProgress);

    const validated = QuizQuestionsSchema.parse(rawJson);
    return validated.questions.map(q => ({ ...transform... }));
  }

  private streamRequest(url: string, body: any, onProgress?: (text: string) => void): Promise<any> {
    let accumulatedText = '';
    return new Promise((resolve, reject) => {
      sseClient.connect(url, body, {
        onMessage: (data) => {
          if (data.text) {
            accumulatedText += data.text;
            onProgress?.(accumulatedText);
          }
        },
        onError: (error) => reject(error),
        onComplete: () => {
          try {
            resolve(this.extractJSON(accumulatedText));
          } catch (err) {
            reject(err);
          }
        },
      });
    });
  }

  cancelStream() { sseClient.cancel(); }
  isStreaming() { return sseClient.isActive(); }
}
```

### 5.2 Simplify `src/services/sseService.ts`

Remove the `useProxy` branching and direct-API auth logic:

- Always expect normalized `data: { text: "..." }` format (proxy mode)
- Remove `extractStreamText()` and `isStreamComplete()` provider-specific methods
- Remove `expo-constants` import for API key injection
- The `useProxy` parameter becomes unused / removed

### 5.3 Update `app.config.js`

**Remove** all LLM-related `extra` fields:

```diff
  extra: {
    eas: { projectId: "..." },
-   llmProvider: process.env.LLM_PROVIDER || "anthropic",
-   llmApiKey: process.env.LLM_API_KEY,
-   llmApiUrl: process.env.LLM_API_URL || "...",
-   llmModel: process.env.LLM_MODEL || "...",
-   llmAnthropicVersion: process.env.LLM_ANTHROPIC_VERSION || "...",
-   llmMaxTokens: parseInt(process.env.LLM_MAX_TOKENS || "4000", 10),
-   llmTemperature: parseFloat(process.env.LLM_TEMPERATURE || "0.7"),
-   llmProxyUrl: process.env.EXPO_PUBLIC_LLM_PROXY_URL || "",
+   backendUrl: process.env.EXPO_PUBLIC_BACKEND_URL || "http://localhost:3000",
  },
```

### 5.4 Update `package.json` scripts (root)

```diff
- "proxy": "node ./scripts/llm-proxy.mjs",
- "web": "EXPO_PUBLIC_LLM_PROXY_URL=http://localhost:8787 LLM_PROXY_PORT=8787 concurrently ... \"npm:proxy\" \"expo start --web\"",
+ "web": "EXPO_PUBLIC_BACKEND_URL=http://localhost:3000 expo start --web",
```

The proxy is no longer needed — the backend handles everything.

### 5.5 Clean up FE files

| Action       | File                            | Reason                                    |
| ------------ | ------------------------------- | ----------------------------------------- |
| **Delete**   | `scripts/llm-proxy.mjs`         | Replaced by backend LLM module            |
| **Delete**   | `src/utils/prompts.ts`          | Moved to backend `llm/prompts.ts`         |
| **Simplify** | `src/services/sseService.ts`    | Remove provider-specific logic            |
| **Rewrite**  | `src/services/llmService.ts`    | Thin backend client                       |
| **Keep**     | `src/utils/streamingParser.ts`  | Still needed for progressive UI rendering |
| **Keep**     | `src/hooks/useStreamingData.ts` | No change                                 |
| **Delete**   | `src/constants/categories.ts`   | Moved to backend; FE fetches via API      |

---

## 6. SSE Contract Between FE ↔ BE

Both endpoints use identical SSE event format:

### During streaming (text chunks)

```
data: {"text":"partial JSON chunk from LLM"}\n\n
```

### On completion

```
data: [DONE]\n\n
```

### On error

```
data: {"error":"error message"}\n\n
```

### FE behavior

- `data.text` → accumulate and pass to `onProgress()` for progressive rendering via `streamingParser.ts`
- `[DONE]` → stream is complete; FE runs Zod validation + transform on accumulated text (same as today)
- `data.error` → reject the promise

### Why Zod Validation Stays on FE

The Zod schemas (`TopicContentSchema`, `QuizQuestionsSchema`) validate the **final accumulated LLM output** after streaming completes. They are NOT used during streaming — `streamingParser.ts` handles partial/incomplete JSON progressively without Zod.

Keeping validation on FE (rather than sending a pre-validated `result` event from backend) is the right approach because:

1. **Simpler SSE contract** — Backend just relays normalized text chunks. No need to accumulate, parse, validate, and send a separate "final result" event.
2. **FE already does this** — `llmService.ts` calls `extractJSON()` → Zod `.parse()` → transform on the accumulated text after `onComplete`. This logic stays in the rewritten `llmService.ts`.
3. **Backend still validates the request** — The request body (mode, constraints, topic for quiz) is validated via Zod on the backend. The LLM response format is an internal concern — if the LLM returns garbage, the FE Zod parse will throw, and the error handler will surface it to the user.
4. **Backend can optionally validate too** — If we later want server-side validation (e.g., to store topics in DB), we add it then. For now, the backend's job is: build prompt → call LLM → relay stream.

### Streaming Data Flow (detailed)

```
Backend:                                    Frontend:

1. Receive POST request
2. Build prompt (prompts.ts)
3. Call LLM API with stream:true
4. Read upstream chunk
   ├─ Anthropic: content_block_delta
   └─ OpenAI: choices[0].delta.content
5. Normalize to {text: "..."}
6. Write SSE: data: {"text":"..."}    ──→   7. sseService receives chunk
                                            8. onMessage({text}) fires
                                            9. accumulatedText += text
                                           10. onProgress(accumulatedText)
                                           11. streamingParser.parseStreamingJson()
                                           12. useStreamingData updates partialData
                                           13. UI renders progressively

[stream ends]
14. Write SSE: data: [DONE]          ──→   15. onComplete fires
                                           16. extractJSON(accumulatedText)
                                           17. Zod .parse() validates
                                           18. Transform flat→nested
                                           19. resolve(finalResult)
                                           20. handleComplete(finalResult)
```

---

## 7. Implementation Order

### Phase 1: Backend LLM Module (no FE changes)

1. Add LLM env vars to `backend/src/modules/shared/config/env.ts`
2. Add LLM env vars to `backend/.env` and `backend/.env.example`
3. Create `backend/src/modules/llm/llm.schemas.ts` — Zod schemas for request validation
4. Move `src/constants/categories.ts` → `backend/src/modules/llm/categories.ts` (define types locally for backend)
5. Create `backend/src/modules/llm/prompts.ts` — prompt templates (copy + adapt from FE)
6. Create `backend/src/modules/llm/llm.provider.ts` — LLM API abstraction
7. Create `backend/src/modules/llm/llm.service.ts` — streaming relay orchestration
8. Create `backend/src/modules/llm/llm.controller.ts` — Fastify SSE response handling
9. Create `backend/src/modules/llm/llm.routes.ts` — route registration with `fastify.authenticate` pre-handler
10. Register routes in `backend/src/app.ts`
11. Test with curl (use a valid JWT):
    ```
    curl -N -X POST http://localhost:3000/llm/topic \
      -H 'Content-Type: application/json' \
      -H 'Authorization: Bearer <jwt>' \
      -d '{"mode":"surprise","alreadyDiscovered":[],"dismissed":[]}'
    ```

### Phase 2: Frontend Migration (switch to backend)

11. Add `backendUrl` to `app.config.js` extra
12. Rewrite `src/services/llmService.ts` to thin backend client (keep Zod schemas + extractJSON)
13. Simplify `src/services/sseService.ts` (remove provider-specific code)
14. Update FE to fetch category schema from `GET /llm/categories` instead of importing locally
15. Remove LLM env vars from `app.config.js`
16. Update root `package.json` scripts (remove proxy, update `web` script)
17. Delete `scripts/llm-proxy.mjs`
18. Delete `src/utils/prompts.ts`
19. Delete `src/constants/categories.ts`
20. Test all three flows: Surprise Me, Guide Me, Quiz

### Phase 3: Cleanup

21. Remove unused FE dependencies (if any were only used for LLM — check `react-native-get-random-values` usage, `uuid` usage in llmService context)
22. Remove proxy-related VS Code tasks from `.vscode/tasks.json` (if applicable)
23. Update `docs/STREAMING_ARCHITECTURE.md` to reflect new architecture
24. Update `backend/DEPLOYMENT.md` with LLM env vars

---

## 8. Risk Mitigation

| Risk                                                                        | Mitigation                                                                                                                              |
| --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **CORS** — Backend must allow FE origins                                    | Already configured in `app.ts` via `@fastify/cors` with `ALLOWED_ORIGINS`. Add Expo dev URLs (e.g., `http://localhost:8081`).           |
| **SSE on mobile** — Native SSE streaming                                    | `sseService.ts` already uses `expo/fetch` which supports `ReadableStream`. Same approach works pointing to backend.                     |
| **Category schema fetch** — FE needs schema for Guide Me UI                 | Backend serves it via `GET /llm/categories`. FE caches aggressively (static data). Fetch on app load or lazily on first Guide Me entry. |
| **Backend downtime during migration** — FE breaks if backend is not running | Phase 1 is backend-only. Phase 2 switches FE. Keep old code on a branch until verified.                                                 |
| **Rate limiting** — Backend has global rate limit (100/15min)               | May need to adjust or add LLM-specific limits since LLM calls are expensive. Consider separate rate limit config for `/llm/*` routes.   |
| **Request abort / client disconnect** — User cancels mid-stream             | Handle Fastify request close event to abort upstream LLM fetch.                                                                         |
| **Topic ID generation** — Currently uses `uuid` in FE                       | Move to backend (generate ID server-side in `llm.service.ts`).                                                                          |

---

## 9. What Specifically Moves Where

### FE `llmService.ts` → Backend

| FE Code                                        | Backend Destination                                            |
| ---------------------------------------------- | -------------------------------------------------------------- |
| `LLMConfig`, `LLMMessage`, `LLMProvider` types | `llm.provider.ts`                                              |
| `TopicContentSchema`                           | `llm.schemas.ts` (stays in FE too — FE validates final output) |
| `QuizQuestionsSchema`                          | `llm.schemas.ts` (stays in FE too — FE validates final output) |
| `extractJSON()`                                | Stays in FE `llmService.ts` (FE parses accumulated text)       |
| `extractTextContent()`                         | `llm.provider.ts` (for non-streaming fallback)                 |
| `callLLM()`                                    | `llm.service.ts` (non-streaming path)                          |
| `callLLMStream()`                              | Backend streams relay; FE accumulates + validates              |
| `getProviderHeaders()`                         | `llm.provider.ts`                                              |
| `getRequestBody()`                             | `llm.provider.ts`                                              |
| `generateTopic()` flat→nested transform        | `llm.service.ts`                                               |
| `generateQuizQuestions()` flat→array transform | `llm.service.ts`                                               |

### FE `prompts.ts` → Backend

| FE Code                                   | Backend Destination                                          |
| ----------------------------------------- | ------------------------------------------------------------ |
| `TOPIC_TYPE_DEFINITIONS`                  | `prompts.ts`                                                 |
| `QUIZ_FOCUS_AREAS`                        | `prompts.ts`                                                 |
| `QUIZ_QUESTION_GUIDANCE`                  | `prompts.ts`                                                 |
| `promptTemplates.generateTopic()`         | `prompts.ts`                                                 |
| `promptTemplates.generateQuizQuestions()` | `prompts.ts`                                                 |
| `logPrompt()`                             | `prompts.ts` (use Fastify logger instead of `console.group`) |

### FE `sseService.ts` → Stays in FE (simplified)

| Remove                                    | Keep                         |
| ----------------------------------------- | ---------------------------- |
| `extractStreamText()` (provider-specific) | `connect()` method           |
| `isStreamComplete()` (provider-specific)  | Fetch-based SSE reader       |
| Direct API auth header injection          | AbortController cancellation |
| `useProxy` parameter branching            | Buffer-based line parsing    |

---

## 10. Testing Strategy

### Backend unit tests

- `llm.provider.ts`: Mock `fetch`, verify correct headers/body for each provider
- `llm.service.ts`: Mock provider, verify prompt construction + Zod validation + transform
- `prompts.ts`: Snapshot tests for prompt output

### Backend integration tests

- Start Fastify, call `/llm/topic` with mock provider, verify SSE event stream format
- Verify error handling (invalid body, provider error, malformed LLM response)

### FE manual testing

- Surprise Me flow: generates topic with progressive rendering
- Guide Me flow: generates topic with constraints
- Quiz flow: generates quiz questions with progressive rendering
- Cancel mid-stream: verify cleanup
- Network error: verify error state

### FE automated testing

- Mock backend SSE responses in `llmService` tests
- Verify `useStreamingData` hook behavior unchanged
