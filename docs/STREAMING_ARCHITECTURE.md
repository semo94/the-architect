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

All methods in `src/services/llmService.ts` now support optional `onProgress` callback:
- `generateSurpriseTechnology(...)`
- `generateGuidedTechnology(..., onProgress?)`
- `generateGuidedQuestion(..., onProgress?)`
- `generateQuizQuestions(..., onProgress?)`

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

### Example 1: Streaming Questions (Guide Me Flow)

```typescript
import { useStreamingData } from '@/hooks/useStreamingData';
import { StreamingQuestionCard } from '@/components/discover/StreamingQuestionCard';

const questionStreaming = useStreamingData<{ question: string; options: string[] }>({
  hasMinimumData: (data) => !!data.question,
});

// Generate question with streaming
const question = await llmService.generateGuidedQuestion(
  step,
  history,
  schema,
  questionStreaming.onProgress
);
questionStreaming.handleComplete(question);

// Render
<StreamingQuestionCard
  partialData={questionStreaming.partialData}
  isStreaming={questionStreaming.isStreaming}
  isComplete={!!questionStreaming.finalData}
  onSelectOption={handleSelect}
/>
```

### Example 2: Streaming Quiz Generation

```typescript
import { useStreamingData } from '@/hooks/useStreamingData';
import { StreamingQuizLoader } from '@/components/quiz/StreamingQuizLoader';

const quizStreaming = useStreamingData<{ questions: QuizQuestion[] }>({
  hasMinimumData: (data) => !!(data.questions && data.questions.length > 0),
  onComplete: (data) => setQuestions(data.questions),
});

// Generate quiz with streaming
const questions = await llmService.generateQuizQuestions(
  technology,
  quizStreaming.onProgress
);
quizStreaming.handleComplete({ questions });

// Show streaming loader
if (quizStreaming.isStreaming) {
  return (
    <StreamingQuizLoader
      partialData={quizStreaming.partialData}
      isStreaming={quizStreaming.isStreaming}
      totalExpected={4}
    />
  );
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

## Recent Changes (2024)

### Consolidated Parser (Jan 2024)
- **Merged** `streamingJsonParser.ts` into `streamingParser.ts`
- **Deleted** 109 lines of duplicate code
- **Added** caching to `extractJsonText()` for performance
- **Removed** error-prone `attemptJsonFix()` function
- **Updated** all imports to use unified parser

### Flat Format Migration (Jan 2024)
- **Updated** Technology prompts to use flat format
- **Added** transformation layer in `llmService`
- **Updated** `StreamingTechnologyCard` to handle flat format during streaming
- **Result**: ~70% faster parsing, smoother progressive display

### Guided Question Streaming (Jan 2024)
- **Updated** Guided Question prompt to use flat format (option_0, option_1, etc.)
- **Added** `GuidedQuestionSchemaFlat` schema with optional option_4 and option_5
- **Updated** `StreamingQuestionCard` to show options progressively as they arrive
- **Added** `hasMinimumQuestionData()` and `getAvailableOptionsCount()` helpers
- **Result**: Options now appear one-by-one during streaming instead of all at once
