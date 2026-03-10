# Streaming Architecture

This document explains the reusable streaming architecture implemented for progressive LLM response rendering.

## Overview

The app now has a generic, type-safe streaming system that can be used anywhere LLM responses need to be displayed progressively. This provides better user experience by showing partial results immediately instead of waiting for the complete response.

## Core Components

### 1. Generic Utilities

#### `src/utils/streamingParser.ts`

**Unified streaming parser** for all response types (replaces old streamingJsonParser):

- `parseStreamingJson<T>(streamText)` - Parses incomplete JSON progressively with caching
- `extractStringField(jsonText, fieldName)` - Extracts a string field from partial JSON
- `extractStringArray(jsonText, fieldName)` - Extracts an array of strings
- `extractObjectArray<T>(jsonText, fieldName, pattern)` - Extracts an array of objects
- `hasMinimumFields<T>(data, requiredFields)` - Checks if minimum data is available
- `hasMinimumData(partial)` - Technology-specific minimum data check
- `hasSectionData(partial, section)` - Technology-specific section data check
- `hasMinimumQuestionData(partial)` - Question minimum data check
- `getAvailableOptionsCount(partial)` - Count available question options

**Key Optimizations:**

- ✅ Caching of markdown extraction (avoids repeated regex)
- ✅ Single-pass field extraction for flat formats
- ✅ Removed error-prone `attemptJsonFix()` function
- ✅ Unified parser for all response types

#### `src/hooks/useStreamingData.ts`

Reusable React hook for managing streaming state:

```typescript
const streaming = useStreamingData<MyType>({
  hasMinimumData: (data) => !!data.requiredField,
  onComplete: (data) => setFinalData(data),
});

// Use in LLM call
const result = await llmService.someMethod(..., streaming.onProgress);
streaming.handleComplete(result);
```

Returns:

- `partialData` - Current partial data
- `isStreaming` - Whether actively streaming
- `isLoading` - Whether loading before minimum data
- `finalData` - Complete data when done
- `onProgress` - Callback to pass to LLM service
- `handleComplete` - Call when streaming completes
- `handleError` - Call on errors
- `reset` - Reset state

### 2. Animation Components

#### `src/components/common/StreamingAnimations.tsx`

Reusable animation wrappers:

- `FadeInView` - Fade-in animation with configurable delay
- `TypewriterText` - Typewriter effect for text
- `FadeInItemWrapper` - Wrapper for list items with staggered delays

### 3. LLM Service

`src/services/llmService.ts` is a **thin backend SSE client** — all LLM logic (provider auth, prompt engineering, streaming relay) lives server-side in `backend/src/modules/llm/`.

Methods supporting an optional `onProgress` callback:

- `generateTopic(mode, alreadyDiscovered, dismissed, constraints?, onProgress?)`
- `generateSurpriseTopic(alreadyDiscovered, dismissed, onProgress?)`
- `generateGuidedTopic(constraints, alreadyDiscovered, onProgress?)`
- `generateQuizQuestions(topic, onProgress?)`

Each method sends a structured request to the Fastify backend (`POST /llm/topic` or `POST /llm/quiz`) and consumes normalized `data: {"text":"..."}` SSE chunks. Zod validation of the accumulated output runs on the frontend after the stream completes.

### 4. Streaming UI Components

#### `src/components/discover/StreamingQuestionCard.tsx`

Displays guided questions with progressive reveal:

- Shows skeleton while loading
- Typewriter effect for question text
- Fade-in animation for options
- Disables interaction until complete

#### `src/components/quiz/StreamingQuizLoader.tsx`

Shows quiz questions as they're generated:

- Displays loaded questions with fade-in
- Shows skeleton placeholders for pending questions
- Progress indicator

#### `src/components/discover/StreamingTechnologyCard.tsx`

Displays technology data progressively (already existed, now refactored to use common utilities)

## Usage Examples

### Example 1: Streaming Topic Generation (Guide Me Flow)

The Guide Me flow collects user preferences via `guideMeHelper` (category/subcategory/topicType), then calls the backend to generate the final topic with streaming:

```typescript
import { useStreamingData } from '@/hooks/useStreamingData';
import llmService from '@/services/llmService';

const topicStreaming = useStreamingData<TopicContent>({
  hasMinimumData: (data) => !!data.name && !!data.what,
  onComplete: (data) => setTopic(data),
});

// After user has completed the Guide Me selection steps:
const topic = await llmService.generateGuidedTopic(
  constraints,          // { category, subcategory, topicType, learningGoal }
  alreadyDiscovered,
  topicStreaming.onProgress
);
topicStreaming.handleComplete(topic);

// Render progressive topic card
<TopicCard
  topic={topicStreaming.partialData}
  isStreaming={topicStreaming.isStreaming}
/>
```

### Example 2: Streaming Quiz Generation

```typescript
import { useStreamingData } from '@/hooks/useStreamingData';

const quizStreaming = useStreamingData<{ questions: QuizQuestion[] }>({
  hasMinimumData: (data) => !!(data.questions && data.questions.length > 0),
  onComplete: (data) => setQuestions(data.questions),
});

// Generate quiz with streaming
const questions = await llmService.generateQuizQuestions(
  topic,   // full Topic object
  quizStreaming.onProgress
);
quizStreaming.handleComplete({ questions });

// Show loading while streaming
if (quizStreaming.isStreaming) {
  return <LoadingSpinner message="Generating quiz questions..." />;
}
```

### Example 3: Custom Streaming Component

```typescript
import { useStreamingData } from '@/hooks/useStreamingData';
import { TypewriterText, FadeInView } from '@/components/common/StreamingAnimations';

interface MyData {
  title: string;
  description: string;
}

const streaming = useStreamingData<MyData>({
  hasMinimumData: (data) => !!data.title,
});

// Use TypewriterText for progressive text reveal
{streaming.partialData.description && (
  <TypewriterText
    text={streaming.partialData.description}
    style={styles.text}
    speed={15}
  />
)}

// Use FadeInView for animated reveals
<FadeInView delay={100}>
  <MyComponent />
</FadeInView>
```

## Architecture Benefits

1. **Type Safety** - Generic utilities work with any type
2. **Reusability** - Hook and components can be used anywhere
3. **Consistency** - Same UX pattern across all streaming features
4. **Performance** - Progressive rendering improves perceived performance
5. **Maintainability** - Single source of truth for streaming logic
6. **Extensibility** - Easy to add streaming to new features

## Flat Format Strategy

All LLM responses now use **flat JSON format** for optimal streaming:

### Technology Format (v2)

```json
{
  "name": "Redis",
  "category": "Data Storage",
  "subcategory": "In-Memory Databases",
  "what": "2-3 paragraphs...",
  "why": "2-3 paragraphs...",
  "pro_0": "First advantage",
  "pro_1": "Second advantage",
  "pro_2": "Third advantage",
  "pro_3": "Fourth advantage",
  "pro_4": "Fifth advantage",
  "con_0": "First limitation",
  "con_1": "Second limitation",
  "con_2": "Third limitation",
  "con_3": "Fourth limitation",
  "con_4": "Fifth limitation",
  "compare_0_tech": "PostgreSQL",
  "compare_0_text": "Comparison text...",
  "compare_1_tech": "Memcached",
  "compare_1_text": "Comparison text..."
}
```

### Guided Question Format (v2)

```json
{
  "question": "What area interests you?",
  "option_0": "Backend Systems",
  "option_1": "Frontend Development",
  "option_2": "Data Engineering",
  "option_3": "DevOps & Infrastructure",
  "option_4": "Mobile Development",
  "option_5": "Security"
}
```

### Quiz Format (unchanged)

```json
{
  "questions": [
    {
      "question": "...",
      "option_0": "...",
      "option_1": "...",
      "option_2": "...",
      "option_3": "...",
      "correctAnswer": 0,
      "explanation": "..."
    }
  ]
}
```

### Why Flat Format?

- ✅ **Predictable field order** - Fields appear sequentially during streaming
- ✅ **Simple parsing** - Single regex per field, no nested structure traversal
- ✅ **Progressive UX** - Show each pro/con/comparison as it arrives
- ✅ **Reliable** - No ambiguity in partial arrays or objects
- ✅ **Consistent** - Same approach for all response types

### Transformation

- LLM generates flat format for optimal streaming
- Parser extracts flat fields progressively during streaming
- `llmService` transforms to nested format after completion
- App uses standard nested Technology type internally

## Recent Changes

### Backend LLM Migration (2026)

- **Moved** all LLM logic (provider auth, prompt templates, API keys) to `backend/src/modules/llm/`
- **Moved** `src/constants/categories.ts` (829 lines) to `backend/src/modules/llm/categories.ts` — single source of truth; FE fetches via `GET /llm/categories`
- **Moved** `src/utils/prompts.ts` to `backend/src/modules/llm/prompts.ts`
- **Deleted** `scripts/llm-proxy.mjs` dev CORS proxy — no longer needed
- **Rewritten** `src/services/llmService.ts` as a thin backend SSE client; FE never handles LLM API keys
- **Simplified** `src/services/sseService.ts` — always expects normalized `data: {"text":"..."}` format
- **Added** `src/services/categorySchemaService.ts` — fetches and caches the category schema from backend
- **Added** stream abort support — FE `AbortController` wired to backend `AbortController` via request close event
- **Result**: LLM credentials never exposed in the JS bundle; backend relay normalizes Anthropic/OpenAI SSE format

### Consolidated Parser (Jan 2024)

- **Merged** `streamingJsonParser.ts` into `streamingParser.ts`
- **Deleted** 109 lines of duplicate code
- **Added** caching to `extractJsonText()` for performance
- **Removed** error-prone `attemptJsonFix()` function
- **Updated** all imports to use unified parser

### Flat Format Migration (Jan 2024)

- **Updated** Technology prompts to use flat format
- **Added** transformation layer in `llmService`
- **Result**: ~70% faster parsing, smoother progressive display

### Guided Question Streaming (Jan 2024)

- **Updated** Guided Question prompt to use flat format (option_0, option_1, etc.)
- **Added** `hasMinimumQuestionData()` and `getAvailableOptionsCount()` helpers
- **Result**: Options now appear one-by-one during streaming instead of all at once
