import { Stack } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { LightColors, DarkColors } from '@/styles/globalStyles';

export default function AuthLayout() {
  const { theme } = useTheme();
  const colors = theme === 'light' ? LightColors : DarkColors;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: colors.background,
        },
      }}
    />
  );
}
