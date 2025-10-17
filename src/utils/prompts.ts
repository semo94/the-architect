import { Technology } from '../types';

/**
 * Prompt templates for LLM service
 * Centralized location for all prompt engineering
 */

export const promptTemplates = {
  /**
   * Generate a surprise technology for the user to discover
   */
  generateSurpriseTechnology: (
    alreadyDiscovered: string[],
    dismissed: string[],
    categorySchema: any
  ): string => `
You are an expert software architecture mentor helping an engineer expand their technical breadth.

TASK: Generate content for ONE technology the user hasn't discovered yet.

CONTEXT:
- Already discovered: ${JSON.stringify(alreadyDiscovered)}
- Recently dismissed: ${JSON.stringify(dismissed)}
- Category schema (for reference): ${JSON.stringify(categorySchema)}

PROCESS:
1. Randomly select a domain and subcategory from the schema
2. Think of ANY real, architecturally significant technology that fits this subcategory
3. The technology can be from the schema examples OR any other legitimate technology
4. Ensure it's NOT in the discovered or dismissed lists
5. Generate comprehensive content

OUTPUT FORMAT (JSON - flat structure for optimal streaming):
{
  "name": "Technology Name",
  "category": "Top-Level Domain",
  "subcategory": "Specific Subcategory",
  "what": "2-3 paragraphs explaining core concepts and how it works",
  "why": "2-3 paragraphs on when/why architects use this, key use cases",
  "pro_0": "Specific advantage 1 with architectural context",
  "pro_1": "Specific advantage 2 with architectural context",
  "pro_2": "Specific advantage 3 with architectural context",
  "pro_3": "Specific advantage 4 with architectural context",
  "pro_4": "Specific advantage 5 with architectural context",
  "con_0": "Specific limitation 1 with trade-offs",
  "con_1": "Specific limitation 2 with trade-offs",
  "con_2": "Specific limitation 3 with trade-offs",
  "con_3": "Specific limitation 4 with trade-offs",
  "con_4": "Specific limitation 5 with trade-offs",
  "compare_0_tech": "Similar Tech 1",
  "compare_0_text": "2-3 sentences on key distinctions and when to choose which",
  "compare_1_tech": "Similar Tech 2",
  "compare_1_text": "2-3 sentences highlighting trade-offs"
}

IMPORTANT STREAMING REQUIREMENTS:
- Generate fields in this EXACT order: name, category, subcategory, what, why, pro_0 through pro_4, con_0 through con_4, compare_0_tech, compare_0_text, compare_1_tech, compare_1_text
- This flat structure enables optimal progressive display during streaming
- Technology must be real and production-grade
- Content must be substantial and architect-focused
- Comparisons should be with genuinely similar technologies
- Focus on architectural significance, not implementation details
- Return ONLY valid JSON without markdown code blocks

Generate the technology content now:`,

  /**
   * Generate a guided technology based on conversation history
   */
  generateGuidedTechnology: (
    conversationHistory: any[],
    alreadyDiscovered: string[],
    categorySchema: any
  ): string => `
You are an expert software architecture mentor helping an engineer discover relevant technologies.

TASK: Based on the user's guided selections, generate content for the MOST RELEVANT technology they haven't discovered.

USER'S JOURNEY:
${conversationHistory.map(h => `- ${h.question}: ${h.answer}`).join('\n')}

CONTEXT:
- Already discovered: ${JSON.stringify(alreadyDiscovered)}
- Category schema: ${JSON.stringify(categorySchema)}

SELECTION CRITERIA:
1. Technology must align with user's expressed interests
2. Must be novel (not in discovered list)
3. Should be the most relevant option based on their selections
4. Must be real, credible, and architecturally significant

OUTPUT FORMAT (JSON - flat structure for optimal streaming):
{
  "name": "Technology Name",
  "category": "Top-Level Domain",
  "subcategory": "Specific Subcategory",
  "what": "2-3 paragraphs explaining core concepts and how it works",
  "why": "2-3 paragraphs on when/why architects use this, key use cases",
  "pro_0": "Specific advantage 1 with architectural context",
  "pro_1": "Specific advantage 2 with architectural context",
  "pro_2": "Specific advantage 3 with architectural context",
  "pro_3": "Specific advantage 4 with architectural context",
  "pro_4": "Specific advantage 5 with architectural context",
  "con_0": "Specific limitation 1 with trade-offs",
  "con_1": "Specific limitation 2 with trade-offs",
  "con_2": "Specific limitation 3 with trade-offs",
  "con_3": "Specific limitation 4 with trade-offs",
  "con_4": "Specific limitation 5 with trade-offs",
  "compare_0_tech": "Similar Tech 1",
  "compare_0_text": "2-3 sentences on key distinctions and when to choose which",
  "compare_1_tech": "Similar Tech 2",
  "compare_1_text": "2-3 sentences highlighting trade-offs"
}

IMPORTANT STREAMING REQUIREMENTS:
- Generate fields in this EXACT order: name, category, subcategory, what, why, pro_0 through pro_4, con_0 through con_4, compare_0_tech, compare_0_text, compare_1_tech, compare_1_text
- This flat structure enables optimal progressive display during streaming
- Return ONLY valid JSON without markdown code blocks

Generate the most relevant technology content now:`,

  /**
   * Generate a guided question for the discovery flow
   */
  generateGuidedQuestion: (
    step: number,
    previousSelections: any[],
    categorySchema: any
  ): string => `
You are guiding a software engineer to discover relevant architecture technologies.

CURRENT STEP: ${step} of 3
PREVIOUS SELECTIONS: ${JSON.stringify(previousSelections)}
CATEGORY SCHEMA: ${JSON.stringify(categorySchema)}

Generate the next appropriate question with 4-6 relevant options based on the user's journey.

For step 1: Ask about general domain interest
For step 2: Narrow down within selected domain
For step 3: Get specific about their learning goal

OUTPUT FORMAT (JSON - flat structure for optimal streaming):
{
  "question": "Your conversational question here",
  "option_0": "First option text",
  "option_1": "Second option text",
  "option_2": "Third option text",
  "option_3": "Fourth option text"
}

You can include up to 6 options (option_0 through option_5) if needed.

IMPORTANT STREAMING REQUIREMENTS:
- Generate fields in this EXACT order: question, option_0, option_1, option_2, option_3, option_4, option_5
- This flat structure enables optimal progressive display during streaming
- Each option appears one-by-one as it's generated
- Return ONLY valid JSON without markdown code blocks

Generate the question now:`,

  /**
   * Generate quiz questions for a technology
   */
  generateQuizQuestions: (technology: Technology): string => `
You are creating a quiz to test understanding of ${technology.name}.

TECHNOLOGY CONTENT:
${JSON.stringify(technology.content)}

Create 4 multiple-choice questions that test architectural understanding, not memorization.

QUESTION DISTRIBUTION:
- 2 questions testing conceptual understanding (What/Why)
- 1 question testing practical application (When to use)
- 1 question testing trade-offs analysis (Pros/Cons)

Each question should:
- Have 4 options
- Have exactly 1 correct answer
- Include a brief explanation (2-3 sentences)
- Test architectural thinking, not trivia

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
