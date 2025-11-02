import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { useSearchBarStyles } from './topicsStyles';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  resultCount?: number;
  totalCount?: number;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChangeText,
  resultCount,
  totalCount,
}) => {
  const { colors } = useTheme();
  const styles = useSearchBarStyles();

  const showResultCount =
    resultCount !== undefined && totalCount !== undefined && value.length > 0;

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <Ionicons
          name="search-outline"
          size={20}
          color={colors.textSecondary}
          style={styles.icon}
        />
        <TextInput
          style={styles.input}
          placeholder="Search by name, category, or type..."
          placeholderTextColor={colors.textSecondary}
          value={value}
          onChangeText={onChangeText}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
        {value.length > 0 && (
          <Pressable style={styles.clearButton} onPress={() => onChangeText('')}>
            <Ionicons
              name="close-circle"
              size={20}
              color={colors.textSecondary}
            />
          </Pressable>
        )}
      </View>
      {showResultCount && (
        <Text style={styles.resultCount}>
          Showing {resultCount} of {totalCount} topics
        </Text>
      )}
    </View>
  );
};
