import { Technology } from "@/types";

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
 * Parse streaming JSON and extract as much valid data as possible
 */
export function parseStreamingJson(streamText: string): Partial<Technology> {
  const result: Partial<Technology> = {};

  // Extract JSON from markdown if present
  const jsonText = extractJsonText(streamText);

  // Try parsing the raw JSON first
  try {
    const parsed = JSON.parse(jsonText);
    return parsed as Partial<Technology>;
  } catch {
    // JSON is incomplete, try to extract what we can
  }

  // Try to fix and parse incomplete JSON
  try {
    const fixed = attemptJsonFix(jsonText);
    const parsed = JSON.parse(fixed);
    return parsed as Partial<Technology>;
  } catch {
    // Still can't parse, extract field by field
  }

  // Extract individual fields using regex
  // Name
  const nameMatch = jsonText.match(/"name"\s*:\s*"([^"]+)"/);
  if (nameMatch) {
    result.name = nameMatch[1];
  }

  // Category
  const categoryMatch = jsonText.match(/"category"\s*:\s*"([^"]+)"/);
  if (categoryMatch) {
    result.category = categoryMatch[1];
  }

  // Subcategory
  const subcategoryMatch = jsonText.match(/"subcategory"\s*:\s*"([^"]+)"/);
  if (subcategoryMatch) {
    result.subcategory = subcategoryMatch[1];
  }

  // Content object
  result.content = {
    what: '',
    why: '',
    pros: [],
    cons: [],
    compareToSimilar: [],
  };

  // What
  const whatMatch = jsonText.match(/"what"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  if (whatMatch) {
    result.content.what = whatMatch[1].replace(/\\"/g, '"').replace(/\\n/g, '\n');
  }

  // Why
  const whyMatch = jsonText.match(/"why"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  if (whyMatch) {
    result.content.why = whyMatch[1].replace(/\\"/g, '"').replace(/\\n/g, '\n');
  }

  // Pros array
  const prosMatch = jsonText.match(/"pros"\s*:\s*\[([\s\S]*?)\]/);
  if (prosMatch) {
    const prosText = prosMatch[1];
    const pros: string[] = [];
    const proMatches = prosText.matchAll(/"((?:[^"\\]|\\.)*)"/g);
    for (const match of proMatches) {
      pros.push(match[1].replace(/\\"/g, '"').replace(/\\n/g, '\n'));
    }
    if (pros.length > 0) {
      result.content.pros = pros;
    }
  }

  // Cons array
  const consMatch = jsonText.match(/"cons"\s*:\s*\[([\s\S]*?)\]/);
  if (consMatch) {
    const consText = consMatch[1];
    const cons: string[] = [];
    const conMatches = consText.matchAll(/"((?:[^"\\]|\\.)*)"/g);
    for (const match of conMatches) {
      cons.push(match[1].replace(/\\"/g, '"').replace(/\\n/g, '\n'));
    }
    if (cons.length > 0) {
      result.content.cons = cons;
    }
  }

  // CompareToSimilar array
  const compareMatch = jsonText.match(/"compareToSimilar"\s*:\s*\[([\s\S]*?)(\]|$)/);
  if (compareMatch) {
    const compareText = compareMatch[1];
    const comparisons: { technology: string; comparison: string }[] = [];

    // Match individual comparison objects
    const comparisonMatches = compareText.matchAll(/\{\s*"technology"\s*:\s*"([^"]+)"\s*,\s*"comparison"\s*:\s*"((?:[^"\\]|\\.)*)"\s*\}/g);
    for (const match of comparisonMatches) {
      comparisons.push({
        technology: match[1],
        comparison: match[2].replace(/\\"/g, '"').replace(/\\n/g, '\n'),
      });
    }

    if (comparisons.length > 0) {
      result.content.compareToSimilar = comparisons;
    }
  }

  return result;
}

/**
 * Check if we have enough data to show the technology card
 */
export function hasMinimumData(partial: Partial<Technology>): boolean {
  return !!(partial.name && partial.category);
}

/**
 * Check if a specific section has data
 */
export function hasSectionData(partial: Partial<Technology>, section: string): boolean {
  switch (section) {
    case 'header':
      return !!(partial.name && partial.category);
    case 'what':
      return !!(partial.content?.what);
    case 'why':
      return !!(partial.content?.why);
    case 'pros':
      return !!(partial.content?.pros && partial.content.pros.length > 0);
    case 'cons':
      return !!(partial.content?.cons && partial.content.cons.length > 0);
    case 'compare':
      return !!(partial.content?.compareToSimilar && partial.content.compareToSimilar.length > 0);
    default:
      return false;
  }
}
