/**
 * Generic streaming JSON parser
 * Handles incomplete JSON and extracts valid data progressively
 */

// Cache for markdown extraction to avoid repeated regex operations during streaming
let lastInputText = '';
let lastExtractedText = '';

/**
 * Extracts parseable JSON from text that may contain markdown code blocks
 * Includes caching to optimize repeated calls with same/similar input
 */
function extractJsonText(text: string): string {
  // Return cached result if input hasn't changed
  if (text === lastInputText) {
    return lastExtractedText;
  }

  let cleaned = text.trim();

  // Remove markdown code blocks
  const jsonBlockMatch = cleaned.match(/```json\s*([\s\S]*?)(\s*```)?$/);
  if (jsonBlockMatch) {
    cleaned = jsonBlockMatch[1].trim();
  } else {
    const codeBlockMatch = cleaned.match(/```\s*([\s\S]*?)(\s*```)?$/);
    if (codeBlockMatch) {
      cleaned = codeBlockMatch[1].trim();
    }
  }

  // Cache the result
  lastInputText = text;
  lastExtractedText = cleaned;

  return cleaned;
}

/**
 * Extract flat format fields progressively
 * Works for both Technology and Quiz question formats
 */
function extractFlatFields(jsonText: string): Record<string, any> {
  const result: Record<string, any> = {};

  // Extract all simple string fields
  const stringFieldMatches = jsonText.matchAll(/"([^"]+)"\s*:\s*"((?:[^"\\]|\\.)*)"/g);
  for (const match of stringFieldMatches) {
    const fieldName = match[1];
    const fieldValue = match[2].replace(/\\"/g, '"').replace(/\\n/g, '\n');
    result[fieldName] = fieldValue;
  }

  // Extract numeric fields (like correctAnswer)
  const numberFieldMatches = jsonText.matchAll(/"([^"]+)"\s*:\s*(\d+)/g);
  for (const match of numberFieldMatches) {
    const fieldName = match[1];
    const fieldValue = parseInt(match[2], 10);
    result[fieldName] = fieldValue;
  }

  return result;
}

/**
 * Extract partial question object from incomplete questions array
 * Specifically handles quiz question format during streaming
 */
function extractPartialQuestions(jsonText: string): any[] {
  // Look for "questions": [ pattern
  const arrayMatch = jsonText.match(/"questions"\s*:\s*\[/);
  if (!arrayMatch) return [];

  const questions = [];
  const startIdx = arrayMatch.index! + arrayMatch[0].length;
  const content = jsonText.substring(startIdx);

  // Extract each question object (complete or partial)
  let depth = 0;
  let currentObj = '';
  let inString = false;
  let escapeNext = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];

    if (escapeNext) {
      currentObj += char;
      escapeNext = false;
      continue;
    }

    if (char === '\\') {
      escapeNext = true;
      currentObj += char;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      currentObj += char;
      continue;
    }

    if (!inString) {
      if (char === '{') {
        depth++;
        currentObj += char;
      } else if (char === '}') {
        currentObj += char;
        depth--;

        // Complete object found
        if (depth === 0) {
          try {
            const parsed = JSON.parse(currentObj);
            questions.push(parsed);
            currentObj = '';
          } catch {
            // Skip invalid
          }
        }
      } else if (char === ']') {
        // End of array
        break;
      } else if (depth > 0) {
        currentObj += char;
      }
    } else {
      currentObj += char;
    }
  }

  // Handle incomplete last object - extract available fields
  if (currentObj.trim() && depth > 0) {
    const partialQuestion: any = {};

    // Extract available string fields
    const question = extractStringField(currentObj, 'question');
    if (question) partialQuestion.question = question;

    const option_0 = extractStringField(currentObj, 'option_0');
    if (option_0) partialQuestion.option_0 = option_0;

    const option_1 = extractStringField(currentObj, 'option_1');
    if (option_1) partialQuestion.option_1 = option_1;

    const option_2 = extractStringField(currentObj, 'option_2');
    if (option_2) partialQuestion.option_2 = option_2;

    const option_3 = extractStringField(currentObj, 'option_3');
    if (option_3) partialQuestion.option_3 = option_3;

    const explanation = extractStringField(currentObj, 'explanation');
    if (explanation) partialQuestion.explanation = explanation;

    // Extract correctAnswer number
    const correctAnswerMatch = currentObj.match(/"correctAnswer"\s*:\s*(\d+)/);
    if (correctAnswerMatch) {
      partialQuestion.correctAnswer = parseInt(correctAnswerMatch[1], 10);
    }

    // Only add if we have at least the question text
    if (partialQuestion.question) {
      questions.push(partialQuestion);
    }
  }

  return questions;
}

/**
 * Generic streaming JSON parser
 * @param streamText - Partial JSON text from streaming response
 * @returns Parsed object with whatever fields are available
 */
export function parseStreamingJson<T = any>(streamText: string): Partial<T> {
  // Extract JSON from markdown if present
  const jsonText = extractJsonText(streamText);

  // Try parsing the raw JSON first
  try {
    const parsed = JSON.parse(jsonText);
    return parsed as Partial<T>;
  } catch {
    // JSON is incomplete, try to extract what we can
  }

  // Special handling for quiz questions array
  const questions = extractPartialQuestions(jsonText);
  if (questions.length > 0) {
    return { questions } as unknown as Partial<T>;
  }

  // For flat format responses (Technology), extract available fields progressively
  const flatFields = extractFlatFields(jsonText);
  if (Object.keys(flatFields).length > 0) {
    return flatFields as Partial<T>;
  }

  // No parseable content yet
  return {};
}

/**
 * Extract a string field from partial JSON using regex
 */
export function extractStringField(jsonText: string, fieldName: string): string | undefined {
  const match = jsonText.match(new RegExp(`"${fieldName}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`, 's'));
  if (match) {
    return match[1].replace(/\\"/g, '"').replace(/\\n/g, '\n');
  }
  return undefined;
}

/**
 * Extract an array of strings from partial JSON using regex
 */
export function extractStringArray(jsonText: string, fieldName: string): string[] {
  const match = jsonText.match(new RegExp(`"${fieldName}"\\s*:\\s*\\[([\\s\\S]*?)(\\]|$)`, 's'));
  if (!match) return [];

  const arrayText = match[1];
  const items: string[] = [];
  const itemMatches = arrayText.matchAll(/"((?:[^"\\]|\\.)*)"/g);

  for (const itemMatch of itemMatches) {
    items.push(itemMatch[1].replace(/\\"/g, '"').replace(/\\n/g, '\n'));
  }

  return items;
}

/**
 * Extract an array of objects from partial JSON
 */
export function extractObjectArray<T = any>(
  jsonText: string,
  fieldName: string,
  objectPattern: RegExp
): T[] {
  const match = jsonText.match(new RegExp(`"${fieldName}"\\s*:\\s*\\[([\\s\\S]*?)(\\]|$)`, 's'));
  if (!match) return [];

  const arrayText = match[1];
  const objects: T[] = [];
  const objectMatches = arrayText.matchAll(objectPattern);

  for (const objectMatch of objectMatches) {
    try {
      const obj = JSON.parse(objectMatch[0]);
      objects.push(obj);
    } catch {
      // Skip invalid objects
    }
  }

  return objects;
}

/**
 * Check if partial data has minimum required fields
 */
export function hasMinimumFields<T extends Record<string, any>>(
  data: Partial<T>,
  requiredFields: (keyof T)[]
): boolean {
  return requiredFields.every(field => {
    const value = data[field];
    return value !== undefined && value !== null && value !== '';
  });
}

// ============================================================================
// Technology-specific helpers (migrated from streamingJsonParser)
// ============================================================================

/**
 * Check if we have enough Technology data to show the card
 */
export function hasMinimumData(partial: any): boolean {
  return !!(partial.name && partial.category);
}

/**
 * Check if a specific Technology section has data
 * Checks both flat format (streaming) and nested format (complete)
 */
export function hasSectionData(partial: any, section: string): boolean {
  switch (section) {
    case 'header':
      return !!(partial.name && partial.category);
    case 'what':
      return !!(partial.what || partial.content?.what);
    case 'why':
      return !!(partial.why || partial.content?.why);
    case 'pros':
      // Check for at least one pro field (flat format) OR nested array
      return !!(
        partial.pro_0 || partial.pro_1 || partial.pro_2 || partial.pro_3 || partial.pro_4 ||
        (partial.content?.pros && partial.content.pros.length > 0)
      );
    case 'cons':
      // Check for at least one con field (flat format) OR nested array
      return !!(
        partial.con_0 || partial.con_1 || partial.con_2 || partial.con_3 || partial.con_4 ||
        (partial.content?.cons && partial.content.cons.length > 0)
      );
    case 'compare':
      // Check for at least one comparison (flat format) OR nested array
      return !!(
        (partial.compare_0_tech && partial.compare_0_text) ||
        (partial.content?.compareToSimilar && partial.content.compareToSimilar.length > 0)
      );
    default:
      return false;
  }
}

// ============================================================================
// Guided Question helpers
// ============================================================================

/**
 * Check if we have minimum question data to start streaming
 */
export function hasMinimumQuestionData(partial: any): boolean {
  return !!partial.question;
}

/**
 * Count how many options are available in the partial data
 */
export function getAvailableOptionsCount(partial: any): number {
  const options = [
    partial.option_0,
    partial.option_1,
    partial.option_2,
    partial.option_3,
    partial.option_4,
    partial.option_5,
  ].filter(Boolean);
  return options.length;
}

