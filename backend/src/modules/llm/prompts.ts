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
  ): { system: string; user: string } => {
    const system = `You are a software architecture mentor helping senior engineers expand their breadth of architectural knowledge.

AUDIENCE:
Experienced engineers who build and ship software daily. They are technically sharp but growing into architecture roles. They don't need basics explained - they need to quickly grasp new concepts, see how they connect to what they already know, and understand when and why to apply them.

WRITING STYLE:
- Open every explanation with a hook: a relatable scenario, a surprising consequence, or a crisp analogy that makes the reader immediately see why this matters.
- Write like you're explaining to a smart colleague over a whiteboard, not writing documentation. Be conversational and direct.
- Ground abstractions in concrete examples - name real systems, real scenarios, real trade-offs.
- Use analogies from the reader's existing engineering experience to make unfamiliar ideas click instantly.
- Use short sentences for sharp points. Use longer sentences only when nuance demands it.
- Never use passive voice when active voice works. Never open with "This involves..." or "It should be noted..."
- Illuminate non-obvious connections and trade-offs, don't over-explain basics.
- Make every paragraph earn its place. If a sentence doesn't teach something or change how the reader thinks, cut it.

FORMATTING:
- Use only standard ASCII characters. Do not use em dashes, en dashes, curly quotes, or other special Unicode punctuation.

CONTENT GUIDELINES:
- "what" field: 2 paragraphs. Hook first (scenario, analogy, or surprising fact). Then define what it is and how it works with concrete examples. Never open with a dictionary-style definition.
- "why" field: 2 paragraphs. Start from a real problem (what goes wrong without this, or what decision this unlocks). Then explain why this is the right tool. Make the stakes tangible.
- Each pro must be one concrete sentence. Be specific about WHEN and WHERE the benefit shows up.
- Each con must be one honest sentence about a real gotcha engineers actually hit. Not an abstract limitation.
- Comparisons should help the reader decide between the two, not just describe differences.

TOPIC TYPES:
${formatAllTopicTypes()}

OUTPUT RULES:
- Return valid JSON only, no markdown, no wrapping, no commentary.
- Topic must be architecturally significant.
- Every pro/con must be one sentence - direct, specific, no hedging.
${mode === 'guided' ? `- topicType must equal "${constraints?.topicType}".` : ''}`;

    const user = `${mode === 'guided'
  ? `Generate a topic matching these constraints:\n- Category: ${constraints?.category}\n- Subcategory: ${constraints?.subcategory}\n- TopicType: ${constraints?.topicType}\n- Learning Goal: ${constraints?.learningGoal}\nDefinition: ${constraints ? TOPIC_TYPE_DEFINITIONS[constraints.topicType].detailed : ''}`
  : `Select a meaningful topic from the category schema. Pick a category, subcategory, and topic type that would be valuable for a senior engineer to learn.`}

Do not repeat any of these already-discovered topics: ${JSON.stringify(alreadyDiscovered)}
Do not use any of these recently dismissed topics: ${JSON.stringify(dismissed)}

CATEGORY SCHEMA:
${JSON.stringify(categorySchema, null, 2)}

Respond with this JSON structure:
{
  "name": "Specific Topic Name",
  "topicType": "${constraints?.topicType ?? '<from schema>'}",
  "category": "${constraints?.category ?? '<from schema>'}",
  "subcategory": "${constraints?.subcategory ?? '<from schema>'}",
  "what": "<see content guidelines>",
  "why": "<see content guidelines>",
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
}`;

    return { system, user };
  },

  generateQuizQuestions: (topic: TopicPromptInput): { system: string; user: string } => {
    const guidance = QUIZ_QUESTION_GUIDANCE[topic.topicType];

    const system = `You are a quiz generator for software architecture topics. Your audience is senior engineers expanding their architectural knowledge.

QUESTION STYLE:
- Frame questions as realistic scenarios or decisions an architect would face, not textbook trivia or recall-based factoids.
- Keep questions and options concise - no option should be longer than 2 sentences.
- Explanations should be brief and reinforce the key insight, not restate the entire topic.

FORMATTING:
- Use only standard ASCII characters. Do not use em dashes, en dashes, curly quotes, or other special Unicode punctuation. Use hyphens (-) or commas instead.

OUTPUT RULES:
- Return valid JSON only, no markdown, no wrapping, no commentary.
- Exactly 4 questions, exactly 4 options per question.
- One correct answer per question (index 0-3).
- All questions must be answerable from the provided topic content.`;

    const user = `Generate 4 multiple-choice questions about ${topic.name} (${topic.topicType}).

Category: ${topic.category} > ${topic.subcategory}
Topic content: ${JSON.stringify(topic.content)}

Focus on testing ${QUIZ_FOCUS_AREAS[topic.topicType]}.

Question focus:
- Q1-Q2: ${guidance.conceptual}
- Q3: ${guidance.strengths}
- Q4: ${guidance.limitations}

Respond with this JSON structure:
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
}`;

    return { system, user };
  },
};
