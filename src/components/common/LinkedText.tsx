import React from 'react';
import { Text, type TextStyle } from 'react-native';

interface LinkedTextProps {
  text: string;
  style?: TextStyle | TextStyle[];
  getLinkVariant?: (name: string) => 'owned' | 'discoverable';
  onTopicPress?: (name: string) => void;
  /**
   * Name of the topic this text belongs to. Markers matching this name
   * (case-insensitive) are rendered as plain text — self-references never
   * become clickable links. Optional; when omitted, no self filtering occurs.
   */
  selfName?: string;
  /**
   * Additional names whose markers should be rendered as plain text within
   * this render (case-insensitive). Use when a sibling render already shows
   * the same name as a link and a duplicate link in this text would clutter
   * the UI — e.g. the comparison body suppressing the comparison heading's
   * entity. Optional.
   */
  suppressNames?: string[];
}

const MARKER_REGEX = /\[\[([^\]]+)\]\]/g;

/**
 * Renders text with optional `[[marker]]` support.
 *
 * - Without `getLinkVariant`: strips markers to plain text.
 * - With `getLinkVariant`: renders tappable inline spans for each marker.
 *   - Self-references (markers matching `selfName`) render as plain text.
 *   - Markers matching `suppressNames` also render as plain text (used to
 *     prevent duplicate links across sibling renders within one section).
 *   - Within a single render, only the FIRST occurrence of each unique name
 *     becomes clickable; subsequent occurrences render as plain text to keep
 *     dense paragraphs readable.
 *   - Unclosed `[[` brackets are treated as plain text.
 */
export const LinkedText: React.FC<LinkedTextProps> = ({
  text,
  style,
  getLinkVariant,
  onTopicPress,
  selfName,
  suppressNames,
}) => {
  if (!getLinkVariant) {
    return <Text style={style}>{text.replace(MARKER_REGEX, '$1')}</Text>;
  }

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  const selfLower = selfName?.toLowerCase();
  const suppressLower = new Set(
    (suppressNames ?? []).map((n) => n.trim().toLowerCase())
  );
  const seenLinkedNames = new Set<string>();

  MARKER_REGEX.lastIndex = 0;
  while ((match = MARKER_REGEX.exec(text)) !== null) {
    const [fullMatch, name] = match;
    const start = match.index;
    const nameLower = name.trim().toLowerCase();

    if (start > lastIndex) {
      parts.push(text.slice(lastIndex, start));
    }

    const isSelfReference = selfLower !== undefined && nameLower === selfLower;
    const isSuppressed = suppressLower.has(nameLower);
    const isRepeatInSameField = seenLinkedNames.has(nameLower);

    if (isSelfReference || isSuppressed || isRepeatInSameField) {
      parts.push(name);
    } else {
      seenLinkedNames.add(nameLower);
      const variant = getLinkVariant(name);
      const isOwned = variant === 'owned';

      parts.push(
        <Text
          key={`link-${start}`}
          onPress={() => onTopicPress?.(name)}
          style={{
            color: isOwned ? '#6B7AFF' : '#10B981',
            textDecorationLine: 'underline',
            textDecorationColor: isOwned ? '#6B7AFF' : '#10B981',
          }}
        >
          {isOwned ? name : `+ ${name}`}
        </Text>
      );
    }

    lastIndex = start + fullMatch.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return <Text style={style}>{parts}</Text>;
};

export default LinkedText;
