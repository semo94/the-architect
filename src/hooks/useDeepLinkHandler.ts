import { useEffect } from 'react';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { authService } from '@/services/authService';
import { useAppStore } from '@/store/useAppStore';

export function useDeepLinkHandler() {
  const router = useRouter();
  const setUser = useAppStore((state) => state.setUser);
  const setAuthLoading = useAppStore((state) => state.setAuthLoading);
  const setAuthError = useAppStore((state) => state.setAuthError);

  useEffect(() => {
    const handleUrl = async ({ url }: { url: string }) => {
      // Check if this is an auth callback
      if (url.includes('/auth/callback')) {
        try {
          setAuthLoading(true);

          // Extract tokens from URL fragment
          const tokens = (authService as any).extractTokensFromFragment(url);

          // Store tokens
          await (authService as any).storeTokens(tokens);

          // Fetch user session
          const user = await (authService as any).fetchAndStoreUserSession(tokens.accessToken);

          // Update state
          setUser(user);
          setAuthLoading(false);

          // Navigate to main app
          router.replace('/(tabs)/discover');
        } catch (error) {
          setAuthError(error instanceof Error ? error.message : 'Authentication failed');
          setAuthLoading(false);
          router.replace('/(auth)/login');
        }
      }
    };

    // Listen for deep link events
    const subscription = Linking.addEventListener('url', handleUrl);

    // Check if app was opened via deep link
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleUrl({ url });
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);
}
