# Streaming Architecture

This document explains the reusable streaming architecture implemented for progressive LLM response rendering.

## Overview

The app now has a generic, type-safe streaming system that can be used anywhere LLM responses need to be displayed progressively. This provides better user experience by showing partial results immediately instead of waiting for the complete response.

## Core Components

### 1. Generic Utilities

#### `src/utils/streamingParser.ts`
Generic JSON parser that works with any type:
- `parseStreamingJson<T>(streamText)` - Parses incomplete JSON progressively
- `extractStringField(jsonText, fieldName)` - Extracts a string field from partial JSON
- `extractStringArray(jsonText, fieldName)` - Extracts an array of strings
- `extractObjectArray<T>(jsonText, fieldName, pattern)` - Extracts an array of objects
- `hasMinimumFields<T>(data, requiredFields)` - Checks if minimum data is available

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

## Migration Notes

- Existing `streamingJsonParser.ts` still exists for Technology-specific parsing
- It now uses the generic utilities internally to avoid duplication
- All animation components extracted to `StreamingAnimations.tsx`
- No breaking changes to existing streaming implementations
