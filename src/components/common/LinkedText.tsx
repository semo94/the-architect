import React from 'react';
import { Text, type TextStyle } from 'react-native';

interface LinkedTextProps {
  text: string;
  style?: TextStyle | TextStyle[];
  getLinkVariant?: (name: string) => 'owned' | 'discoverable';
  onTopicPress?: (name: string) => void;
}

const MARKER_REGEX = /\[\[([^\]]+)\]\]/g;

/**
 * Renders text with optional `[[marker]]` support.
 *
 * - Without `getLinkVariant`: strips markers to plain text.
 * - With `getLinkVariant`: renders tappable inline spans for each marker.
 *   Unclosed `[[` brackets are treated as plain text.
 */
export const LinkedText: React.FC<LinkedTextProps> = ({ text, style, getLinkVariant, onTopicPress }) => {
  if (!getLinkVariant) {
    return <Text style={style}>{text.replace(MARKER_REGEX, '$1')}</Text>;
  }

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  MARKER_REGEX.lastIndex = 0;
  while ((match = MARKER_REGEX.exec(text)) !== null) {
    const [fullMatch, name] = match;
    const start = match.index;

    if (start > lastIndex) {
      parts.push(text.slice(lastIndex, start));
    }

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

    lastIndex = start + fullMatch.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return <Text style={style}>{parts}</Text>;
};

export default LinkedText;
