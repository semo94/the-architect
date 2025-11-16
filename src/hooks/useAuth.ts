import { useAppStore } from '@/store/useAppStore';
import { authService } from '@/services/authService';

export function useAuth() {
  const user = useAppStore((state) => state.user);
  const isAuthenticated = useAppStore((state) => state.isAuthenticated);
  const isAuthLoading = useAppStore((state) => state.isAuthLoading);
  const authError = useAppStore((state) => state.authError);
  const setUser = useAppStore((state) => state.setUser);
  const setAuthLoading = useAppStore((state) => state.setAuthLoading);
  const setAuthError = useAppStore((state) => state.setAuthError);
  const checkSession = useAppStore((state) => state.checkSession);
  const logout = useAppStore((state) => state.logout);

  const login = async () => {
    try {
      setAuthLoading(true);
      setAuthError(null);

      await authService.loginWithGitHub();

      // Note: For mobile, user will be set via deep link handler
      // For web, we'll check session after redirect
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Login failed');
      setAuthLoading(false);
    }
  };

  return {
    user,
    isAuthenticated,
    isAuthLoading,
    authError,
    login,
    logout,
    checkSession,
    setAuthError,
  };
}
