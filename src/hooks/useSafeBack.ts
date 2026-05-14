import { useRouter, type Href } from 'expo-router';
import { useCallback } from 'react';

/**
 * Returns a back handler that is safe across all entry points, including
 * cold-start deep links where the stack has no parent screen.
 *
 * - If the router has a previous screen, pops the stack.
 * - Otherwise, replaces the current screen with `fallback` so the user is
 *   never stranded on a single-screen stack with no way back into the app.
 *
 * The fallback defaults to the Discover tab — the canonical home for an
 * authenticated user re-entering the app via a deep link.
 */
export function useSafeBack(fallback: Href = '/(tabs)/discover') {
  const router = useRouter();

  return useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(fallback);
    }
  }, [router, fallback]);
}
