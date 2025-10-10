/**
 * Generic streaming JSON parser
 * Handles incomplete JSON and extracts valid data progressively
 */

/**
 * Extracts parseable JSON from text that may contain markdown code blocks
 */
function extractJsonText(text: string): string {
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

  return cleaned;
}

/**
 * Attempts to fix incomplete JSON by closing open structures
 */
function attemptJsonFix(text: string): string {
  let fixed = text;

  // Count braces and brackets
  const openBraces = (fixed.match(/\{/g) || []).length;
  const closeBraces = (fixed.match(/\}/g) || []).length;
  const openBrackets = (fixed.match(/\[/g) || []).length;
  const closeBrackets = (fixed.match(/\]/g) || []).length;

  // Check if we're in the middle of a string
  const quoteCount = (fixed.match(/"/g) || []).length;
  if (quoteCount % 2 !== 0) {
    // Close the open string
    fixed += '"';
  }

  // Close open arrays
  for (let i = 0; i < openBrackets - closeBrackets; i++) {
    fixed += ']';
  }

  // Close open objects
  for (let i = 0; i < openBraces - closeBraces; i++) {
    fixed += '}';
  }

  return fixed;
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

  // Try to fix and parse incomplete JSON
  try {
    const fixed = attemptJsonFix(jsonText);
    const parsed = JSON.parse(fixed);
    return parsed as Partial<T>;
  } catch {
    // Still can't parse, return empty object
    return {};
  }
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
