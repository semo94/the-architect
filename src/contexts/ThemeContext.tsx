import { useColorScheme, type ThemePreference } from '@/hooks/use-color-scheme';
import {
    BorderRadius,
    getColors,
    getCommonStyles,
    getShadows,
    LightColors,
    Spacing,
    Typography,
} from '@/styles/globalStyles';
import React, { createContext, ReactNode, useContext } from 'react';
import { ColorSchemeName } from 'react-native';

type ThemeColors = typeof LightColors;
type ThemeShadows = ReturnType<typeof getShadows>;
type ThemeCommonStyles = ReturnType<typeof getCommonStyles>;

interface ThemeContextType {
  colorScheme: ColorSchemeName;
  themePreference: ThemePreference;
  setThemePreference: (pref: ThemePreference) => void;
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
  const { colorScheme, themePreference, setThemePreference } = useColorScheme();
  const colors = getColors(colorScheme);
  const shadows = getShadows(colorScheme);
  const styles = getCommonStyles(colorScheme);
  const isDark = colorScheme === 'dark';

  const value: ThemeContextType = {
    colorScheme,
    themePreference,
    setThemePreference,
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
