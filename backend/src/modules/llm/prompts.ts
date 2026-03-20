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

interface TopicContentGuidance {
  whatFocus: string;
  whyFocus: string;
  compareAgainst: string;
  prosConsScope: string;
}

const TOPIC_CONTENT_GUIDANCE: Record<TopicType, TopicContentGuidance> = {
  concepts: {
    whatFocus: 'Explain the principle or theorem and its core implications. Hook with a real-world consequence or a decision this concept clarifies. Define precisely what it states and what constraints or guarantees it introduces.',
    whyFocus: 'Show what decisions go wrong without understanding this concept. Explain what architectural reasoning it unlocks and what costly mistakes it prevents.',
    compareAgainst: 'Compare against related or competing theoretical models that address the same domain (e.g., CAP vs PACELC, eventual vs strong consistency).',
    prosConsScope: 'State what understanding this concept enables and what its real-world limitations or simplifications are.',
  },
  patterns: {
    whatFocus: 'Lead with the concrete problem this pattern solves. Then explain the solution mechanism - how it works at a structural level. If the pattern has implementation variants, name them briefly but keep the definition at the pattern level, not the variant level.',
    whyFocus: 'Show what happens without this pattern - the pain, the failure mode, the architectural debt. Then explain what it unlocks and when it is the right choice vs overkill.',
    compareAgainst: 'Compare against ALTERNATIVE patterns or approaches that solve the same class of problem. Do NOT compare internal implementation variants of this pattern against each other.',
    prosConsScope: 'State advantages and trade-offs of the pattern AS A WHOLE. Do not list pros of one variant and cons of another.',
  },
  technologies: {
    whatFocus: 'Lead with the engineering problem this technology was built to solve. Explain its core abstractions, how it works under the hood, and what makes it architecturally distinctive.',
    whyFocus: 'Explain when to reach for this technology over alternatives and what architectural capabilities it unlocks. Ground it in real system requirements.',
    compareAgainst: 'Compare against competing or complementary technologies that an architect would realistically evaluate side-by-side.',
    prosConsScope: 'State operational and architectural advantages and real gotchas engineers hit in production.',
  },
  strategies: {
    whatFocus: 'Describe the approach, how it is executed, and in what context it applies. Hook with the decision point where an architect would reach for this strategy.',
    whyFocus: 'Show what outcomes this strategy achieves and what risks it mitigates compared to doing nothing or choosing a different path.',
    compareAgainst: 'Compare against alternative strategies that address the same goal or decision point.',
    prosConsScope: 'State when this strategy pays off and what cost, complexity, or prerequisite it introduces.',
  },
  models: {
    whatFocus: 'Describe the paradigm, how it structures communication or computation, and its defining characteristics. Hook with a system shape this model enables.',
    whyFocus: 'Explain what system properties this model optimizes for and when it fits vs when another paradigm is a better match.',
    compareAgainst: 'Compare against alternative architectural paradigms that serve a similar purpose or that architects commonly weigh against this one.',
    prosConsScope: 'State what system qualities this model provides and what constraints or complexity it introduces.',
  },
  frameworks: {
    whatFocus: 'Describe what the framework is, its philosophy, and its key structural components. Hook with the problem space it was designed for.',
    whyFocus: 'Explain what it gives a team in practice - what it standardizes, what decisions it removes, and when its opinions help vs hinder.',
    compareAgainst: 'Compare against competing frameworks or approaches that target the same problem space.',
    prosConsScope: 'State ecosystem strengths and real adoption costs or constraints engineers encounter.',
  },
  protocols: {
    whatFocus: 'Describe what the protocol specifies, how it works (key handshakes, flows, message structures), and what problem it standardizes.',
    whyFocus: 'Explain what communication or security problem it solves and why standardization matters here. Show what breaks without it.',
    compareAgainst: 'Compare against competing or predecessor protocols that address the same communication needs.',
    prosConsScope: 'State standardization benefits and real-world implementation complexity, compatibility issues, or security limitations.',
  },
  practices: {
    whatFocus: 'Describe the practice, its core principles, and how it is implemented in a team or system. Hook with the quality or reliability problem it addresses.',
    whyFocus: 'Show what degrades without this practice and what measurable improvements it brings when adopted correctly.',
    compareAgainst: 'Compare against alternative practices or approaches that address the same quality/operational concern.',
    prosConsScope: 'State what it concretely improves and what adoption cost, cultural shift, or tooling requirement it demands.',
  },
  methodologies: {
    whatFocus: 'Describe the methodology, its phases or components, and its guiding philosophy. Hook with the organizational or design problem it tackles.',
    whyFocus: 'Explain what organizational or architectural dysfunction it addresses and what teams gain from adopting it.',
    compareAgainst: 'Compare against alternative methodologies or lighter-weight approaches that target the same domain.',
    prosConsScope: 'State what it improves at the team/org level and what adoption barriers, prerequisites, or overhead it introduces.',
  },
  architectures: {
    whatFocus: 'Describe the architectural style, its defining structural characteristics, and how components interact. Hook with the system shape or scale that calls for this architecture.',
    whyFocus: 'Explain what system properties it optimizes for (scalability, independence, latency) and what types of systems benefit most.',
    compareAgainst: 'Compare against alternative architectural styles that an architect would realistically choose between for a given system.',
    prosConsScope: 'State what system qualities it enables and what operational complexity, cost, or constraints it introduces.',
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

function formatContentGuidanceForType(topicType: TopicType): string {
  const g = TOPIC_CONTENT_GUIDANCE[topicType];
  return `TYPE-SPECIFIC GUIDANCE (${topicType}):
- "what": ${g.whatFocus}
- "why": ${g.whyFocus}
- Pros/Cons: ${g.prosConsScope}
- Comparisons: ${g.compareAgainst}`;
}

function formatAllContentGuidance(): string {
  return Object.entries(TOPIC_CONTENT_GUIDANCE)
    .map(([type, g]) => `${type}:
  - "what": ${g.whatFocus}
  - "why": ${g.whyFocus}
  - Pros/Cons: ${g.prosConsScope}
  - Comparisons: ${g.compareAgainst}`)
    .join('\n');
}

export const promptTemplates = {
  generateTopic: (
    mode: 'surprise' | 'guided',
    alreadyDiscovered: string[],
    dismissed: string[],
    constraints?: GenerateTopicConstraints
  ): { system: string; user: string } => {
    const typeSpecificGuidance = mode === 'guided' && constraints
      ? formatContentGuidanceForType(constraints.topicType)
      : `CONTENT GUIDANCE BY TOPIC TYPE (use the section matching your chosen topicType):\n${formatAllContentGuidance()}`;

    const system = `You are a software architecture mentor helping senior engineers expand their breadth of architectural knowledge.

AUDIENCE:
Experienced engineers who build and ship software daily. They are technically sharp but growing into architecture roles. They don't need basics explained - they need to quickly grasp new concepts, see how they connect to what they already know, and understand when and why to apply them.

WRITING STYLE:
- Open every explanation with a hook: a relatable scenario, a real-world consequence, or a crisp analogy that makes the reader immediately see why this matters. The hook must be factually accurate - never exaggerate or oversimplify to create surprise.
- Write like you're explaining to a smart colleague over a whiteboard, not writing documentation. Be conversational and direct.
- Ground abstractions in concrete examples - name real systems, real scenarios, real trade-offs.
- Use analogies from the reader's existing engineering experience to build intuition, but never let an analogy substitute for or contradict the precise technical definition. If the analogy is imperfect, say where it breaks down.
- Use short sentences for sharp points. Use longer sentences only when nuance demands it.
- Never use passive voice when active voice works. Never open with "This involves..." or "It should be noted..."
- Illuminate non-obvious connections and trade-offs. State important distinctions even if they seem obvious - precision matters more than brevity.
- Make every paragraph earn its place. If a sentence doesn't teach something or change how the reader thinks, cut it.

FORMATTING:
- Use only standard ASCII characters. Do not use em dashes, en dashes, curly quotes, or other special Unicode punctuation.

STRUCTURAL RULES:
- "what" and "why" must cover distinct ground. "what" defines what the topic IS and HOW it works. "why" argues for its importance, when to use it, and what problems it solves. Do not repeat the same points across both fields.
- When a topic has implementation variants (e.g., a pattern with choreography vs orchestration, a strategy with eager vs lazy approaches), briefly name the variants in "what" but keep all other fields (pros, cons, comparisons) at the topic level, not variant level.
- Every claim in "what" must be accurate for the topic as a whole. Do not state properties of one variant as if they are universal to the entire topic.
- Pros and cons must describe the topic AS A WHOLE - not individual flavors or sub-implementations.
- Each comparison must be against a DIFFERENT topic that solves a similar problem or serves a similar role. Never compare internal variants of the topic against each other. The reader should come away knowing when to pick this topic vs the alternative.

CONTENT GUIDELINES:
- "what" field: 2 paragraphs. Hook first (scenario, analogy, or surprising fact). Then define what it is and how it works with concrete examples. Never open with a dictionary-style definition.
- "why" field: 2 paragraphs. Start from a real problem (what goes wrong without this, or what decision this unlocks). Then explain why this is the right tool. Make the stakes tangible.
- Each pro must be one concrete sentence. Be specific about WHEN and WHERE the benefit shows up.
- Each con must be one honest sentence about a real gotcha engineers actually hit. Not an abstract limitation.
- Each comparison: name a specific alternative topic, then write 3-4 sentences explaining when you would pick one over the other. Focus on the decision criteria, not just listing differences.

${typeSpecificGuidance}

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
