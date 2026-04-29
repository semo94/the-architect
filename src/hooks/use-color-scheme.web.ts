import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

export type ThemePreference = 'light' | 'dark' | 'system';

const STORAGE_KEY = '@breadthwise/theme_preference';

/**
 * To support static rendering, this value needs to be re-calculated on the client side for web.
 */
export function useColorScheme() {
  const systemScheme = useRNColorScheme();
  const [hasHydrated, setHasHydrated] = useState(false);
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>('system');

  useEffect(() => {
    setHasHydrated(true);
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

  const resolvedScheme = themePreference === 'system' ? systemScheme : themePreference;
  const colorScheme = hasHydrated ? resolvedScheme : 'light';

  return { colorScheme, themePreference, setThemePreference };
}
