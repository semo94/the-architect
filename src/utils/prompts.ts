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

/**
 * Question phrasing guidance for each topic type
 * Ensures quiz questions are phrased appropriately while testing the same content areas
 * (what, why, pros, cons, comparisons)
 */
const QUIZ_QUESTION_GUIDANCE: Record<TopicType, {
  conceptual: string;    // How to phrase Q1-Q2 (testing 'what' and 'why')
  strengths: string;     // How to phrase Q3 (testing 'pros')
  limitations: string;   // How to phrase Q4 (testing 'cons')
}> = {
  technologies: {
    conceptual: 'What it is, why it exists, core capabilities',
    strengths: 'Key advantages, use cases, when to adopt',
    limitations: 'Drawbacks, limitations, trade-offs',
  },
  frameworks: {
    conceptual: 'What it is, philosophy, purpose',
    strengths: 'Benefits of adoption, strengths, ecosystem advantages',
    limitations: 'Constraints, learning curve, when NOT to use',
  },
  patterns: {
    conceptual: 'What problem it solves, how it works',
    strengths: 'Benefits, when to apply, scenarios',
    limitations: 'Drawbacks, anti-patterns, over-application risks',
  },
  concepts: {
    conceptual: 'What it is, why it matters for architects',
    strengths: 'Insights it provides, how it helps decision-making',
    limitations: 'Limitations of the model, when it doesn\'t apply',
  },
  models: {
    conceptual: 'What it is, characteristics, how it works',
    strengths: 'Advantages of this model, when to use',
    limitations: 'Constraints, when other models are better',
  },
  methodologies: {
    conceptual: 'What it is, philosophy, goals',
    strengths: 'Benefits of adoption, what it improves',
    limitations: 'Adoption challenges, prerequisites, when to avoid',
  },
  practices: {
    conceptual: 'What it is, purpose, principles',
    strengths: 'Benefits, what problems it solves',
    limitations: 'Implementation challenges, common pitfalls',
  },
  strategies: {
    conceptual: 'What it is, how it works, when to use',
    strengths: 'Advantages, scenarios where it excels',
    limitations: 'Drawbacks, complexity, when alternatives are better',
  },
  protocols: {
    conceptual: 'How it works, key components, flow',
    strengths: 'Security advantages, capabilities, standardization benefits',
    limitations: 'Vulnerabilities, complexity, compatibility issues',
  },
  architectures: {
    conceptual: 'Characteristics, structure, how it works',
    strengths: 'When to use, scalability benefits, strengths',
    limitations: 'When NOT to use, constraints, migration challenges',
  },
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

## BREADTHWISE MISSION
You are generating topics for Breadthwise, an app designed to help senior software engineers progress to Principal/Staff Architect roles by expanding their breadth of architectural knowledge.

- Target audience: Experienced engineers (5-10+ years) who need strategic, system-level knowledge
- Goal: BREADTH over depth - exposure to diverse concepts, patterns, technologies, and approaches
- Topics should be things architects "should know about" to make informed decisions and participate in architectural discussions
- Focus on knowledge that distinguishes senior engineers from principal/staff architects

MODE: ${mode.toUpperCase()}

## SCHEMA USAGE & CREATIVE FREEDOM
The provided schema defines the conceptual landscape of software architecture. The example topics in the schema are ILLUSTRATIVE, NOT EXHAUSTIVE.

${mode === 'surprise'
        ? `For SURPRISE mode:
- Use the schema to SELECT which domain to explore (category, subcategory, topicType)
- Then generate ANY architecturally significant topic within that chosen domain
- You are NOT limited to the example topics listed in the schema
- Ensure variety across different topic types

TOPIC TYPES:
${formatAllTopicTypes()}
`
        : `For GUIDED mode:
- User has constrained: category, subcategory, topicType, and learningGoal
- Use the schema for CONTEXT about the domain and for finding COMPARISONS
- Generate ANY architecturally significant topic that matches the constraints
- You are NOT limited to the example topics listed in the schema

TARGET TOPIC TYPE: ${constraints!.topicType}
Definition: ${TOPIC_TYPE_DEFINITIONS[constraints!.topicType].detailed}

CONSTRAINTS:
- Category: ${constraints!.category}
- Subcategory: ${constraints!.subcategory}
- Learning Goal: ${constraints!.learningGoal}
`}
AVOIDANCE LIST:
- Already discovered: ${JSON.stringify(alreadyDiscovered)}
- Recently dismissed: ${JSON.stringify(dismissed)}

CATEGORY SCHEMA (for context and comparisons):
${JSON.stringify(categorySchema, null, 2)}

## CONTENT FIELD INTERPRETATION BY TOPIC TYPE

The output format uses 'pros' and 'cons' fields, but interpret these flexibly based on topic type:

**For technologies/frameworks/patterns:**
- pros = advantages, strengths, benefits
- cons = disadvantages, limitations, drawbacks

**For concepts/models:**
- pros = insights it provides, how it helps architects, applications
- cons = limitations of the model, when it doesn't apply, oversimplifications

**For methodologies/practices/strategies:**
- pros = benefits of adoption, what it improves, value it provides
- cons = adoption challenges, prerequisites, implementation difficulties

**For protocols:**
- pros = security advantages, standardization benefits, capabilities
- cons = vulnerabilities, complexity costs, compatibility issues

**For architectures:**
- pros = strengths, scalability benefits, when to use
- cons = constraints, when NOT to use, migration challenges

The goal: ensure content in pros/cons fields can be tested via quiz questions about strengths and limitations.

## ARCHITECTURAL SIGNIFICANCE CRITERIA
Topics MUST be architecturally significant. This means:

✓ Relevant for system-level decision making (not just implementation details)
✓ Involves trade-offs that architects need to understand
✓ Answers strategic questions: "When should I use this?", "Why choose this over alternatives?", "What are the implications?"
✓ Broadly applicable across multiple domains/industries (not overly niche)
✓ Knowledge that principal/staff architects are expected to know

✗ Avoid: Language-specific syntax, overly niche tools used by <1% of companies, implementation minutiae, basic programming concepts

ADDITIONAL REQUIREMENTS:
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

QUESTION PHRASING FOR ${topic.topicType.toUpperCase()}:
When creating questions, phrase them appropriately for this topic type:
- Questions 1-2: Focus on ${QUIZ_QUESTION_GUIDANCE[topic.topicType].conceptual}
- Question 3: Focus on ${QUIZ_QUESTION_GUIDANCE[topic.topicType].strengths}
- Question 4: Focus on ${QUIZ_QUESTION_GUIDANCE[topic.topicType].limitations}

All questions should be answerable from the provided topic content (what, why, pros, cons, comparisons).

Distribution:
- 2 questions: Conceptual understanding - test 'what' and 'why' content
- 1 question: Strengths/Benefits - test 'pros' content
- 1 question: Limitations/Trade-offs - test 'cons' content

Ensure questions reflect the nature of ${topic.topicType} topics (see phrasing guidance above).

Quality standards:
- Each question has exactly 4 options with 1 correct answer
- Brief explanations (2-3 sentences) for correct answers
- Focus on architectural thinking, not trivia

Content boundaries (stay true to architectural breadth):
- Test strategic awareness and trade-off thinking
- Focus on "conversation competence" - can they discuss it knowledgeably?
- Ask about what, why, when, and trade-offs
- Avoid implementation details, code syntax, or deep technical trivia

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
