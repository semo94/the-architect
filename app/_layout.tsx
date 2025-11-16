import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider as NavigationThemeProvider,
} from "@react-navigation/native";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useEffect } from "react";

import { ThemeProvider } from "@/contexts/ThemeContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { DarkColors, LightColors } from "@/styles/globalStyles";
import { useAppStore } from "@/store/useAppStore";
import { useDeepLinkHandler } from "@/hooks/useDeepLinkHandler";

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const colors = colorScheme === "dark" ? DarkColors : LightColors;
  const router = useRouter();
  const segments = useSegments();

  const isAuthenticated = useAppStore((state) => state.isAuthenticated);
  const isAuthLoading = useAppStore((state) => state.isAuthLoading);
  const checkSession = useAppStore((state) => state.checkSession);

  // Initialize deep link handler
  useDeepLinkHandler();

  // Check session on mount
  useEffect(() => {
    checkSession();
  }, []);

  // Auth guard - redirect based on auth state
  useEffect(() => {
    if (isAuthLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      // Redirect to login if not authenticated
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      // Redirect to app if already authenticated
      router.replace('/(tabs)/discover');
    }
  }, [isAuthenticated, isAuthLoading, segments]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <NavigationThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(auth)" options={{ headerShown: false }} />
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
                  headerShown: true,
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
                  headerShown: true,
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
                  headerShown: true,
                  headerStyle: { backgroundColor: colors.primary },
                  headerTintColor: colors.white,
                  headerTitleStyle: { fontWeight: "bold" },
                }}
              />
              <Stack.Screen
                name="topic-detail"
                options={{
                  presentation: "card",
                  title: "Topic Details",
                  headerShown: true,
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
