import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider as NavigationThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { DarkColors, LightColors } from "@/styles/globalStyles";

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const colors = colorScheme === "dark" ? DarkColors : LightColors;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
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
                  headerStyle: { backgroundColor: colors.primary },
                  headerTintColor: colors.white,
                  headerTitleStyle: { fontWeight: "bold" },
                }}
              />
              <Stack.Screen
                name="discover-surprise"
                options={{
                  presentation: "card",
                  title: "Surprise Me",
                  headerStyle: { backgroundColor: colors.primary },
                  headerTintColor: colors.white,
                  headerTitleStyle: { fontWeight: "bold" },
                }}
              />
              <Stack.Screen
                name="discover-guided"
                options={{
                  presentation: "card",
                  title: "Guide Me",
                  headerStyle: { backgroundColor: colors.primary },
                  headerTintColor: colors.white,
                  headerTitleStyle: { fontWeight: "bold" },
                }}
              />
              <Stack.Screen
                name="technology-detail"
                options={{
                  presentation: "card",
                  title: "Technology Details",
                  headerStyle: { backgroundColor: colors.primary },
                  headerTintColor: colors.white,
                  headerTitleStyle: { fontWeight: "bold" },
                }}
              />
            </Stack>
            <StatusBar style="auto" />
          </NavigationThemeProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
