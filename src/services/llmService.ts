import Constants from 'expo-constants';
import { z } from 'zod';
import { QuizQuestion, Technology } from '../types';

// LLM Provider types
type LLMProvider = 'anthropic' | 'openai' | 'custom';

interface LLMConfig {
  provider: LLMProvider;
  apiKey: string;
  apiUrl: string;
  model: string;
}

interface LLMMessage {
  role: 'user' | 'assistant';
  content: string;
}

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

class LLMService {
  private config: LLMConfig;

  constructor() {
    const provider = (Constants.expoConfig?.extra?.llmProvider || 'anthropic') as LLMProvider;
    const apiKey = Constants.expoConfig?.extra?.llmApiKey;
    const apiUrl = Constants.expoConfig?.extra?.llmApiUrl;
    const model = Constants.expoConfig?.extra?.llmModel;

    if (!apiKey) {
      throw new Error('LLM API key not configured');
    }

    this.config = {
      provider,
      apiKey,
      apiUrl,
      model,
    };
  }

  /**
   * Extracts JSON from LLM response text that may contain markdown code blocks
   */
  private extractJSON(text: string): any {
    // Remove markdown code block markers if present
    let cleanedText = text.trim();

    // Check for ```json ... ``` format
    const jsonBlockMatch = cleanedText.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonBlockMatch) {
      cleanedText = jsonBlockMatch[1].trim();
    } else {
      // Check for ``` ... ``` format
      const codeBlockMatch = cleanedText.match(/```\s*([\s\S]*?)\s*```/);
      if (codeBlockMatch) {
        cleanedText = codeBlockMatch[1].trim();
      }
    }

    try {
      return JSON.parse(cleanedText);
    } catch (error) {
      throw new Error(`Failed to parse LLM response as JSON: ${error instanceof Error ? error.message : 'Unknown error'}\n\nResponse text:\n${text}`);
    }
  }

  /**
   * Makes API call based on configured provider
   */
  private async callLLM(prompt: string): Promise<any> {
    const message: LLMMessage = {
      role: 'user',
      content: prompt,
    };

    let response: Response;

    switch (this.config.provider) {
      case 'anthropic':
        response = await this.callAnthropic([message]);
        break;
      case 'openai':
        response = await this.callOpenAI([message]);
        break;
      case 'custom':
        response = await this.callCustomProvider([message]);
        break;
      default:
        throw new Error(`Unsupported LLM provider: ${this.config.provider}`);
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`LLM API error: ${response.statusText}\n${errorText}`);
    }

    const data = await response.json();
    const textContent = this.extractTextContent(data);
    return this.extractJSON(textContent);
  }

  /**
   * Anthropic/Claude API implementation
   */
  private async callAnthropic(messages: LLMMessage[]): Promise<Response> {
    return fetch(this.config.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.config.model,
        max_tokens: 4000,
        messages,
        temperature: 0.7,
      }),
    });
  }

  /**
   * OpenAI API implementation
   */
  private async callOpenAI(messages: LLMMessage[]): Promise<Response> {
    return fetch(this.config.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model,
        messages,
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });
  }

  /**
   * Custom provider implementation (follows OpenAI-like format)
   */
  private async callCustomProvider(messages: LLMMessage[]): Promise<Response> {
    return fetch(this.config.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model,
        messages,
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });
  }

  /**
   * Extracts text content from provider-specific response format
   */
  private extractTextContent(data: any): string {
    switch (this.config.provider) {
      case 'anthropic':
        // Anthropic format: { content: [{ type: "text", text: "..." }] }
        if (data.content && Array.isArray(data.content) && data.content[0]?.text) {
          return data.content[0].text;
        }
        break;
      case 'openai':
        // OpenAI format: { choices: [{ message: { content: "..." } }] }
        if (data.choices && Array.isArray(data.choices) && data.choices[0]?.message?.content) {
          return data.choices[0].message.content;
        }
        break;
      case 'custom':
        // Try both formats
        if (data.content && Array.isArray(data.content) && data.content[0]?.text) {
          return data.content[0].text;
        }
        if (data.choices && Array.isArray(data.choices) && data.choices[0]?.message?.content) {
          return data.choices[0].message.content;
        }
        break;
    }

    throw new Error(`Unable to extract text content from ${this.config.provider} response format`);
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
- Return ONLY valid JSON without markdown code blocks

Generate the technology content now:`;

    const result = await this.callLLM(prompt);
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

IMPORTANT:
- Return ONLY valid JSON without markdown code blocks

Generate the most relevant technology content now:`;

    const result = await this.callLLM(prompt);
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

IMPORTANT:
- Return ONLY valid JSON without markdown code blocks

Generate the question now:`;

    return await this.callLLM(prompt);
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

IMPORTANT:
- Return ONLY valid JSON without markdown code blocks

Generate the quiz questions now:`;

    const result = await this.callLLM(prompt);
    const validated = QuizQuestionsSchema.parse(result);
    return validated.questions;
  }

  private generateId(): string {
    return `tech-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

export default new LLMService();