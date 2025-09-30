import Constants from 'expo-constants';
import { z } from 'zod';
import { Technology, QuizQuestion } from '../types';

const CLAUDE_API_KEY = Constants.expoConfig?.extra?.claudeApiKey;
const CLAUDE_API_URL = Constants.expoConfig?.extra?.claudeApiUrl;
const CLAUDE_MODEL = Constants.expoConfig?.extra?.claudeModel;

// Validation schemas
const TechnologyContentSchema = z.object({
  name: z.string(),
  category: z.string(),
  subcategory: z.string(),
  content: z.object({
    what: z.string(),
    why: z.string(),
    pros: z.array(z.string()).min(4),
    cons: z.array(z.string()).min(4),
    compareToSimilar: z.array(
      z.object({
        technology: z.string(),
        comparison: z.string(),
      })
    ).min(2),
  }),
});

const QuizQuestionsSchema = z.object({
  questions: z.array(
    z.object({
      question: z.string(),
      options: z.array(z.string()).length(4),
      correctAnswer: z.number().min(0).max(3),
      explanation: z.string(),
    })
  ).length(4),
});

class ClaudeService {
  private async callClaude(prompt: string): Promise<any> {
    if (!CLAUDE_API_KEY) {
      throw new Error('Claude API key not configured');
    }

    try {
      const response = await fetch(CLAUDE_API_URL!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': CLAUDE_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: CLAUDE_MODEL,
          max_tokens: 4000,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        throw new Error(`Claude API error: ${response.statusText}`);
      }

      const data = await response.json();
      return JSON.parse(data.content[0].text);
    } catch (error) {
      console.error('Claude API call failed:', error);
      throw error;
    }
  }

  async generateSurpriseTechnology(
    alreadyDiscovered: string[],
    dismissed: string[],
    categorySchema: any
  ): Promise<Technology> {
    const prompt = `
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

Generate the technology content now:`;

    const result = await this.callClaude(prompt);
    const validated = TechnologyContentSchema.parse(result);

    return {
      id: this.generateId(),
      ...validated,
      status: 'discovered',
      discoveryMethod: 'surprise',
      discoveredAt: new Date().toISOString(),
      learnedAt: null,
    };
  }

  async generateGuidedTechnology(
    conversationHistory: any[],
    alreadyDiscovered: string[],
    categorySchema: any
  ): Promise<Technology> {
    const prompt = `
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

Generate the most relevant technology content now:`;

    const result = await this.callClaude(prompt);
    const validated = TechnologyContentSchema.parse(result);

    return {
      id: this.generateId(),
      ...validated,
      status: 'discovered',
      discoveryMethod: 'guided',
      discoveredAt: new Date().toISOString(),
      learnedAt: null,
    };
  }

  async generateGuidedQuestion(
    step: number,
    previousSelections: any[],
    categorySchema: any
  ): Promise<{ question: string; options: string[] }> {
    const prompt = `
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

Generate the question now:`;

    return await this.callClaude(prompt);
  }

  async generateQuizQuestions(
    technology: Technology
  ): Promise<QuizQuestion[]> {
    const prompt = `
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

Generate the quiz questions now:`;

    const result = await this.callClaude(prompt);
    const validated = QuizQuestionsSchema.parse(result);
    return validated.questions;
  }

  private generateId(): string {
    return `tech-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

export default new ClaudeService();