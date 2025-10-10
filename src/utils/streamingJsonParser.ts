import { Technology } from "@/types";
import { parseStreamingJson as parseGeneric, extractStringField, extractStringArray } from "./streamingParser";

/**
 * Parse streaming JSON for Technology objects with Technology-specific field extraction
 */
export function parseStreamingJson(streamText: string): Partial<Technology> {
  // First try generic parsing
  const genericResult = parseGeneric<Technology>(streamText);

  // If generic parsing succeeded with content, return it
  if (genericResult.content) {
    return genericResult;
  }

  // Otherwise, manually extract Technology-specific fields
  const result: Partial<Technology> = { ...genericResult };
  const jsonText = streamText.trim();

  // Use generic extractors for simple fields
  if (!result.name) {
    result.name = extractStringField(jsonText, 'name');
  }
  if (!result.category) {
    result.category = extractStringField(jsonText, 'category');
  }
  if (!result.subcategory) {
    result.subcategory = extractStringField(jsonText, 'subcategory');
  }

  // Content object - initialize if not present
  if (!result.content) {
    result.content = {
      what: '',
      why: '',
      pros: [],
      cons: [],
      compareToSimilar: [],
    };
  }

  // Extract content fields
  if (!result.content.what) {
    result.content.what = extractStringField(jsonText, 'what') || '';
  }
  if (!result.content.why) {
    result.content.why = extractStringField(jsonText, 'why') || '';
  }
  if (result.content.pros.length === 0) {
    result.content.pros = extractStringArray(jsonText, 'pros');
  }
  if (result.content.cons.length === 0) {
    result.content.cons = extractStringArray(jsonText, 'cons');
  }

  // CompareToSimilar array - this is Technology-specific
  if (result.content.compareToSimilar.length === 0) {
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
