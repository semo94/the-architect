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

OUTPUT FORMAT (JSON):
{
  "name": "Technology Name",
  "category": "Top-Level Domain",
  "subcategory": "Specific Subcategory",
  "content": {
    "what": "2-3 paragraphs explaining core concepts and how it works",
    "why": "2-3 paragraphs on when/why architects use this, key use cases",
    "pros": [
      "Specific advantage 1 with architectural context",
      "Specific advantage 2 with architectural context",
      "Specific advantage 3 with architectural context",
      "Specific advantage 4 with architectural context",
      "Specific advantage 5 with architectural context"
    ],
    "cons": [
      "Specific limitation 1 with trade-offs",
      "Specific limitation 2 with trade-offs",
      "Specific limitation 3 with trade-offs",
      "Specific limitation 4 with trade-offs",
      "Specific limitation 5 with trade-offs"
    ],
    "compareToSimilar": [
      {
        "technology": "Similar Tech 1",
        "comparison": "2-3 sentences on key distinctions and when to choose which"
      },
      {
        "technology": "Similar Tech 2",
        "comparison": "2-3 sentences highlighting trade-offs"
      }
    ]
  }
}

IMPORTANT:
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

OUTPUT FORMAT (JSON):
{
  "name": "Technology Name",
  "category": "Top-Level Domain",
  "subcategory": "Specific Subcategory",
  "content": {
    "what": "2-3 paragraphs explaining core concepts and how it works",
    "why": "2-3 paragraphs on when/why architects use this, key use cases",
    "pros": [
      "Specific advantage 1 with architectural context",
      "Specific advantage 2 with architectural context",
      "Specific advantage 3 with architectural context",
      "Specific advantage 4 with architectural context",
      "Specific advantage 5 with architectural context"
    ],
    "cons": [
      "Specific limitation 1 with trade-offs",
      "Specific limitation 2 with trade-offs",
      "Specific limitation 3 with trade-offs",
      "Specific limitation 4 with trade-offs",
      "Specific limitation 5 with trade-offs"
    ],
    "compareToSimilar": [
      {
        "technology": "Similar Tech 1",
        "comparison": "2-3 sentences on key distinctions and when to choose which"
      },
      {
        "technology": "Similar Tech 2",
        "comparison": "2-3 sentences highlighting trade-offs"
      }
    ]
  }
}

IMPORTANT:
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

OUTPUT FORMAT (JSON):
{
  "question": "Your conversational question here",
  "options": ["Option 1", "Option 2", "Option 3", "Option 4"]
}

IMPORTANT:
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
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "explanation": "Brief explanation of why this answer is correct"
    },
    // ... 3 more questions
  ]
}

IMPORTANT:
- Return ONLY valid JSON without markdown code blocks

Generate the quiz questions now:`,
};
