import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as SecureStore from 'expo-secure-store';
import * as Linking from 'expo-linking';
import Constants from 'expo-constants';

// Types
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface User {
  id: string;
  githubId: string;
  username: string;
  displayName: string | null;
  email: string | null;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SessionResponse {
  user: User;
  expiresAt: string; // ISO 8601 timestamp
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}

export class AuthError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code: string
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

// Constants
const API_URL = Constants.expoConfig?.extra?.backendUrl || 'http://localhost:3000';
const DEEP_LINK_SCHEME = 'breadthwise://';

// Storage keys
const STORAGE_KEYS = {
  ACCESS_TOKEN: 'auth_access_token',
  REFRESH_TOKEN: 'auth_refresh_token',
  USER: 'auth_user',
} as const;

class AuthService {
  private refreshPromise: Promise<string> | null = null;

  // ============================================================
  // PLATFORM DETECTION
  // ============================================================

  private get platform(): 'web' | 'mobile' {
    return Platform.OS === 'web' ? 'web' : 'mobile';
  }

  // ============================================================
  // OAUTH LOGIN
  // ============================================================

  async loginWithGitHub(): Promise<void> {
    if (this.platform === 'web') {
      return this.loginWeb();
    } else {
      return this.loginMobile();
    }
  }

  private async loginWeb(): Promise<void> {
    // Web: Simple redirect - backend handles cookies
    const authUrl = `${API_URL}/auth/github?platform=web`;

    if (typeof window !== 'undefined') {
      window.location.href = authUrl;
    } else {
      throw new AuthError('Window object not available', 500, 'NO_WINDOW');
    }
  }

  private async loginMobile(): Promise<void> {
    try {
      // Create deep link redirect URI
      const redirectUri = Linking.createURL('auth/callback');

      // Build OAuth URL
      const authUrl = `${API_URL}/auth/github?platform=mobile&redirect_uri=${encodeURIComponent(redirectUri)}`;

      // Open OAuth browser
      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);

      if (result.type === 'cancel') {
        throw new AuthError('Login cancelled by user', 400, 'USER_CANCELLED');
      }

      if (result.type !== 'success' || !result.url) {
        throw new AuthError('Login failed', 400, 'LOGIN_FAILED');
      }

      // Extract and store tokens
      const tokens = this.extractTokensFromFragment(result.url);
      await this.storeTokens(tokens);

      // Fetch user session
      await this.fetchAndStoreUserSession(tokens.accessToken);

    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }
      throw new AuthError(
        error instanceof Error ? error.message : 'Unknown error during login',
        500,
        'LOGIN_ERROR'
      );
    }
  }

  // ============================================================
  // TOKEN EXTRACTION
  // ============================================================

  private extractTokensFromFragment(url: string): AuthTokens {
    const hashIndex = url.indexOf('#');

    if (hashIndex === -1) {
      throw new AuthError('No fragment found in callback URL', 400, 'INVALID_CALLBACK');
    }

    const fragment = url.substring(hashIndex + 1);
    const params = new URLSearchParams(fragment);

    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');

    if (!accessToken || !refreshToken) {
      throw new AuthError('Missing tokens in callback URL', 400, 'MISSING_TOKENS');
    }

    return { accessToken, refreshToken };
  }

  // ============================================================
  // TOKEN STORAGE
  // ============================================================

  private async storeTokens(tokens: AuthTokens): Promise<void> {
    if (this.platform === 'web') {
      // Web: Tokens stored in httpOnly cookies by backend
      // No client-side storage needed
      return;
    }

    // Mobile: Store in SecureStore
    await Promise.all([
      SecureStore.setItemAsync(STORAGE_KEYS.ACCESS_TOKEN, tokens.accessToken),
      SecureStore.setItemAsync(STORAGE_KEYS.REFRESH_TOKEN, tokens.refreshToken),
    ]);
  }

  async getAccessToken(): Promise<string | null> {
    if (this.platform === 'web') {
      // Web: Token in httpOnly cookie, not accessible to JS
      return null;
    }

    // Mobile: Retrieve from SecureStore
    return await SecureStore.getItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
  }

  private async getRefreshToken(): Promise<string | null> {
    if (this.platform === 'web') {
      // Web: Token in httpOnly cookie
      return null;
    }

    // Mobile: Retrieve from SecureStore
    return await SecureStore.getItemAsync(STORAGE_KEYS.REFRESH_TOKEN);
  }

  private async clearTokens(): Promise<void> {
    if (this.platform === 'web') {
      // Web: Cookies cleared by backend on logout
      // Clear user from localStorage
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(STORAGE_KEYS.USER);
      }
      return;
    }

    // Mobile: Delete from SecureStore
    await Promise.all([
      SecureStore.deleteItemAsync(STORAGE_KEYS.ACCESS_TOKEN),
      SecureStore.deleteItemAsync(STORAGE_KEYS.REFRESH_TOKEN),
    ]);
  }

  // ============================================================
  // SESSION MANAGEMENT
  // ============================================================

  async checkSession(): Promise<User | null> {
    try {
      const response = await this.authenticatedFetch(`${API_URL}/auth/session`);

      if (!response.ok) {
        return null;
      }

      const data: SessionResponse = await response.json();

      // Store user info
      await this.storeUser(data.user);

      return data.user;
    } catch (error) {
      console.error('Session check failed:', error);
      return null;
    }
  }

  private async fetchAndStoreUserSession(accessToken: string): Promise<User> {
    const response = await fetch(`${API_URL}/auth/session`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'X-Platform': this.platform,
      },
      credentials: this.platform === 'web' ? 'include' : 'same-origin',
    });

    if (!response.ok) {
      throw new AuthError('Failed to fetch user session', response.status, 'SESSION_FETCH_FAILED');
    }

    const data: SessionResponse = await response.json();
    await this.storeUser(data.user);

    return data.user;
  }

  private async storeUser(user: User): Promise<void> {
    const userJson = JSON.stringify(user);

    if (this.platform === 'web') {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEYS.USER, userJson);
      }
    } else {
      await SecureStore.setItemAsync(STORAGE_KEYS.USER, userJson);
    }
  }

  async getStoredUser(): Promise<User | null> {
    try {
      let userJson: string | null = null;

      if (this.platform === 'web') {
        if (typeof localStorage !== 'undefined') {
          userJson = localStorage.getItem(STORAGE_KEYS.USER);
        }
      } else {
        userJson = await SecureStore.getItemAsync(STORAGE_KEYS.USER);
      }

      if (!userJson) return null;

      return JSON.parse(userJson) as User;
    } catch (error) {
      console.error('Failed to get stored user:', error);
      return null;
    }
  }

  // ============================================================
  // TOKEN REFRESH
  // ============================================================

  async refreshAccessToken(): Promise<string> {
    // Prevent multiple simultaneous refresh requests
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = (async () => {
      try {
        const refreshToken = await this.getRefreshToken();

        const response = await fetch(`${API_URL}/auth/refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Platform': this.platform,
          },
          body: this.platform === 'mobile' && refreshToken
            ? JSON.stringify({ refreshToken })
            : undefined,
          credentials: this.platform === 'web' ? 'include' : 'same-origin',
        });

        if (!response.ok) {
          // Session expired - clear tokens
          await this.clearTokens();
          throw new AuthError('Session expired', 401, 'SESSION_EXPIRED');
        }

        const data: RefreshResponse = await response.json();

        // Store new tokens (mobile only, web uses cookies)
        if (this.platform === 'mobile') {
          await this.storeTokens(data);
        }

        return data.accessToken;
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  // ============================================================
  // AUTHENTICATED REQUESTS
  // ============================================================

  async authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
    const makeRequest = async (token?: string): Promise<Response> => {
      const headers = new Headers(options.headers);
      headers.set('X-Platform', this.platform);

      if (this.platform === 'web') {
        // Web: Cookies sent automatically
        return fetch(url, {
          ...options,
          headers,
          credentials: 'include',
        });
      } else {
        // Mobile: Add Bearer token
        if (token) {
          headers.set('Authorization', `Bearer ${token}`);
        }
        return fetch(url, { ...options, headers });
      }
    };

    // First attempt
    let response = await makeRequest(
      this.platform === 'mobile' ? await this.getAccessToken() || undefined : undefined
    );

    // Retry with refresh if 401
    if (response.status === 401) {
      try {
        const newToken = await this.refreshAccessToken();
        response = await makeRequest(this.platform === 'mobile' ? newToken : undefined);
      } catch (error) {
        // Refresh failed - user must re-login
        throw error;
      }
    }

    return response;
  }

  // ============================================================
  // LOGOUT
  // ============================================================

  async logout(): Promise<void> {
    try {
      const refreshToken = await this.getRefreshToken();

      // Call backend logout (don't await - allow offline logout)
      fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Platform': this.platform,
        },
        body: refreshToken ? JSON.stringify({ refreshToken }) : undefined,
        credentials: this.platform === 'web' ? 'include' : 'same-origin',
      }).catch(() => {
        // Ignore errors - clear local state anyway
      });

      // Clear local storage immediately
      await this.clearTokens();
    } catch (error) {
      // Always clear tokens even if backend call fails
      await this.clearTokens();
      throw error;
    }
  }

  async revokeAllTokens(): Promise<void> {
    const response = await this.authenticatedFetch(`${API_URL}/auth/revoke-all`, {
      method: 'POST',
    });

    if (!response.ok) {
      throw new AuthError('Failed to revoke all tokens', response.status, 'REVOKE_FAILED');
    }

    await this.clearTokens();
  }

  // ============================================================
  // USER MANAGEMENT
  // ============================================================

  async getCurrentUser(): Promise<User> {
    const response = await this.authenticatedFetch(`${API_URL}/users/me`);

    if (!response.ok) {
      throw new AuthError('Failed to fetch current user', response.status, 'USER_FETCH_FAILED');
    }

    const data = await response.json();
    await this.storeUser(data.user);

    return data.user;
  }

  async updateUser(updates: { displayName?: string; avatarUrl?: string }): Promise<User> {
    const response = await this.authenticatedFetch(`${API_URL}/users/me`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      throw new AuthError('Failed to update user', response.status, 'USER_UPDATE_FAILED');
    }

    const data = await response.json();
    await this.storeUser(data.user);

    return data.user;
  }
}

// Export singleton instance
export const authService = new AuthService();
