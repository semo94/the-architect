import categorySchema from './categories.js';
import type { GenerateTopicConstraints, TopicPromptInput, TopicType } from './llm.schemas.js';

interface TopicTypeDefinition {
  short: string;
  detailed: string;
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

const QUIZ_QUESTION_GUIDANCE: Record<TopicType, { conceptual: string; strengths: string; limitations: string }> = {
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
    limitations: "Limitations of the model, when it doesn't apply",
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

function formatAllTopicTypes(): string {
  return Object.entries(TOPIC_TYPE_DEFINITIONS)
    .map(([type, def]) => `- ${type}: ${def.short}`)
    .join('\n');
}

export const promptTemplates = {
  generateTopic: (
    mode: 'surprise' | 'guided',
    alreadyDiscovered: string[],
    dismissed: string[],
    constraints?: GenerateTopicConstraints
  ): string => {
    return `
You are an expert software architecture mentor generating learning content.

MODE: ${mode.toUpperCase()}

${mode === 'guided'
  ? `GUIDED CONSTRAINTS:\n- Category: ${constraints?.category}\n- Subcategory: ${constraints?.subcategory}\n- TopicType: ${constraints?.topicType}\n- Learning Goal: ${constraints?.learningGoal}\nDefinition: ${constraints ? TOPIC_TYPE_DEFINITIONS[constraints.topicType].detailed : ''}`
  : `SURPRISE MODE:\nSelect a meaningful category, subcategory, and topic type from the schema.`}

TOPIC TYPES:
${formatAllTopicTypes()}

AVOIDANCE LIST:
- Already discovered: ${JSON.stringify(alreadyDiscovered)}
- Recently dismissed: ${JSON.stringify(dismissed)}

CATEGORY SCHEMA:
${JSON.stringify(categorySchema, null, 2)}

OUTPUT FORMAT (RETURN JSON ONLY):
{
  "name": "Specific Topic Name",
  "topicType": "${constraints?.topicType ?? 'select from schema'}",
  "category": "${constraints?.category ?? 'select from schema'}",
  "subcategory": "${constraints?.subcategory ?? 'select from schema'}",
  "what": "2-3 substantial paragraphs",
  "why": "2-3 substantial paragraphs",
  "pro_0": "...",
  "pro_1": "...",
  "pro_2": "...",
  "pro_3": "...",
  "pro_4": "...",
  "con_0": "...",
  "con_1": "...",
  "con_2": "...",
  "con_3": "...",
  "con_4": "...",
  "compare_0_tech": "...",
  "compare_0_text": "...",
  "compare_1_tech": "...",
  "compare_1_text": "..."
}

Rules:
- Return valid JSON only, no markdown.
- Topic must be architecturally significant.
- Keep comparisons realistic and actionable.
${mode === 'guided' ? `- topicType must equal "${constraints?.topicType}".` : ''}
`;
  },

  generateQuizQuestions: (topic: TopicPromptInput): string => {
    const guidance = QUIZ_QUESTION_GUIDANCE[topic.topicType];

    return `
You are creating a quiz to test understanding of ${topic.name} (${topic.topicType}).

TOPIC CONTEXT:
- Category: ${topic.category} > ${topic.subcategory}
- Content: ${JSON.stringify(topic.content)}

Generate exactly 4 multiple-choice questions that test ${QUIZ_FOCUS_AREAS[topic.topicType]}.

Phrasing guidance:
- Q1-Q2: ${guidance.conceptual}
- Q3: ${guidance.strengths}
- Q4: ${guidance.limitations}

OUTPUT FORMAT (RETURN JSON ONLY):
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

Rules:
- Exactly 4 questions.
- Exactly 4 options per question.
- One correct answer (0-3).
- Questions must be answerable from the provided topic content.
- No markdown, JSON only.
`;
  },
};
