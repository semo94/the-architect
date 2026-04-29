import { AuthLoadingOverlay } from "@/components/auth/AuthLoadingOverlay";
import { ToastNotification } from "@/components/common/ToastNotification";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider as NavigationThemeProvider,
} from "@react-navigation/native";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useRef } from "react";
import { AppState, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ThemeProvider } from "@/contexts/ThemeContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAppStore } from "@/store/useAppStore";
import { DarkColors, LightColors } from "@/styles/globalStyles";

export default function RootLayout() {
  const { colorScheme } = useColorScheme();
  const colors = colorScheme === "dark" ? DarkColors : LightColors;
  const router = useRouter();
  const segments = useSegments();

  const isAuthenticated = useAppStore((state) => state.isAuthenticated);
  const isAuthLoading = useAppStore((state) => state.isAuthLoading);
  const checkSession = useAppStore((state) => state.checkSession);
  const globalError = useAppStore((state) => state.globalError);
  const clearGlobalError = useAppStore((state) => state.clearGlobalError);
  const inAuthGroup = segments[0] === "(auth)";

  const handleErrorDismiss = useCallback(() => {
    clearGlobalError();
  }, [clearGlobalError]);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  const appStateRef = useRef(AppState.currentState);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        checkSession(true);
      }
      appStateRef.current = nextAppState;
    });
    return () => subscription.remove();
  }, [checkSession]);

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    if (!isAuthenticated && !inAuthGroup) {
      router.replace("/(auth)/login");
      return;
    }

    if (isAuthenticated && inAuthGroup) {
      router.replace("/(tabs)/discover");
    }
  }, [inAuthGroup, isAuthenticated, isAuthLoading, router]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <NavigationThemeProvider
            value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
          >
            <View style={{ flex: 1 }}>
              <Stack>
                <Stack.Screen
                  name="(auth)"
                  options={{
                    headerShown: false,
                  }}
                />
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
                    headerStyle: { backgroundColor: colorScheme === "dark" ? colors.cardBackground : colors.primary },
                    headerTintColor: colorScheme === "dark" ? colors.text : colors.white,
                    headerTitleStyle: { fontWeight: "bold" },
                  }}
                />
                <Stack.Screen
                  name="discover-surprise"
                  options={{
                    presentation: "card",
                    title: "Surprise Me",
                    headerStyle: { backgroundColor: colorScheme === "dark" ? colors.cardBackground : colors.primary },
                    headerTintColor: colorScheme === "dark" ? colors.text : colors.white,
                    headerTitleStyle: { fontWeight: "bold" },
                  }}
                />
                <Stack.Screen
                  name="discover-guided"
                  options={{
                    presentation: "card",
                    title: "Guide Me",
                    headerStyle: { backgroundColor: colorScheme === "dark" ? colors.cardBackground : colors.primary },
                    headerTintColor: colorScheme === "dark" ? colors.text : colors.white,
                    headerTitleStyle: { fontWeight: "bold" },
                  }}
                />
                <Stack.Screen
                  name="topic-detail"
                  options={{
                    presentation: "card",
                    title: "Topic Details",
                    headerStyle: { backgroundColor: colorScheme === "dark" ? colors.cardBackground : colors.primary },
                    headerTintColor: colorScheme === "dark" ? colors.text : colors.white,
                    headerTitleStyle: { fontWeight: "bold" },
                  }}
                />
              </Stack>
              {isAuthLoading && !inAuthGroup && (
                <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
                  <AuthLoadingOverlay message="Checking session..." />
                </View>
              )}
            </View>
            <ToastNotification
              message={globalError ?? ''}
              visible={!!globalError}
              onDismiss={handleErrorDismiss}
              duration={5000}
              bottomOffset={0}
            />
            <StatusBar style="auto" />
          </NavigationThemeProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
