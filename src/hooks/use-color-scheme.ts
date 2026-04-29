import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

export type ThemePreference = 'light' | 'dark' | 'system';

const STORAGE_KEY = '@breadthwise/theme_preference';

export function useColorScheme() {
  const systemScheme = useRNColorScheme();
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>('system');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        setThemePreferenceState(stored);
      }
    });
  }, []);

  const setThemePreference = (pref: ThemePreference) => {
    setThemePreferenceState(pref);
    void AsyncStorage.setItem(STORAGE_KEY, pref);
  };

  const colorScheme = themePreference === 'system' ? systemScheme : themePreference;

  return { colorScheme, themePreference, setThemePreference };
}
