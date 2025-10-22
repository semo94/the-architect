import { Topic, TopicType } from '../types';

/**
 * Prompt templates for LLM service
 * Centralized location for all prompt engineering
 */

// ============================================================================
// TOPIC TYPE DEFINITIONS
// Single source of truth for all topic type descriptions
// ============================================================================

interface TopicTypeDefinition {
  short: string;      // Concise description for lists
  detailed: string;   // Detailed description with examples
}

const TOPIC_TYPE_DEFINITIONS: Record<TopicType, TopicTypeDefinition> = {
  concepts: {
    short: 'Theoretical foundations and principles',
    detailed: 'Theoretical foundations and principles (e.g., CAP Theorem, Consistency Models)',
  },
  patterns: {
    short: 'Reusable architectural solutions',
    detailed: 'Reusable architectural solutions (e.g., Circuit Breaker, Saga Pattern)',
  },
  technologies: {
    short: 'Specific tools and platforms',
    detailed: 'Specific tools and platforms (e.g., Redis, Kubernetes, Kafka)',
  },
  strategies: {
    short: 'Approaches and methods',
    detailed: 'Approaches and methods (e.g., Blue-Green Deployment, Cache-Aside)',
  },
  models: {
    short: 'Architectural paradigms',
    detailed: 'Architectural paradigms (e.g., Pub/Sub, Client-Server, RBAC)',
  },
  frameworks: {
    short: 'Structured methodologies',
    detailed: 'Structured methodologies (e.g., 12-Factor App, Spring Framework)',
  },
  protocols: {
    short: 'Standards and specifications',
    detailed: 'Standards and specifications (e.g., OAuth 2.0, HTTP/2, gRPC)',
  },
  practices: {
    short: 'Development and operational practices',
    detailed: 'Development and operational practices (e.g., TDD, Chaos Engineering)',
  },
  methodologies: {
    short: 'Comprehensive approaches',
    detailed: 'Comprehensive approaches (e.g., Domain-Driven Design, Event Storming)',
  },
  architectures: {
    short: 'System-level designs',
    detailed: 'System-level designs (e.g., Microservices, Event-Driven, Serverless)',
  },
};

const QUIZ_FOCUS_AREAS: Record<TopicType, string> = {
  concepts: 'theoretical understanding, implications, and relationships',
  patterns: 'problem recognition, solution application, and trade-off analysis',
  technologies: 'practical knowledge, use cases, and operational aspects',
  strategies: 'situational application, comparison, and execution',
  models: 'characteristics, use cases, and properties',
  protocols: 'specification knowledge, compatibility, and security',
  practices: 'implementation understanding, benefits, and challenges',
  methodologies: 'philosophy, components, and adoption',
  architectures: 'structural understanding, characteristics, and evolution',
  frameworks: 'structure, philosophy, and ecosystem',
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Formats all topic types as a bulleted list (short descriptions)
 */
function formatAllTopicTypes(): string {
  return Object.entries(TOPIC_TYPE_DEFINITIONS)
    .map(([type, def]) => `- ${type}: ${def.short}`)
    .join('\n');
}

/**
 * Logs prompt to console in a formatted, readable way
 * @param promptType - Type of prompt being logged
 * @param prompt - The prompt string
 * @param metadata - Additional context (e.g., mode, topic name)
 */
function logPrompt(
  promptType: string,
  prompt: string,
  metadata?: Record<string, any>
): void {
  if (process.env.NODE_ENV === 'development' || __DEV__) {
    console.group(`🤖 [LLM Prompt] ${promptType}`);

    if (metadata) {
      console.log('📋 Metadata:', JSON.stringify(metadata, null, 2));
    }

    console.log('📝 Prompt:');
    console.log('─'.repeat(80));
    console.log(prompt);
    console.log('─'.repeat(80));
    console.log(`📊 Token estimate: ~${Math.ceil(prompt.length / 4)} tokens`);

    console.groupEnd();
  }
}

// ============================================================================
// PROMPT TEMPLATES
// ============================================================================

export const promptTemplates = {
  /**
   * Unified topic generation for both Surprise Me and Guide Me flows
   */
  generateTopic: (
    mode: 'surprise' | 'guided',
    alreadyDiscovered: string[],
    dismissed: string[],
    categorySchema: any,
    constraints?: {
      category: string;
      subcategory: string;
      topicType: TopicType;
      learningGoal: string;
    }
  ): string => {
    const prompt = `
You are an expert software architecture mentor generating learning content.

MODE: ${mode.toUpperCase()}
${mode === 'guided'
        ? `
TARGET TOPIC TYPE: ${constraints!.topicType}
Definition: ${TOPIC_TYPE_DEFINITIONS[constraints!.topicType].detailed}

CONSTRAINTS:
- Category: ${constraints!.category}
- Subcategory: ${constraints!.subcategory}
- Learning Goal: ${constraints!.learningGoal}
- You may use schema examples as inspiration OR generate any valid ${constraints!.topicType} topic in this domain
`
        : `
INSTRUCTIONS:
- Randomly select a category, subcategory, and topic type from the schema
- Ensure variety across different topic types

TOPIC TYPES:
${formatAllTopicTypes()}
`}
AVOIDANCE LIST:
- Already discovered: ${JSON.stringify(alreadyDiscovered)}
- Recently dismissed: ${JSON.stringify(dismissed)}
${mode === 'surprise'
        ? `
AVAILABLE SCHEMA:
${JSON.stringify(categorySchema)}
`
        : ''}
REQUIREMENTS:
- Topic must be real, widely-recognized, and architecturally significant
- Name must NOT appear in avoidance lists
- Content must be accurate, substantial, and technically detailed
${mode === 'guided' ? `- Topic MUST be of type: ${constraints!.topicType}` : ''}

OUTPUT FORMAT (Flat JSON structure optimized for streaming):
{
  "name": "Specific Topic Name",
  "topicType": "${constraints?.topicType || 'auto-detect from subcategory'}",
  "category": "${constraints?.category || 'from schema'}",
  "subcategory": "${constraints?.subcategory || 'from schema'}",
  "what": "2-3 substantial paragraphs explaining the topic in depth. Be specific, technical, and comprehensive.",
  "why": "2-3 substantial paragraphs on architectural significance, when to use, problems it solves, strategic value.",
  "pro_0": "First key advantage/strength",
  "pro_1": "Second key advantage/strength",
  "pro_2": "Third key advantage/strength",
  "pro_3": "Fourth key advantage/strength",
  "pro_4": "Fifth key advantage/strength",
  "con_0": "First limitation/trade-off/challenge",
  "con_1": "Second limitation/trade-off/challenge",
  "con_2": "Third limitation/trade-off/challenge",
  "con_3": "Fourth limitation/trade-off/challenge",
  "con_4": "Fifth limitation/trade-off/challenge",
  "compare_0_tech": "Similar/Alternative Topic Name",
  "compare_0_text": "2-3 sentences comparing: key differences, when to choose one over the other",
  "compare_1_tech": "Another Similar/Alternative Topic",
  "compare_1_text": "2-3 sentences: different trade-offs, use case distinctions"
}

CRITICAL REQUIREMENTS:
- Name must be a real, widely-recognized topic in software architecture
- Content must be accurate, substantial, and architecturally relevant
- Comparisons must be with genuinely related topics
- Return ONLY valid JSON without markdown code blocks or preamble
- topicType must exactly match ${constraints?.topicType ? `"${constraints.topicType}"` : 'the subcategory definition'}

Generate the topic now:`;

    logPrompt('Generate Topic', prompt, {
      mode,
      topicType: constraints?.topicType,
      category: constraints?.category,
      subcategory: constraints?.subcategory,
      discoveredCount: alreadyDiscovered.length,
      dismissedCount: dismissed.length,
    });

    return prompt;
  },

  /**
   * Generate quiz questions for a topic
   */
  generateQuizQuestions: (topic: Topic): string => {
    const prompt = `
You are creating a quiz to test understanding of ${topic.name} (${topic.topicType}).

TOPIC CONTEXT:
- Category: ${topic.category} > ${topic.subcategory}
- Content: ${JSON.stringify(topic.content)}

QUIZ REQUIREMENTS:
Generate exactly 4 multiple-choice questions that test ${QUIZ_FOCUS_AREAS[topic.topicType]}.

Distribution:
- 2 questions: Conceptual understanding (What/Why)
- 1 question: Practical application (When to use)
- 1 question: Trade-offs analysis (Pros/Cons)

Quality standards:
- Each question has exactly 4 options with 1 correct answer
- Brief explanations (2-3 sentences) for correct answers
- Focus on architectural thinking, not trivia

⚠️ CRITICAL - FIELD ORDER FOR STREAMING:
Fields MUST appear in this EXACT order within each question object:
1. question
2. option_0
3. option_1
4. option_2
5. option_3
6. correctAnswer
7. explanation

Complete each question object entirely before starting the next one.

OUTPUT FORMAT:
{
  "questions": [
    {
      "question": "Clear question text",
      "option_0": "First option",
      "option_1": "Second option",
      "option_2": "Third option",
      "option_3": "Fourth option",
      "correctAnswer": 0,
      "explanation": "Brief explanation of why this answer is correct"
    }
    // ... 3 more questions with identical structure
  ]
}

Return ONLY valid JSON without markdown code blocks or preamble.

Generate the quiz questions now:`;

    logPrompt('Generate Quiz Questions', prompt, {
      topicName: topic.name,
      topicType: topic.topicType,
      category: topic.category,
      subcategory: topic.subcategory,
    });

    return prompt;
  },
};
