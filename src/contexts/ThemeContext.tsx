import React, { createContext, useContext, ReactNode } from 'react';
import { ColorSchemeName } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  getColors,
  getShadows,
  getCommonStyles,
  LightColors,
  Spacing,
  Typography,
  BorderRadius,
} from '@/styles/globalStyles';

type ThemeColors = typeof LightColors;
type ThemeShadows = ReturnType<typeof getShadows>;
type ThemeCommonStyles = ReturnType<typeof getCommonStyles>;

interface ThemeContextType {
  colorScheme: ColorSchemeName;
  colors: ThemeColors;
  shadows: ThemeShadows;
  styles: ThemeCommonStyles;
  spacing: typeof Spacing;
  typography: typeof Typography;
  borderRadius: typeof BorderRadius;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const colorScheme = useColorScheme();
  const colors = getColors(colorScheme);
  const shadows = getShadows(colorScheme);
  const styles = getCommonStyles(colorScheme);
  const isDark = colorScheme === 'dark';

  const value: ThemeContextType = {
    colorScheme,
    colors,
    shadows,
    styles,
    spacing: Spacing,
    typography: Typography,
    borderRadius: BorderRadius,
    isDark,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
