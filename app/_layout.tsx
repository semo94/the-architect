import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider as NavigationThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { ThemeProvider } from "@/contexts/ThemeContext";

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <NavigationThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
          <Stack>
            <Stack.Screen
              name="(tabs)"
              options={{
                title: "Home",
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="quiz"
              options={{
                presentation: "card",
                title: "Test Your Knowledge",
                headerStyle: { backgroundColor: colorScheme === "dark" ? "#66BB6A" : "#4CAF50" },
                headerTintColor: "#fff",
                headerTitleStyle: { fontWeight: "bold" },
              }}
            />
          </Stack>
          <StatusBar style="auto" />
        </NavigationThemeProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
