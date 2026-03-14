# Persistence Layer Migration (Frontend → Backend)

**Status:** Ready to Implement
**Prerequisite:** Existing auth system (GitHub SSO, JWT, users + refresh_tokens tables)
**Outcome:** Topics, quizzes, and user progress data persist server-side. Frontend becomes a thin read cache hydrated from backend APIs. No new user-facing features — the app behaves identically from the user's perspective.

---

## 1. Why This Phase Exists

Today all topic and quiz data lives in Zustand, persisted to `localStorage` (web) and `AsyncStorage` (mobile). This means:

- Data is lost if the user clears storage or switches devices.
- Every "Surprise Me" / "Guide Me" request makes an LLM call, even if the same topic was generated for another user (or the same user previously dismissed and re-encountered it).
- Topics are isolated per user — there's no shared content pool to amortize LLM costs.
- The frontend owns entity identity (`uuid` generation), validation, and statistics computation — all of which belong server-side.

This phase moves persistence to Postgres (Neon) behind new Fastify modules, without changing any prompts, UI components, or discovery flows. The LLM module continues to generate topics the same way — the only difference is that generated content is persisted and the frontend fetches it from CRUD APIs instead of constructing entities locally.

---

## 2. Current Architecture (What Changes)

### 2.1 Data Flow Today

```
SurpriseMeFlow / GuideMeFlow
  → llmService.generateTopic() — SSE stream to POST /llm/topic
  → Frontend Zod validates flat response
  → Frontend constructs Topic object (uuid, nested content, status, timestamps)
  → useAppStore.addTopic() — Zustand state
  → Persisted to localStorage / AsyncStorage via subscription

quiz.tsx
  → llmService.generateQuizQuestions() — SSE stream to POST /llm/quiz
  → Frontend constructs Quiz object (uuid, score, passed, attemptNumber)
  → useAppStore.addQuiz() — Zustand state
  → If passed: useAppStore.updateTopicStatus('learned')
```

### 2.2 What Moves to Backend

| Concern                                     | Current Location                        | New Location                                      |
| ------------------------------------------- | --------------------------------------- | ------------------------------------------------- |
| Topic entity creation (ID, timestamps)      | `llmService.ts` (frontend)              | `topic.service.ts` (backend)                      |
| Topic storage                               | Zustand + localStorage/AsyncStorage     | `topics` + `user_topics` tables                   |
| Quiz entity creation (ID, score, pass/fail) | `quiz.tsx` + `useAppStore` (frontend)   | `quiz.service.ts` (backend)                       |
| Quiz storage                                | Zustand + localStorage/AsyncStorage     | `quizzes` + `quiz_topics` + `user_quizzes` tables |
| Statistics computation                      | `useAppStore.calculateStatistics()`     | `stats.service.ts` or user routes (backend)       |
| Milestone checking                          | `useAppStore.checkMilestones()`         | `stats.service.ts` (backend)                      |
| Topic deduplication                         | `addTopic()` checks by id/name in array | `UNIQUE` constraint on `topics.name`              |
| Dismissed topics tracking                   | `dismissedTopics: string[]` in Zustand  | `user_topics` table (`status: 'dismissed'`)       |

### 2.3 What Stays in Frontend

| Concern                                        | File(s)                                                      | Change                                            |
| ---------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------- |
| SSE streaming + progressive rendering          | `sseService.ts`, `useStreamingData.ts`, `streamingParser.ts` | No change — still consumes SSE from backend       |
| Streaming UI components                        | `TopicCard.tsx`                                              | No change                                         |
| Topic/quiz Zod validation (accumulated stream) | `llmService.ts` schemas                                      | Moves to new `topicService.ts` / `quizService.ts` |
| Discovery flow components                      | `SurpriseMeFlow.tsx`, `GuideMeFlow.tsx`                      | Call new services instead of `llmService`         |
| Action buttons (Dismiss/Bucket/Acquire)        | `ActionButtons.tsx`                                          | Call new services instead of store directly       |
| Category schema fetch                          | `categorySchemaService.ts`                                   | No change                                         |
| Auth service                                   | `authService.ts`                                             | No change                                         |

---

## 3. Database Schema

All tables in `backend/src/modules/shared/database/schema.ts`. The existing `users` table is extended and new tables are added alongside `refreshTokens`.

### 3.1 `users` — No Schema Changes in Phase 1

The existing `users` table (`id`, `githubId`, `email`, `username`, `displayName`, `avatarUrl`, `createdAt`, `updatedAt`) is sufficient for Phase 1. Profile extensions (bio, preferences, lastActiveAt) are deferred to a future phase.

### 3.2 `topics` — Shared Content Pool

```typescript
export const topics = pgTable(
  "topics",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 255 }).unique().notNull(),
    topicType: varchar("topic_type", { length: 50 }).notNull(),
    category: varchar("category", { length: 255 }).notNull(),
    subcategory: varchar("subcategory", { length: 255 }).notNull(),
    contentWhat: text("content_what").notNull(),
    contentWhy: text("content_why").notNull(),
    contentPros: jsonb("content_pros").notNull(), // string[]
    contentCons: jsonb("content_cons").notNull(), // string[]
    contentCompareToSimilar: jsonb("content_compare_to_similar").notNull(), // {topic,comparison}[]
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    nameIdx: index("idx_topics_name").on(table.name),
    categoryIdx: index("idx_topics_category").on(table.category),
  }),
);
```

**Key decisions:**

- `contentCompareToSimilar` is kept as-is in this phase (same shape as today). Phase 2 replaces it with the relationship table.
- `name` is `UNIQUE` — this is the global dedup key. If two users discover "Event Sourcing," they share the same `topics` row.
- Content fields (`contentWhat`, `contentWhy`, etc.) are stored as columns, not a single JSONB blob, so individual sections are queryable if needed.
- `contentPros`, `contentCons`, `contentCompareToSimilar` are JSONB because they're arrays that are always read/written whole.

### 3.3 `user_topics` — Per-User Topic State

```typescript
export const userTopics = pgTable(
  "user_topics",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    topicId: uuid("topic_id")
      .notNull()
      .references(() => topics.id, { onDelete: "cascade" }),
    status: varchar("status", { length: 20 }).notNull().default("discovered"),
    discoveryMethod: varchar("discovery_method", { length: 20 }).notNull(),
    discoveredAt: timestamp("discovered_at").notNull(),
    learnedAt: timestamp("learned_at"),
  },
  (table) => ({
    userTopicUnique: uniqueIndex("idx_user_topics_unique").on(
      table.userId,
      table.topicId,
    ),
    userIdIdx: index("idx_user_topics_user_id").on(table.userId),
    topicIdIdx: index("idx_user_topics_topic_id").on(table.topicId),
  }),
);
```

**Key decisions:**

- `status` is `'discovered' | 'learned' | 'dismissed'`. All topic-user relationships live in this single table — there is no separate dismissed table.
- When a topic is generated and the user taps **Dismiss**, the topic is persisted to the `topics` table and a `user_topics` row is created with `status: 'dismissed'`.
- When the user taps **Add to Bucket**, status is `'discovered'`. When the user passes a quiz, status is updated to `'learned'`.
- Users can toggle between `'dismissed'` ↔ `'discovered'` from the Topics page.
- By default (no filters applied), the Topics list shows **all** statuses: `discovered` + `learned` + `dismissed`.
- Dismissed topic cards are visually muted — they cannot be viewed or quizzed, but can be deleted (swipe-left) or restored (long-press).
- `discoveryMethod` is `'surprise' | 'guided'`.
- The unique constraint on `(user_id, topic_id)` prevents duplicate associations.

### 3.4 Quiz Tables

Quizzes use a normalized many-to-many model:

- **A quiz can be taken by one or many users** — quiz content (questions) is shared; each user's attempt is tracked in `user_quizzes`.
- **A quiz can belong to one or many topics** — supports future cross-topic quizzes. Linked via `quiz_topics`.
- **A topic can have one or more quizzes** — when a user requests a quiz, the backend first serves an existing quiz the user hasn't attempted. If all available quizzes have been attempted, a new one is generated via LLM. This prevents memorization while minimizing LLM costs.

#### `quizzes` — Shared Quiz Content

```typescript
export const quizzes = pgTable("quizzes", {
  id: uuid("id").defaultRandom().primaryKey(),
  questions: jsonb("questions").notNull(), // QuizQuestion[]
  createdAt: timestamp("created_at").defaultNow(),
});
```

#### `quiz_topics` — Quiz-to-Topic Association

```typescript
export const quizTopics = pgTable(
  "quiz_topics",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    quizId: uuid("quiz_id")
      .notNull()
      .references(() => quizzes.id, { onDelete: "cascade" }),
    topicId: uuid("topic_id")
      .notNull()
      .references(() => topics.id, { onDelete: "cascade" }),
  },
  (table) => ({
    quizTopicUnique: uniqueIndex("idx_quiz_topics_unique").on(
      table.quizId,
      table.topicId,
    ),
    quizIdIdx: index("idx_quiz_topics_quiz_id").on(table.quizId),
    topicIdIdx: index("idx_quiz_topics_topic_id").on(table.topicId),
  }),
);
```

#### `user_quizzes` — Per-User Quiz Attempts

```typescript
export const userQuizzes = pgTable(
  "user_quizzes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    quizId: uuid("quiz_id")
      .notNull()
      .references(() => quizzes.id, { onDelete: "cascade" }),
    score: integer("score").notNull(),
    passed: boolean("passed").notNull(),
    attemptedAt: timestamp("attempted_at").notNull(),
    completedAt: timestamp("completed_at").notNull(),
  },
  (table) => ({
    userIdIdx: index("idx_user_quizzes_user_id").on(table.userId),
    quizIdIdx: index("idx_user_quizzes_quiz_id").on(table.quizId),
  }),
);
```

**Key decisions:**

- `questions` is JSONB in the shared `quizzes` table (same `QuizQuestion[]` shape as today). Questions are always read/written as a batch.
- Per-user data (score, passed) lives in `user_quizzes`, not in `quizzes`.
- `attemptNumber` is **NOT stored** — it is a derived value computed on read via `ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY attempted_at)` scoped to the topic (via `quiz_topics` join). When building API responses, the backend computes it as `COUNT(*) + 1` of existing `user_quizzes` rows for the same user+topic. This avoids denormalization while still including the value in responses.
- When a user requests a quiz for a topic, the backend first checks for existing quizzes linked to that topic (via `quiz_topics`) that the user has NOT yet attempted (no matching `user_quizzes` row). If an unattempted quiz exists, it is served from DB via SSE (simulated typewriter). Otherwise, a new quiz is generated via LLM. This prevents memorization while minimizing LLM costs.

### 3.5 Migration

Generate via Drizzle Kit: `npx drizzle-kit generate` → produces a new SQL migration file in `backend/src/modules/shared/database/migrations/`. Run via existing `scripts/migrate.ts`.

---

## 4. Backend Modules

### 4.1 `topic` Module

```
backend/src/modules/topic/
  topic.routes.ts
  topic.controller.ts
  topic.service.ts
  topic.repository.ts
  topic.schemas.ts
```

Register in `app.ts`: `await app.register(topicRoutes, { prefix: '/topics' });`

#### Routes

```
POST   /topics                    → Discover a topic (SSE stream — always streams, whether from LLM or DB)
GET    /topics                    → List user's topics (discovered/learned/dismissed)
GET    /topics/:id                → Get full topic detail
PATCH  /topics/:id                → Update user-topic status (discovered ↔ dismissed, persist after stream)
DELETE /topics/:id                → Remove topic from user's collection
```

All routes require auth (`onRequest: [fastify.authenticate]`).

#### `topic.schemas.ts`

```typescript
// POST /topics
export const DiscoverTopicRequestSchema = z
  .object({
    mode: z.enum(["surprise", "guided"]),
    constraints: z
      .object({
        category: z.string().min(1),
        subcategory: z.string().min(1),
        topicType: TopicTypeSchema,
        learningGoal: z.string().min(1),
      })
      .optional(),
  })
  .refine(
    (v) => v.mode !== "guided" || !!v.constraints,
    "constraints required for guided mode",
  );

// GET /topics query params
export const ListTopicsQuerySchema = z.object({
  status: z.enum(["discovered", "learned", "dismissed", "all"]).default("all"),
  category: z.string().optional(),
  subcategory: z.string().optional(),
  topicType: TopicTypeSchema.optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

// Response shape for a topic (what the frontend receives)
export const TopicResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  topicType: TopicTypeSchema,
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
  // Per-user fields (from user_topics join)
  status: z.enum(["discovered", "learned", "dismissed"]),
  discoveryMethod: z.enum(["surprise", "guided"]),
  discoveredAt: z.string(),
  learnedAt: z.string().nullable(),
});
```

#### `topic.repository.ts`

```typescript
class TopicRepository {
  // Global topic operations
  findById(id: string): Promise<Topic | undefined>;
  findByName(name: string): Promise<Topic | undefined>;
  create(data: NewTopic): Promise<Topic>;

  // Per-user operations
  findUserTopic(
    userId: string,
    topicId: string,
  ): Promise<UserTopic | undefined>;
  findUserTopics(
    userId: string,
    filters: ListTopicsQuery,
  ): Promise<{ topics: TopicWithUserState[]; total: number }>;
  createUserTopic(data: NewUserTopic): Promise<UserTopic>;
  updateUserTopicStatus(
    userId: string,
    topicId: string,
    status: string,
    learnedAt?: Date,
  ): Promise<void>;
  deleteUserTopic(userId: string, topicId: string): Promise<void>;

  // For LLM context (both used to exclude from future suggestions)
  getDiscoveredTopicNames(userId: string): Promise<string[]>;
  getDismissedTopicNames(userId: string): Promise<string[]>;
}
```

#### `topic.service.ts`

```typescript
class TopicService {
  /**
   * Main discovery flow. Called by POST /topics.
   *
   * 1. Fetch user's already-discovered + dismissed topic names from DB
   * 2. Determine content source (DB-first cache strategy):
   *    a. Query the `topics` table for topics the user has NOT yet discovered or dismissed
   *    b. If an unserved topic exists: use it (skip LLM entirely)
   *    c. If no unserved topic exists: call LLM to generate a new one
   *       - If LLM generates a name matching an existing topic row: reuse that row's content
   *       - Otherwise: persist the new topic to the `topics` table
   * 3. Stream topic content to frontend via SSE (always — even from DB)
   * 4. After final content chunk, send a `data:` line with `{"type":"meta","topicId":"uuid","cached":bool}` before `[DONE]`
   * 5. Frontend calls PATCH /topics/:id with user's chosen action + discoveryMethod
   *
   * Note: abandoned topics (user navigates away before choosing an action) remain
   * in the `topics` table with no `user_topics` row. They are eligible for re-serving
   * to other users (or the same user) via the DB-first cache.
   */
  async discoverTopic(
    userId: string,
    request: DiscoverTopicRequest,
    callbacks: StreamCallbacks,
    signal?: AbortSignal,
  ): Promise<void>;

  async getTopics(
    userId: string,
    filters: ListTopicsQuery,
  ): Promise<{ topics: TopicResponse[]; total: number }>;

  async getTopicDetail(userId: string, topicId: string): Promise<TopicResponse>;

  /**
   * Update user-topic status (upsert). Creates user_topics row if needed.
   * - 'discovered': user tapped "Add to Bucket"
   * - 'dismissed': user tapped "Dismiss" (topic stays in DB, excluded from suggestions)
   * Users can toggle dismissed ↔ discovered from the Topics page.
   * 'learned' is set only by quiz.service when a quiz is passed.
   *
   * `discoveryMethod` is required when creating a new user_topics row (first interaction
   * after stream). It is ignored on subsequent status toggles (row already exists).
   */
  async updateTopicStatus(
    userId: string,
    topicId: string,
    status: "discovered" | "dismissed",
    discoveryMethod?: "surprise" | "guided",
  ): Promise<void>;

  async deleteUserTopic(userId: string, topicId: string): Promise<void>;
}
```

**Architecture: Unified SSE Streaming**

`POST /topics` **always returns an SSE stream**, whether the content is freshly generated by the LLM or served from the database. This keeps the frontend simple — one code path, one consumer, typewriter animation always works.

**DB-first cache strategy:**

Before calling the LLM, `topic.service` queries the `topics` table for topics the current user has NOT yet discovered, learned, or dismissed (i.e., no matching `user_topics` row). If an unserved topic exists, it is served directly from the DB — no LLM call is made. If no unserved topic exists, the LLM is called to generate a new one. Abandoned topics (user navigated away without choosing an action) remain in the `topics` table and are eligible for re-serving to any user.

**When the topic is freshly generated (LLM path):**

1. `topic.controller` opens an SSE response.
2. `topic.service.discoverTopic()` calls `llm.service.generateTopicStream()`.
3. Chunks are forwarded to the SSE response as they arrive from the LLM.
4. On stream completion: the accumulated content is parsed, validated, and persisted to the `topics` table (or matched to an existing row by name).
5. A final `data:` line is sent: `{"type":"meta","topicId":"uuid","cached":false}`, followed by `data: [DONE]`.

**When the topic already exists in DB (cache path):**

1. `topic.controller` opens an SSE response.
2. `topic.service` reads the topic from DB and converts it to the flat streaming format.
3. Fields are sent as SSE chunks with small delays (simulating progressive rendering for the typewriter effect).
4. A final `data:` line is sent: `{"type":"meta","topicId":"uuid","cached":true}`, followed by `data: [DONE]`.

**After the stream completes**, the frontend displays action buttons. The user's choice triggers:

- **Add to Bucket** → `PATCH /topics/:id` with `{ status: 'discovered', discoveryMethod: 'surprise' }` → creates `user_topics` row.
- **Dismiss** → `PATCH /topics/:id` with `{ status: 'dismissed', discoveryMethod: 'surprise' }` → creates `user_topics` row with dismissed status.
- **Acquire Now** → `PATCH /topics/:id` with `{ status: 'discovered', discoveryMethod: 'surprise' }`, then navigate to quiz.

The topic is always persisted in the global `topics` table during the stream (step 4 in the LLM path, or already exists in DB path). The `PATCH` only creates/updates the **user-topic association**. If the user abandons (closes or navigates away), the topic exists in the DB for future cache hits but has no user association.

#### `topic.controller.ts`

```typescript
class TopicController {
  // SSE endpoint — always streams (LLM generation or DB cache simulation)
  async discoverTopic(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void>;

  // JSON endpoints
  async listTopics(request: FastifyRequest, reply: FastifyReply): Promise<void>;
  async getTopicDetail(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void>;
  async updateTopicStatus(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void>;
  async deleteUserTopic(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void>;
}
```

### 4.2 `quiz` Module

```
backend/src/modules/quiz/
  quiz.routes.ts
  quiz.controller.ts
  quiz.service.ts
  quiz.repository.ts
  quiz.schemas.ts
```

Register in `app.ts`: `await app.register(quizRoutes, { prefix: '/quizzes' });`

#### Routes

```
POST   /quizzes                   → Generate or serve a quiz (SSE stream — from DB cache or LLM)
GET    /quizzes                   → List user's quiz attempts
GET    /quizzes/:id               → Get quiz detail with user's attempt
POST   /quizzes/:id/attempts      → Submit quiz attempt (persist score + update topic status)
```

All routes require auth (`onRequest: [fastify.authenticate]`).

#### `quiz.repository.ts`

```typescript
class QuizRepository {
  // Quiz operations
  create(data: NewQuiz): Promise<Quiz>;
  findById(id: string): Promise<Quiz | undefined>;

  // Quiz-topic associations
  createQuizTopics(quizId: string, topicIds: string[]): Promise<void>;
  getTopicsForQuiz(quizId: string): Promise<Topic[]>;

  // User quiz attempts
  createUserQuiz(data: NewUserQuiz): Promise<UserQuiz>;
  getUserQuizzes(
    userId: string,
    topicId?: string,
  ): Promise<UserQuizWithDetails[]>;
  countUserAttemptsForTopic(userId: string, topicId: string): Promise<number>;

  // Find a quiz linked to this topic that the user hasn't attempted yet
  findUnattemptedQuizForTopic(
    userId: string,
    topicId: string,
  ): Promise<Quiz | undefined>;
}
```

#### `quiz.service.ts`

```typescript
class QuizService {
  /**
   * Generate or serve a quiz for a topic. Responds via SSE stream.
   *
   * 1. Check DB for an existing quiz linked to this topic that the user hasn't attempted
   * 2. If found (cache path):
   *    a. Convert quiz questions to flat streaming format
   *    b. Send chunks via SSE with small delays (typewriter animation)
   *    c. Send final `data:` line with `{"type":"meta","quizId":"uuid","cached":true}` before `[DONE]`
   * 3. If not found (LLM path):
   *    a. Call `llm.service.generateQuizStream()`
   *    b. Forward chunks as they arrive from the LLM
   *    c. On completion: persist quiz to `quizzes` table + create `quiz_topics` association
   *    d. Send final `data:` line with `{"type":"meta","quizId":"uuid","cached":false}` before `[DONE]`
   */
  async generateQuiz(
    userId: string,
    topicId: string,
    callbacks: StreamCallbacks,
    signal?: AbortSignal,
  ): Promise<void>;

  /**
   * Submit completed quiz attempt.
   * 1. Calculate score from user answers vs correct answers
   * 2. Determine pass/fail (≥80%)
   * 3. Persist `user_quizzes` row (attemptNumber is NOT stored — computed on read)
   * 4. If passed: update `user_topics.status` → 'learned', set `learnedAt`
   * 5. Compute attemptNumber for the response: COUNT of user_quizzes for this user+topic
   * 6. Return quiz result with computed attemptNumber
   */
  async submitQuizAttempt(
    userId: string,
    quizId: string,
    answers: SubmitQuizRequest,
  ): Promise<QuizResult>;

  async getQuizHistory(
    userId: string,
    topicId?: string,
  ): Promise<UserQuizWithDetails[]>;
}
```

### 4.3 Stats Computation (under `user` Module)

Stats are computed on-demand from `user_topics` and `user_quizzes` tables. Add a stats service and route within the existing `user` module:

```
backend/src/modules/user/
  ... (existing files)
  user.stats.service.ts    ← NEW
```

Add route to existing `user.routes.ts`:

```
GET /users/me/stats         → { statistics: ProfileStatistics, milestones: Milestone[] }
```

```typescript
// user.stats.service.ts — computes from DB, no caching
class UserStatsService {
  async getUserStats(userId: string): Promise<ProfileStatistics> {
    // Simple counts only in Phase 1:
    // breadthExpansion: COUNT from user_topics grouped by status (excludes dismissed)
    // discoveryStats: COUNT grouped by discovery_method + COUNT of dismissed
    // quizPerformance: AVG/COUNT from user_quizzes table
    // categoryBreakdown: COUNT from user_topics JOIN topics grouped by category
    //
    // Deferred to future phase:
    // growthMetrics (this week, this month counts)
    // activity streaks
  }

  async getMilestones(userId: string): Promise<Milestone[]> {
    // Same milestone definitions as current frontend
    // Check thresholds against DB counts
  }
}
```

### 4.4 LLM Module Changes

The existing `llm` module becomes an internal utility — `llm.service.ts` is no longer exposed via its own routes. `topic.service` and `quiz.service` call it directly.

- `GET /llm/categories` — **Kept as-is.** Frontend still fetches category schema for Guide Me flow. This is the only remaining public LLM route.
- `POST /llm/topic` — **Removed.** Replaced by `POST /topics` which calls `llm.service.generateTopicStream()` internally.
- `POST /llm/quiz` — **Removed.** Replaced by `POST /quizzes` which calls `llm.service.generateQuizStream()` internally.

`llm.service.ts` retains its streaming logic (prompt → LLM provider → parse SSE → relay chunks) but is only called by `topic.service` and `quiz.service`. Its method signatures change: `generateTopicStream()` receives `alreadyDiscovered` and `dismissed` topic name lists from the calling service (which fetches them from the DB), rather than from the frontend request. It also gains a helper to convert DB topic data into simulated SSE chunks for the cache path.

---

## 5. Frontend Changes

### 5.1 New Services

#### `src/services/topicService.ts`

Replaces topic-related parts of `llmService.ts`:

```typescript
class TopicService {
  /**
   * Discover a topic via SSE streaming.
   * Calls POST /topics — always returns SSE (whether LLM-generated or DB-cached).
   * Accumulates the flat SSE output, converts flat→nested Topic object (the same
   * conversion currently done in llmService.ts), and extracts topicId from the
   * final `data:` meta line.
   */
  async discoverTopic(
    mode: "surprise" | "guided",
    constraints?: TopicConstraints,
    onProgress?: (partialText: string) => void,
  ): Promise<{ topic: Topic; topicId: string }>;

  /**
   * Update user-topic status.
   * Calls PATCH /topics/:id — upserts user_topics row.
   * Called when user taps "Add to Bucket" (discovered), "Dismiss" (dismissed),
   * or toggles status from the Topics page.
   *
   * `discoveryMethod` is required on first interaction after stream (creates the
   * user_topics row). It is optional on subsequent status toggles.
   */
  async updateTopicStatus(
    topicId: string,
    status: "discovered" | "dismissed",
    discoveryMethod?: "surprise" | "guided",
  ): Promise<void>;

  /**
   * Fetch user's topics from backend.
   * Calls GET /topics. Called on app launch to hydrate the store.
   */
  async getTopics(
    filters?: TopicFilters,
  ): Promise<{ topics: Topic[]; total: number }>;

  /**
   * Fetch a single topic detail.
   * Calls GET /topics/:id.
   */
  async getTopicDetail(topicId: string): Promise<Topic>;

  /**
   * Remove a topic from user's collection.
   * Calls DELETE /topics/:id.
   */
  async deleteTopic(topicId: string): Promise<void>;
}
```

#### `src/services/quizService.ts`

Replaces quiz-related parts of `llmService.ts`:

```typescript
class QuizService {
  /**
   * Generate or serve a quiz via SSE streaming.
   * Calls POST /quizzes — serves existing unattempted quiz from DB or generates new via LLM.
   * Returns quiz questions + quizId from the final `meta` event.
   */
  async generateQuiz(
    topicId: string,
    onProgress?: (partialText: string) => void,
  ): Promise<{ questions: QuizQuestion[]; quizId: string }>;

  /**
   * Submit quiz attempt.
   * Calls POST /quizzes/:id/attempts — backend calculates score, pass/fail,
   * persists user_quizzes row, updates topic status if passed.
   */
  async submitQuizAttempt(
    quizId: string,
    userAnswers: number[],
  ): Promise<QuizResult>;

  /**
   * Fetch quiz history for a topic.
   * Calls GET /quizzes with optional topicId filter.
   */
  async getQuizHistory(topicId?: string): Promise<UserQuizWithDetails[]>;
}
```

#### `src/services/statsService.ts`

```typescript
class StatsService {
  /**
   * Fetch user stats and milestones.
   * Calls GET /users/me/stats — computed on-demand from DB.
   */
  async getStats(): Promise<{
    statistics: ProfileStatistics;
    milestones: Milestone[];
  }>;
}
```

### 5.2 `llmService.ts` — Deprecation

After `topicService.ts` and `quizService.ts` are created:

- `llmService.generateTopic()` → replaced by `topicService.discoverTopic()`
- `llmService.generateQuizQuestions()` → replaced by `quizService.generateQuiz()`
- `llmService.ts` can be deleted once all consumers migrate.

### 5.3 Zustand Store Refactor (`useAppStore.ts`)

**The Zustand store becomes purely in-memory.** No data is persisted to `localStorage` or `AsyncStorage`. When the app closes, all local state (topics, quizzes, profile) is lost. On every app launch, after auth succeeds, the store is hydrated fresh from backend APIs. The backend is the sole source of truth.

#### Remove

- `calculateStatistics()` — stats come from `GET /users/me/stats`
- `checkMilestones()` — milestones come from `GET /users/me/stats`
- `quizzes: Quiz[]` — quiz data is server-side only; no local cache needed
- `currentQuiz: Quiz | null` — quiz flow is managed by `quizService` round-trips
- `dismissedTopics: string[]` — replaced by `user_topics.status = 'dismissed'` in DB
- `dismissTopic()` — replaced by `topicService.updateTopicStatus(id, 'dismissed')`
- `addQuiz()`, `updateTopicStatus()` — quiz submission now goes through `quizService.submitQuizAttempt()` which handles status updates server-side
- Persistence layer (`hydrateState()`, `useAppStore.subscribe(...)`, `localStorage`/`AsyncStorage` writes for topics/quizzes/profile)
- `STORAGE_KEY` constant, `selectPersisted()` function, `PersistedSlice` type

#### Keep

- `topics: Topic[]` — in-memory cache, hydrated from `GET /topics` on app launch (includes discovered, learned, and dismissed topics)
- `profile: Profile` — in-memory cache, hydrated from `GET /users/me` and `GET /users/me/stats`
- `isLoading`, `error` — local UI state
- All auth state — no change

#### Add

```typescript
// Hydrate store from backend on app launch (called after auth is confirmed)
fetchProfile: () => Promise<void>
fetchTopics: (filters?: TopicFilters) => Promise<void>
fetchStats: () => Promise<void>

// Mutate local cache after server calls succeed
updateTopicStatusInCache: (topicId: string, status: 'discovered' | 'learned' | 'dismissed') => void
setProfile: (profile: Profile) => void
```

**Pattern:** All mutations go through backend APIs first, then **re-hydrate via `fetchTopics()`** to ensure the local cache reflects the server state. The store is a read cache, not the source of truth. Individual cache mutation helpers like `updateTopicStatusInCache` are provided for optimistic updates where re-fetching would be too slow, but `fetchTopics()` is the canonical way to sync.

#### Hydration on App Launch

In the auth flow (after `checkSession()` succeeds and user is authenticated), eagerly kick off parallel fetches:

```typescript
await Promise.all([
  get().fetchProfile(),
  get().fetchTopics(),
  get().fetchStats(),
]);
```

Each screen shows its own loading spinner until the data it depends on has arrived. This avoids a single blocking splash screen and lets individual screens become interactive as their data resolves.

### 5.4 Component Changes

#### `SurpriseMeFlow.tsx`

```diff
- import llmService from '../../services/llmService';
+ import topicService from '../../services/topicService';

// In generateSurpriseTopic:
- const alreadyDiscovered = topics.map(t => t.name);
- const newTopic = await llmService.generateTopic('surprise', alreadyDiscovered, dismissedTopics, undefined, onProgress);
+ const { topic, topicId } = await topicService.discoverTopic('surprise', undefined, onProgress);

// In handleAddToBucket:
- addTopic(topic);
+ await topicService.updateTopicStatus(topicId, 'discovered', 'surprise');
+ await fetchTopics(); // re-hydrate local cache

// In handleDismiss:
- dismissTopic(topic.name);
+ await topicService.updateTopicStatus(topicId, 'dismissed', 'surprise');

// In handleAcquireNow:
- addTopic(topic);
- router.replace({ pathname: '/quiz', params: { topicId: topic.id } });
+ await topicService.updateTopicStatus(topicId, 'discovered', 'surprise');
+ router.replace({ pathname: '/quiz', params: { topicId } });
```

#### `GuideMeFlow.tsx`

Same pattern as `SurpriseMeFlow.tsx` — replace `llmService` calls with `topicService`, using `discoveryMethod: 'guided'`.

**Bug fix:** The current `GuideMeFlow` passes an empty `[]` for dismissed topics to `llmService.generateTopic()` (line 209 in the current code). This migration inherently fixes this bug — the backend fetches dismissed topics from the DB, so the frontend no longer needs to supply them.

#### `quiz.tsx`

```diff
- import llmService from '@/services/llmService';
+ import quizService from '@/services/quizService';

// Quiz generation:
- const generatedQuestions = await llmService.generateQuizQuestions(topic, onProgress);
+ const { questions: generatedQuestions, quizId } = await quizService.generateQuiz(topicId, onProgress);

// Quiz submission (currently inline in handleQuizComplete):
- const quiz: Quiz = { id: uuidv4(), topicId, topicName, questions, score, passed, ... };
- addQuiz(quiz);
+ const result = await quizService.submitQuizAttempt(quizId, userAnswers);
+ if (result.topicStatusUpdated) {
+   updateTopicStatusInCache(topicId, 'learned');
+ }
```

#### `TopicsScreen.tsx`

- Replace `topics` from store with hydrated data (already in store after `fetchTopics()`).
- Default view (no filters applied) shows `discovered` + `learned` + `dismissed` topics.
- After any status toggle, call `fetchTopics()` to re-hydrate the local cache.
- `deleteTopic()` calls `topicService.deleteTopic()` then `fetchTopics()`.

##### Server-Side Search & Filtering

All filtering is handled server-side. The frontend sends all 5 filter dimensions as query params to `GET /topics`:

- `search` — free-text search (matches topic name, category, subcategory)
- `status` — `discovered | learned | dismissed | all` (default: `all`)
- `topicType` — optional enum filter
- `category` — optional string filter
- `subcategory` — optional string filter
- `page` / `limit` — pagination

**Debounce:** Text search input uses a **300ms debounce** — only fires `fetchTopics()` after the user stops typing for 300ms. Chip/filter changes (status, type, category) fire `fetchTopics()` **immediately** (no debounce).

**Pagination:** Each filter change resets `page` to 1 and calls `fetchTopics()` with the full filter state. Infinite scroll: when the user scrolls near the bottom, increment `page` and **append** results to the existing list.

**Loading states:** Inline spinner at list bottom for pagination appends. Skeleton/spinner overlay for filter changes (new result set).

The client-side `useMemo` filtering is removed — the server returns pre-filtered, pre-paginated results.

##### Card Interactions by Status

| Gesture         | Discovered                       | Learned                          | Dismissed                               |
| --------------- | -------------------------------- | -------------------------------- | --------------------------------------- |
| **Tap**         | Navigate to detail               | Navigate to detail               | Disabled (no action)                    |
| **Swipe-right** | Start quiz + haptic              | Disabled (no action)             | Disabled (no action)                    |
| **Swipe-left**  | Delete + confirm dialog + haptic | Delete + confirm dialog + haptic | Delete + confirm dialog + haptic        |
| **Long-press**  | Dismiss + haptic + toast         | No action                        | Restore to bucket list + haptic + toast |

**Dismiss flow (long-press on discovered card):**

1. Haptic feedback (`impactMedium`)
2. Call `topicService.updateTopicStatus(id, 'dismissed')` (no `discoveryMethod` — row already exists)
3. Show toast: `"[Topic Name]" dismissed` with **Undo** button
4. Call `fetchTopics()` to re-hydrate

**Restore flow (long-press on dismissed card):**

1. Haptic feedback (`impactMedium`)
2. Call `topicService.updateTopicStatus(id, 'discovered')` (no `discoveryMethod` — row already exists)
3. Show toast: `"[Topic Name]" restored to bucket list` with **Undo** button
4. Call `fetchTopics()` to re-hydrate

**Toast/snackbar specs:**

- Bottom-anchored (above tab bar)
- Auto-dismiss after ~4 seconds
- One toast at a time (new toast replaces previous)
- Undo button reverts to previous status (calls `updateTopicStatus` with the prior status + `fetchTopics()`)

**Visual treatment of dismissed cards:**

- Reduced opacity (~0.5)
- Muted/grey status badge
- Grey left border (instead of status-colored)
- No tap highlight animation

#### `topic-detail.tsx`

- Looks up topic from store cache (same as today).
- Could also call `topicService.getTopicDetail()` as fallback if not in cache.

#### Profile components

- Replace inline `profile.statistics` reads with data from `fetchStats()`.
- No structural changes to profile UI components.

### 5.5 Types (`src/types/index.ts`)

No changes to `Topic`, `Quiz`, `QuizQuestion`, `ProfileStatistics`, `Milestone`, or `Profile` interfaces. The shapes stay the same — only the source of truth moves from frontend to backend.

Add:

```typescript
export interface QuizResult {
  id: string; // quizzes.id — the quiz that was attempted
  topicId: string;
  topicName: string;
  questions: QuizQuestion[];
  score: number;
  passed: boolean;
  attemptNumber: number; // computed on read, not stored
  attemptedAt: string;
  completedAt: string;
  topicStatusUpdated: boolean; // true if topic was marked 'learned'
}
```

---

## 6. API Contracts

### 6.1 `POST /topics`

SSE endpoint — discover a topic. **Always returns `text/event-stream`**, whether the content is freshly generated by LLM or served from the database cache.

**Request:**

```json
{
  "mode": "surprise",
  "constraints": null
}
```

Or for guided mode:

```json
{
  "mode": "guided",
  "constraints": {
    "category": "Architecture Patterns & Styles",
    "subcategory": "Event-Driven Patterns",
    "topicType": "patterns",
    "learningGoal": "Understand event-driven design"
  }
}
```

**Response:** `text/event-stream` — SSE chunks in the same flat key-value format as today. The backend internally fetches the user's discovered + dismissed topic names from the DB (frontend no longer sends them).

Stream ends with a metadata line (regular `data:` format — no named SSE `event:` — so the existing `sseService.ts` processes it without modification):

```
data: {"type":"meta","topicId":"uuid","cached":false}
data: [DONE]
```

The `topicId` is the server-generated ID for the persisted `topics` row. `cached: true` indicates the content was served from the database (no LLM call). The frontend parses the `type: "meta"` line to extract `topicId`, then uses it in subsequent `PATCH /topics/:id` calls.

### 6.2 `GET /topics`

**Query params:** `status` (`discovered | learned | dismissed | all`), `category`, `subcategory`, `topicType`, `search`, `page`, `limit`

**Response:**

```json
{
  "topics": [
    {
      "id": "uuid",
      "name": "Event Sourcing",
      "topicType": "patterns",
      "category": "Architecture Patterns & Styles",
      "subcategory": "Event-Driven Patterns",
      "content": {
        "what": "...",
        "why": "...",
        "pros": ["..."],
        "cons": ["..."],
        "compareToSimilar": [{ "topic": "...", "comparison": "..." }]
      },
      "status": "discovered",
      "discoveryMethod": "surprise",
      "discoveredAt": "2026-03-12T...",
      "learnedAt": null
    }
  ],
  "total": 42,
  "page": 1,
  "limit": 50
}
```

Default `status` is `all` (returns discovered + learned + dismissed).

### 6.3 `GET /topics/:id`

**Response:** Single `TopicResponse` (same shape as list items).

### 6.4 `PATCH /topics/:id`

Update user-topic association. Creates `user_topics` row if it doesn't exist (upsert).

**Request:**

```json
{ "status": "discovered", "discoveryMethod": "surprise" }
```

Valid statuses: `discovered`, `dismissed`. (`learned` is set only by quiz submission internally.)
`discoveryMethod` (`surprise` | `guided`) is required when creating a new `user_topics` row (first interaction after stream). It is optional on subsequent status toggles (row already exists).

**Response:** `200 OK`

```json
{
  "id": "uuid",
  "topicId": "uuid",
  "status": "discovered",
  "discoveryMethod": "surprise",
  "discoveredAt": "2026-03-12T...",
  "learnedAt": null
}
```

**Use cases:**

- After `POST /topics` stream completes: user taps "Add to Bucket" → `{ status: 'discovered', discoveryMethod: 'surprise' }`
- After `POST /topics` stream completes: user taps "Dismiss" → `{ status: 'dismissed', discoveryMethod: 'surprise' }`
- From Topics page: user undoes a dismissal → `{ status: 'discovered' }` (no `discoveryMethod` — row already exists)
- From Topics page: user dismisses a discovered topic → `{ status: 'dismissed' }` (no `discoveryMethod` — row already exists)

### 6.5 `DELETE /topics/:id`

Removes `user_topics` row. Does NOT delete the global `topics` row. Also cascades to delete any `user_quizzes` rows for quizzes linked to this topic (via `quiz_topics`), since the user's quiz attempts are meaningless without the topic association.

**Response:** `204 No Content`

### 6.6 `POST /quizzes`

SSE endpoint — generate or serve a quiz. **Always returns `text/event-stream`.** Serves an existing unattempted quiz from DB if one exists for the topic and the user hasn't attempted it. Otherwise, generates new questions via LLM.

**Request:**

```json
{
  "topicId": "uuid"
}
```

**Response:** `text/event-stream` — SSE chunks with quiz questions in the same format as today. Backend fetches topic content from DB using `topicId` to build the prompt.

Stream ends with a metadata line (same format as `POST /topics`):

```
data: {"type":"meta","quizId":"uuid","cached":false}
data: [DONE]
```

The `quizId` is the server-generated ID for the persisted `quizzes` row (questions are persisted on stream completion). The frontend parses the `type: "meta"` line to extract `quizId`, then uses it in the subsequent `POST /quizzes/:id/attempts` submission.

### 6.7 `POST /quizzes/:id/attempts`

Submit a quiz attempt. Persists `user_quizzes` row. Updates `user_topics.status` to `learned` if score ≥80%.

**Request:**

```json
{
  "userAnswers": [0, 2, 1, 3]
}
```

(4 answers for 4 questions — each value is the 0-based index of the selected option.)

**Response:** `201 Created`

```json
{
  "id": "uuid",
  "topicId": "uuid",
  "topicName": "Event Sourcing",
  "questions": [],
  "score": 75,
  "passed": false,
  "attemptNumber": 2,
  "attemptedAt": "...",
  "completedAt": "...",
  "topicStatusUpdated": false
}
```

`id` is the `quizzes.id` (the quiz that was attempted). `attemptNumber` is computed on read (not stored). `topicStatusUpdated` is `true` when the topic status was changed to `learned` as a result of passing.

### 6.8 `GET /quizzes`

**Query params:** `topicId` (optional)

**Response:**

```json
{
  "quizzes": [ UserQuizWithDetails, ... ]
}
```

### 6.9 `GET /users/me/stats`

**Response:**

```json
{
  "statistics": { "...ProfileStatistics" },
  "milestones": [ "...Milestone" ]
}
```

---

## 7. Implementation Order

### Step 1: Database Schema + Migration

- Add `topics`, `user_topics`, `quizzes`, `quiz_topics`, `user_quizzes` tables to `schema.ts`
- No changes to existing `users` table (profile extensions deferred)
- Generate and run migration
- Verify with local Docker Postgres

### Step 2: Topic Repository + Service

- Implement `topic.repository.ts` (all CRUD ops)
- Implement `topic.service.ts` (discovery flow with LLM passthrough, persist, list, detail)
- Unit test repository against local DB

### Step 3: Topic Routes + Controller

- Implement `topic.routes.ts` and `topic.controller.ts`
- Wire up unified SSE streaming for `POST /topics` (LLM and DB cache paths)
- Implement `PATCH /topics/:id` for status upsert (discovered/dismissed)
- Test all endpoints with curl

### Step 4: Quiz Repository + Service + Routes

- Same pattern as Step 2-3 for quizzes (M:N model: `quizzes` + `quiz_topics` + `user_quizzes`)
- Implement score calculation and status update logic
- Implement quiz caching: serve unattempted quiz from DB before generating new via LLM

### Step 5: Stats Service + Route

- Add `user.stats.service.ts` to existing user module
- Implement `GET /users/me/stats` with SQL queries against `user_topics` and `user_quizzes`
- Verify stats match what the frontend currently computes

### Step 6: Frontend Services

- Create `topicService.ts`, `quizService.ts`, `statsService.ts`
- Ensure SSE streaming still works through new endpoints

### Step 7: Frontend Store Refactor

- Remove persistence layer (localStorage/AsyncStorage subscription)
- Remove `calculateStatistics()`, `checkMilestones()`
- Remove `quizzes[]`, `currentQuiz`, `dismissedTopics`, `dismissTopic()`, `addQuiz()`
- Add `fetchTopics()`, `fetchStats()`, `updateTopicStatusInCache()`
- Add eager parallel hydration call after auth with per-screen loading spinners

### Step 8: Component Migration

- Update `SurpriseMeFlow`, `GuideMeFlow`, `quiz.tsx`, `TopicsScreen`, `topic-detail`
- Replace `llmService` calls with new service calls
- Test full flows on iOS, Android, and web

### Step 9: Cleanup

- Delete `llmService.ts` (after all consumers migrated)
- Remove `POST /llm/topic` and `POST /llm/quiz` routes (keep `GET /llm/categories`)
- Remove localStorage/AsyncStorage persistence code

---

## 8. Verification Checklist

- [x] "Surprise Me" flow works end-to-end with SSE streaming (typewriter animation) and persistence
- [x] "Guide Me" flow works end-to-end (dismissed topics bug fixed — backend fetches from DB)
- [x] Streaming works identically whether topic is LLM-generated or DB-cached
- [x] DB-first cache: backend queries for unserved topics before calling LLM
- [x] SSE meta delivered as regular `data:` line (`{"type":"meta",...}`) — no named `event:` lines needed
- [x] `sseService.ts` unchanged — processes `data:` lines only (no `event:` support needed)
- [x] `discoverTopic()` returns `{topic: Topic, topicId: string}` (flat→nested conversion in service)
- [x] Dismissed topics are tracked via `user_topics.status = 'dismissed'` and excluded from future discoveries
- [x] Dismissed topics can be toggled back to `discovered` from Topics page
- [x] Dismissed topic cards are visually muted (cannot view or quiz, but can delete via swipe-left or restore via long-press)
- [x] Topics tab shows all topics by default (discovered + learned + dismissed)
- [x] Topics tab uses paginated loading (`GET /topics?page=N&limit=5`)
- [x] Topic detail screen loads from backend
- [x] Quiz generation serves existing unattempted quiz from DB when available; generates new via LLM otherwise
- [x] Quiz M:N model works: shared quiz content, per-user attempts in `user_quizzes`
- [x] Quiz submission via `POST /quizzes/:id/attempts` persists `user_quizzes` row and updates topic status on pass
- [x] `QuizResult` response uses single `id` (= `quizzes.id`), no separate `quizId`
- [x] Profile stats are computed on-demand (simple counts only) from `user_topics` + `user_quizzes` via `GET /users/me/stats`
- [ ] Milestones reflect backend state
- [x] App state is not persisted locally — store is empty on launch, hydrated from backend after auth
- [x] Hydration: eager parallel fetch after auth, per-screen loading spinners
- [x] `quizzes[]`, `currentQuiz`, `dismissedTopics`, `dismissTopic()` removed from Zustand store
- [x] `PATCH /topics/:id` accepts `discoveryMethod` in body (required on first interaction, optional on toggles)
- [x] `DELETE /topics/:id` cascades to `user_quizzes` for quizzes linked to that topic
- [x] Two users discovering the same topic share the `topics` row
- [x] Orphaned topics (no user association) remain in DB as shared cache — no cleanup
- [x] Deleting a topic removes only the `user_topics` row, not the global topic
- [x] No changes to `users` table schema in this phase (bio, preferences, lastActiveAt deferred)
- [x] All endpoints follow REST conventions (`/topics`, `/quizzes`, `/users` — plural nouns, no verbs)
- [x] All endpoints are auth-protected
- [x] Text search uses 300ms debounce; all filters sent server-side as query params to `GET /topics`
- [x] Long-press on discovered card dismisses it (haptic + toast with undo)
- [x] Long-press on learned card: no action
- [x] Long-press on dismissed card restores it to bucket list (haptic + toast with undo)
- [x] Swipe-right (Test) disabled on learned and dismissed cards
- [x] Dismissed cards: reduced opacity, tap disabled, swipe-right disabled, swipe-left (delete) enabled
- [x] Toast auto-dismisses after ~4s; undo reverts to previous status
- [x] Infinite scroll pagination appends results on scroll
- [x] Works on iOS, Android, and web
