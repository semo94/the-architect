import { authService } from '@/services/authService';
import { useAppStore } from '@/store/useAppStore';
import { useShallow } from 'zustand/shallow';

export function useAuth() {
  const store = useAppStore(
    useShallow((state) => ({
      user: state.user,
      isAuthenticated: state.isAuthenticated,
      isAuthLoading: state.isAuthLoading,
      authError: state.authError,
      setUser: state.setUser,
      setAuthLoading: state.setAuthLoading,
      setAuthError: state.setAuthError,
      checkSession: state.checkSession,
      logout: state.logout,
    })),
  );

  const login = async () => {
    try {
      store.setAuthLoading(true);
      store.setAuthError(null);

      const result = await authService.loginWithGitHub();

      // Mobile returns tokens in-app. Web redirects and reloads.
      if (result) {
        const user = await authService.getCurrentUser();
        store.setUser(user);
      }

      store.setAuthLoading(false);
    } catch (error) {
      store.setAuthError(error instanceof Error ? error.message : 'Login failed');
      store.setAuthLoading(false);
    }
  };

  return { ...store, login };
}
