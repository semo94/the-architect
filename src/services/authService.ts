import * as Linking from 'expo-linking';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

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

export class AuthError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code: string,
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

const STORAGE_KEYS = {
  ACCESS_TOKEN: 'auth_access_token',
  REFRESH_TOKEN: 'auth_refresh_token',
} as const;

class AuthService {
  private refreshPromise: Promise<string> | null = null;

  private get isWeb(): boolean {
    return Platform.OS === 'web';
  }

  private get platform(): 'web' | 'mobile' {
    return this.isWeb ? 'web' : 'mobile';
  }

  async loginWithGitHub(): Promise<AuthTokens | void> {
    if (this.isWeb) {
      return this.loginWeb();
    }

    return this.loginMobile();
  }

  private loginWeb(): void {
    const authUrl = `${API_URL}/auth/github?platform=web`;
    if (typeof window !== 'undefined') {
      window.location.href = authUrl;
    }
  }

  private async loginMobile(): Promise<AuthTokens> {
    const redirectUri = Linking.createURL('auth/callback');
    const authUrl = `${API_URL}/auth/github?platform=mobile&redirect_uri=${encodeURIComponent(redirectUri)}`;

    const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);

    if (result.type === 'cancel') {
      throw new AuthError('Login cancelled by user', 400, 'USER_CANCELLED');
    }

    if (result.type !== 'success' || !result.url) {
      throw new AuthError('Login failed', 400, 'LOGIN_FAILED');
    }

    const tokens = this.extractTokensFromFragment(result.url);
    await this.storeTokens(tokens);
    return tokens;
  }

  private extractTokensFromFragment(url: string): AuthTokens {
    const hashIndex = url.indexOf('#');
    if (hashIndex === -1) {
      throw new AuthError('No fragment in callback URL', 400, 'INVALID_CALLBACK');
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

  private async storeTokens(tokens: AuthTokens): Promise<void> {
    if (this.isWeb) {
      return;
    }

    await Promise.all([
      SecureStore.setItemAsync(STORAGE_KEYS.ACCESS_TOKEN, tokens.accessToken),
      SecureStore.setItemAsync(STORAGE_KEYS.REFRESH_TOKEN, tokens.refreshToken),
    ]);
  }

  async getAccessToken(): Promise<string | null> {
    if (this.isWeb) {
      return null;
    }

    return SecureStore.getItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
  }

  private async getRefreshToken(): Promise<string | null> {
    if (this.isWeb) {
      return null;
    }

    return SecureStore.getItemAsync(STORAGE_KEYS.REFRESH_TOKEN);
  }

  private async clearTokens(): Promise<void> {
    if (this.isWeb) {
      return;
    }

    await Promise.all([
      SecureStore.deleteItemAsync(STORAGE_KEYS.ACCESS_TOKEN),
      SecureStore.deleteItemAsync(STORAGE_KEYS.REFRESH_TOKEN),
    ]);
  }

  /**
   * Lightweight session probe — does NOT trigger refresh.
   * The store layer decides whether to attempt a refresh on failure.
   */
  async checkSession(): Promise<boolean> {
    try {
      const headers = new Headers();

      if (!this.isWeb) {
        headers.set('X-Platform', this.platform);
        const token = await this.getAccessToken();
        if (!token) {
          return false;
        }
        headers.set('Authorization', `Bearer ${token}`);
      }

      const response = await fetch(`${API_URL}/auth/session`, {
        method: 'GET',
        headers,
        credentials: this.isWeb ? 'include' : 'same-origin',
      });

      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Returns true when a refresh attempt is worth making.
   * Mobile: checks SecureStore for a stored refresh token.
   * Web: always returns true (can't inspect httpOnly cookies).
   */
  async hasRefreshToken(): Promise<boolean> {
    if (this.isWeb) {
      return true;
    }
    const token = await this.getRefreshToken();
    return token !== null;
  }

  async getCurrentUser(): Promise<User> {
    const response = await this.authenticatedFetch(`${API_URL}/users/me`);

    if (!response.ok) {
      throw new AuthError('Failed to fetch user', response.status, 'USER_FETCH_FAILED');
    }

    const data = await response.json();
    return data.user as User;
  }

  async refreshAccessToken(): Promise<string> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = (async () => {
      try {
        const refreshToken = await this.getRefreshToken();

        const headers: Record<string, string> = {};

        if (!this.isWeb) {
          headers['X-Platform'] = this.platform;
        }

        let body: string | undefined;
        if (!this.isWeb && refreshToken) {
          headers['Content-Type'] = 'application/json';
          body = JSON.stringify({ refreshToken });
        }

        const response = await fetch(`${API_URL}/auth/refresh`, {
          method: 'POST',
          headers,
          body,
          credentials: this.isWeb ? 'include' : 'same-origin',
        });

        if (!response.ok) {
          await this.clearTokens();
          throw new AuthError('Session expired', 401, 'SESSION_EXPIRED');
        }

        const data = await response.json();

        if (!this.isWeb && data.accessToken && data.refreshToken) {
          await this.storeTokens({
            accessToken: data.accessToken as string,
            refreshToken: data.refreshToken as string,
          });
        }

        return (data.accessToken as string) || '';
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  async authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
    const makeRequest = async (token?: string): Promise<Response> => {
      const headers = new Headers(options.headers);

      if (!this.isWeb) {
        headers.set('X-Platform', this.platform);
      }

      if (this.isWeb) {
        return fetch(url, { ...options, headers, credentials: 'include' });
      }

      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }

      return fetch(url, { ...options, headers });
    };

    const token = this.isWeb ? undefined : (await this.getAccessToken()) || undefined;
    let response = await makeRequest(token);

    if (response.status === 401) {
      try {
        const newToken = await this.refreshAccessToken();
        response = await makeRequest(this.isWeb ? undefined : newToken);
      } catch {
        throw new AuthError('Session expired', 401, 'SESSION_EXPIRED');
      }
    }

    return response;
  }

  async logout(): Promise<void> {
    try {
      const refreshToken = await this.getRefreshToken();

      const body = !this.isWeb && refreshToken ? JSON.stringify({ refreshToken }) : undefined;
      const headers: Record<string, string> = {};

      if (!this.isWeb) {
        headers['X-Platform'] = this.platform;
      }

      if (body) {
        headers['Content-Type'] = 'application/json';
      }

      try {
        await fetch(`${API_URL}/auth/logout`, {
          method: 'POST',
          headers,
          body,
          credentials: this.isWeb ? 'include' : 'same-origin',
        });
      } catch {
        // Intentionally ignored. Local logout should still proceed offline.
      }
    } finally {
      await this.clearTokens();
    }
  }
}

export const authService = new AuthService();
