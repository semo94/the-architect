import type { FlatTopicContent } from './topic.schemas.js';

const MARKER_REGEX = /\[\[([^\]]+)\]\]/g;

/**
 * Strips [[Canonical Name]] markers from a string, leaving only the inner name.
 * Use before passing topic content to any prompt or plain-text context that must
 * not expose raw marker syntax (e.g. quiz generation).
 */
export function stripMarkers(text: string): string {
  return text.replace(MARKER_REGEX, '$1');
}

/**
 * Fields in FlatTopicContent that are allowed to contain [[markers]].
 * Markers found in any other field are ignored.
 */
const ALLOWED_MARKER_FIELDS: (keyof FlatTopicContent)[] = [
  'what',
  'why',
  'pro_0',
  'pro_1',
  'pro_2',
  'pro_3',
  'pro_4',
  'con_0',
  'con_1',
  'con_2',
  'con_3',
  'con_4',
  'compare_0_tech',
  'compare_1_tech',
];

/**
 * Extracts unique topic names from [[marker]] syntax in the allowed content fields
 * of a validated FlatTopicContent object. Filters out the source topic itself and
 * deduplicates by lowercased name.
 */
export function extractMentionedTopics(
  content: FlatTopicContent,
  selfName: string
): string[] {
  const seen = new Set<string>();
  const results: string[] = [];
  const selfLower = selfName.toLowerCase();

  for (const field of ALLOWED_MARKER_FIELDS) {
    const value = content[field];
    if (typeof value !== 'string') continue;

    let match: RegExpExecArray | null;
    const regex = new RegExp(MARKER_REGEX.source, 'g');
    while ((match = regex.exec(value)) !== null) {
      const name = match[1].trim();
      const lower = name.toLowerCase();
      if (lower === selfLower) continue;
      if (seen.has(lower)) continue;
      seen.add(lower);
      results.push(name);
    }
  }

  return results;
}
