import { useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { useAuth } from './useAuth';

/**
 * Hook to protect routes - redirects to login if not authenticated
 */
export function useRequireAuth() {
  const { isAuthenticated, isAuthLoading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

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

  return { isAuthenticated, isAuthLoading };
}
