import { Topic, TopicType } from '../types';

/**
 * Prompt templates for LLM service
 * Centralized location for all prompt engineering
 */

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
  ): string => `
You are an expert software architecture mentor generating learning content.

GENERATION MODE: ${mode}

${mode === 'guided' ? `
GUIDED CONSTRAINTS:
- Category: ${constraints?.category}
- Subcategory: ${constraints?.subcategory}
- Topic Type: ${constraints?.topicType} (MUST generate this type)
- Learning Goal: ${constraints?.learningGoal}
` : `
SURPRISE MODE:
- Randomly select from the entire category schema
- Randomly select topic type from the subcategory's topicTypes array
- Ensure variety across all topic types
`}

TOPIC TYPE DEFINITIONS:
- concepts: Theoretical foundations and principles (CAP Theorem, Consistency Models)
- patterns: Reusable architectural solutions (Circuit Breaker, Saga Pattern)
- technologies: Specific tools and platforms (Redis, Kubernetes, Kafka)
- strategies: Approaches and methods (Blue-Green Deployment, Cache-Aside)
- models: Architectural paradigms (Pub/Sub, Client-Server, RBAC)
- frameworks: Structured methodologies (12-Factor App, Spring Framework)
- protocols: Standards and specifications (OAuth 2.0, HTTP/2, gRPC)
- practices: Development and operational practices (TDD, Chaos Engineering)
- methodologies: Comprehensive approaches (Domain-Driven Design, Event Storming)
- architectures: System-level designs (Microservices, Event-Driven, Serverless)

CONTEXT:
- Already discovered topics: ${JSON.stringify(alreadyDiscovered)}
- Recently dismissed: ${JSON.stringify(dismissed)}
${mode === 'surprise' ? `- Available schema: ${JSON.stringify(categorySchema)}` : ''}

SELECTION REQUIREMENTS:
${mode === 'guided' ? `
1. MUST generate a topic of type: ${constraints?.topicType}
2. Topic should be from subcategory: ${constraints?.subcategory}
3. Align with learning goal: ${constraints?.learningGoal}
4. Can use schema examples as inspiration OR generate any valid ${constraints?.topicType} in this domain
` : `
1. Randomly select a category from the schema
2. Randomly select a subcategory within that category
3. Randomly select ONE topicType from that subcategory's topicTypes array
4. Generate a topic of that specific type
`}
5. Topic name must NOT be in discovered or dismissed lists
6. Ensure topic is real, recognized, and architecturally significant

OUTPUT FORMAT (JSON - flat structure for streaming):
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

Generate the topic now:`,

  /**
   * Generate quiz questions for a topic
   */
  generateQuizQuestions: (topic: Topic): string => `
You are creating a quiz to test understanding of ${topic.name}, which is a ${topic.topicType} in ${topic.category}.

TOPIC DETAILS:
- Name: ${topic.name}
- Type: ${topic.topicType}
- Category: ${topic.category}
- Subcategory: ${topic.subcategory}
- Content: ${JSON.stringify(topic.content)}

Create 4 multiple-choice questions appropriate for this topic type.

Question guidelines by type:
- concepts: Test theoretical understanding, implications, relationships
- patterns: Test problem recognition, solution application, trade-off analysis
- technologies: Test practical knowledge, use cases, operational aspects
- strategies: Test situational application, comparison, execution
- models: Test characteristics, use cases, properties
- protocols: Test specification knowledge, compatibility, security
- practices: Test implementation understanding, benefits, challenges
- methodologies: Test philosophy, components, adoption
- architectures: Test structural understanding, characteristics, evolution
- frameworks: Test structure, philosophy, ecosystem

QUESTION DISTRIBUTION:
- 2 questions testing conceptual understanding (What/Why)
- 1 question testing practical application (When to use)
- 1 question testing trade-offs analysis (Pros/Cons)

Each question should:
- Have 4 options
- Have exactly 1 correct answer
- Include a brief explanation (2-3 sentences)
- Test architectural thinking, not trivia
- Be appropriate for the topic type

OUTPUT FORMAT (JSON):
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
    },
    // ... 3 more questions
  ]
}

IMPORTANT STREAMING REQUIREMENTS:
- Generate fields in this EXACT order: question, option_0, option_1, option_2, option_3, correctAnswer, explanation
- Complete the ENTIRE question object before starting the next question object
- This enables optimal progressive display during streaming
- Use option_0, option_1, option_2, option_3 format (not an options array)
- Return ONLY valid JSON without markdown code blocks

Generate the quiz questions now:`,
};
