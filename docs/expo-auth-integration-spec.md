# Expo Authentication Integration Specification

**Project**: Breadthwise
**Version**: 2.0
**Last Updated**: 2026-03-07
**Status**: Ready for Implementation

---

## Table of Contents

1. [Overview & Architecture](#1-overview--architecture)
2. [Dependencies & Configuration](#2-dependencies--configuration)
3. [Auth Service Implementation](#3-auth-service-implementation)
4. [State Management](#4-state-management)
5. [Login Screen Implementation](#5-login-screen-implementation)
6. [Profile Screen Modifications](#6-profile-screen-modifications)
7. [Navigation & Protected Routes](#7-navigation--protected-routes)
8. [Reusable Auth Components](#8-reusable-auth-components)
9. [Error Handling & Edge Cases](#9-error-handling--edge-cases)
10. [Testing Checklist](#10-testing-checklist)
11. [Implementation Roadmap](#11-implementation-roadmap)

---

## 1. Overview & Architecture

### 1.1 Introduction

This specification outlines the integration of GitHub OAuth authentication into the Breadthwise Expo application. The implementation follows a platform-agnostic approach that works across iOS, Android, and Web using a single codebase.

### 1.2 Current State

**Frontend (Expo)**:
- Expo SDK 54.0.12 / React Native 0.81.4 / React 19.1.0
- expo-router 6 with typed routes
- Zustand 5.0.8 with manual cross-platform persistence
- ThemeContext providing `colors`, `shadows`, `styles`, `spacing`, `typography`, `borderRadius`, `isDark`
- No existing authentication

**Backend (Fastify 5)** - Fully Implemented:
- GitHub OAuth via `@fastify/oauth2` with signed HMAC-SHA256 state
- Platform-aware token delivery (cookies for web, URL fragments for mobile)
- JWT access tokens (15min) + opaque refresh tokens (7d web, 30d mobile)
- Token rotation on every refresh
- See `docs/backend-spec.md` for full API reference

### 1.3 Authentication Flow

#### Mobile (iOS/Android)
```
User taps "Login with GitHub"
  -> expo-web-browser opens /auth/github?platform=mobile&redirect_uri=breadthwise://auth/callback
  -> User authorizes on GitHub
  -> Backend redirects to breadthwise://auth/callback#access_token=...&refresh_token=...
  -> WebBrowser.openAuthSessionAsync returns the URL
  -> Extract tokens from URL fragment
  -> Store tokens in expo-secure-store
  -> Fetch full user via /users/me
  -> Update Zustand auth state
  -> Navigate to /(tabs)/discover
```

#### Web
```
User clicks "Login with GitHub"
  -> window.location.href = /auth/github?platform=web
  -> User authorizes on GitHub
  -> Backend sets httpOnly cookies + redirects to WEB_CLIENT_URL
  -> App checks session via /auth/session (cookies sent automatically)
  -> Fetch full user via /users/me
  -> Update Zustand auth state
  -> Navigate to /(tabs)/discover
```

### 1.4 Technology Stack

**Already Installed**:
- `expo-web-browser` ~15.0.7 (OAuth browser)
- `expo-linking` ~8.0.8 (deep link handling)
- `zustand` ^5.0.8 (state management)

**To Install**:
- `expo-secure-store` (secure token storage on mobile)

### 1.5 File Structure (New/Modified Files)

```
Breadthwise/
├── app/
│   ├── _layout.tsx                    [MODIFY] Add auth guards + session check
│   ├── (auth)/
│   │   ├── _layout.tsx                [NEW] Auth group layout
│   │   └── login.tsx                  [NEW] Login screen
│   ├── (tabs)/
│   │   └── profile.tsx                [MODIFY] Add user info & logout
│
├── src/
│   ├── services/
│   │   └── authService.ts             [NEW] Platform-agnostic auth service
│   │
│   ├── store/
│   │   └── useAppStore.ts             [MODIFY] Add auth state slice
│   │
│   ├── components/
│   │   ├── auth/
│   │   │   └── AuthLoadingOverlay.tsx  [NEW] OAuth loading state
│   │   └── profile/
│   │       ├── UserProfileHeader.tsx   [NEW] User avatar & info
│   │       └── LogoutButton.tsx        [NEW] Logout with confirmation
│   │
│   ├── hooks/
│   │   └── useAuth.ts                 [NEW] Auth convenience hook
│   │
│   └── types/
│       └── index.ts                   [MODIFY] Add auth types
│
└── .env                               [MODIFY] Add EXPO_PUBLIC_API_URL
```

---

## 2. Dependencies & Configuration

### 2.1 Install Dependencies

```bash
npx expo install expo-secure-store
```

`expo-web-browser` (~15.0.7) and `expo-linking` (~8.0.8) are already installed.

### 2.2 Environment Variables

Add to `.env`:

```bash
# Backend API URL
EXPO_PUBLIC_API_URL=https://your-backend-url.com
```

### 2.3 Deep Link Configuration

Already configured in `app.config.js`:
```javascript
{ expo: { scheme: "breadthwise" } }  // DO NOT CHANGE
```

Deep link format: `breadthwise://auth/callback#access_token=...&refresh_token=...`

---

## 3. Auth Service Implementation

### 3.1 Auth Service

**File**: `src/services/authService.ts` [NEW]

```typescript
import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as SecureStore from 'expo-secure-store';
import * as Linking from 'expo-linking';

// ============================================================
// TYPES
// ============================================================

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
  user: {
    sub: string;
    githubId: string;
    username: string;
    email?: string;
    platform?: string;
    iat: number;
    exp: number;
  };
  expiresAt: string;
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

// ============================================================
// CONSTANTS
// ============================================================

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
const DEEP_LINK_SCHEME = 'breadthwise://';

const STORAGE_KEYS = {
  ACCESS_TOKEN: 'auth_access_token',
  REFRESH_TOKEN: 'auth_refresh_token',
} as const;

// ============================================================
// AUTH SERVICE
// ============================================================

class AuthService {
  private refreshPromise: Promise<string> | null = null;

  private get isWeb(): boolean {
    return Platform.OS === 'web';
  }

  private get platform(): 'web' | 'mobile' {
    return this.isWeb ? 'web' : 'mobile';
  }

  // ----------------------------------------------------------
  // OAUTH LOGIN
  // ----------------------------------------------------------

  async loginWithGitHub(): Promise<AuthTokens | void> {
    if (this.isWeb) {
      return this.loginWeb();
    }
    return this.loginMobile();
  }

  private loginWeb(): void {
    // Web: redirect to backend OAuth - cookies handled automatically
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

    // Extract tokens from URL fragment
    const tokens = this.extractTokensFromFragment(result.url);
    await this.storeTokens(tokens);
    return tokens;
  }

  /**
   * Handle mobile OAuth callback URL. Extracts tokens, stores them,
   * and fetches the full user profile.
   */
  async handleMobileCallback(url: string): Promise<User> {
    const tokens = this.extractTokensFromFragment(url);
    await this.storeTokens(tokens);
    return this.getCurrentUser();
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

  // ----------------------------------------------------------
  // TOKEN STORAGE (mobile only - web uses httpOnly cookies)
  // ----------------------------------------------------------

  private async storeTokens(tokens: AuthTokens): Promise<void> {
    if (this.isWeb) return; // Web: cookies set by backend
    await Promise.all([
      SecureStore.setItemAsync(STORAGE_KEYS.ACCESS_TOKEN, tokens.accessToken),
      SecureStore.setItemAsync(STORAGE_KEYS.REFRESH_TOKEN, tokens.refreshToken),
    ]);
  }

  async getAccessToken(): Promise<string | null> {
    if (this.isWeb) return null; // Web: cookie sent automatically
    return SecureStore.getItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
  }

  private async getRefreshToken(): Promise<string | null> {
    if (this.isWeb) return null;
    return SecureStore.getItemAsync(STORAGE_KEYS.REFRESH_TOKEN);
  }

  private async clearTokens(): Promise<void> {
    if (this.isWeb) return; // Web: cookies cleared by backend on logout
    await Promise.all([
      SecureStore.deleteItemAsync(STORAGE_KEYS.ACCESS_TOKEN),
      SecureStore.deleteItemAsync(STORAGE_KEYS.REFRESH_TOKEN),
    ]);
  }

  // ----------------------------------------------------------
  // SESSION MANAGEMENT
  // ----------------------------------------------------------

  /**
   * Check if user has a valid session.
   * For web: sends cookies automatically.
   * For mobile: sends access token in Authorization header.
   * Returns null if no valid session.
   */
  async checkSession(): Promise<boolean> {
    try {
      const response = await this.authenticatedFetch(`${API_URL}/auth/session`);
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Fetch full user profile from /users/me.
   * This is needed because /auth/session only returns JWT claims.
   */
  async getCurrentUser(): Promise<User> {
    const response = await this.authenticatedFetch(`${API_URL}/users/me`);
    if (!response.ok) {
      throw new AuthError('Failed to fetch user', response.status, 'USER_FETCH_FAILED');
    }
    const data = await response.json();
    return data.user;
  }

  // ----------------------------------------------------------
  // TOKEN REFRESH
  // ----------------------------------------------------------

  async refreshAccessToken(): Promise<string> {
    // Prevent concurrent refresh requests
    if (this.refreshPromise) return this.refreshPromise;

    this.refreshPromise = (async () => {
      try {
        const refreshToken = await this.getRefreshToken();

        const response = await fetch(`${API_URL}/auth/refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Platform': this.platform,
          },
          body: !this.isWeb && refreshToken
            ? JSON.stringify({ refreshToken })
            : undefined,
          credentials: this.isWeb ? 'include' : 'same-origin',
        });

        if (!response.ok) {
          await this.clearTokens();
          throw new AuthError('Session expired', 401, 'SESSION_EXPIRED');
        }

        const data = await response.json();

        if (!this.isWeb && data.accessToken) {
          await this.storeTokens({
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
          });
        }

        return data.accessToken || '';
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  // ----------------------------------------------------------
  // AUTHENTICATED REQUESTS
  // ----------------------------------------------------------

  async authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
    const makeRequest = async (token?: string): Promise<Response> => {
      const headers = new Headers(options.headers);
      headers.set('X-Platform', this.platform);

      if (this.isWeb) {
        return fetch(url, { ...options, headers, credentials: 'include' });
      }

      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      return fetch(url, { ...options, headers });
    };

    // First attempt
    const token = this.isWeb ? undefined : (await this.getAccessToken()) || undefined;
    let response = await makeRequest(token);

    // Auto-retry with refreshed token on 401
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

  // ----------------------------------------------------------
  // LOGOUT
  // ----------------------------------------------------------

  async logout(): Promise<void> {
    try {
      const refreshToken = await this.getRefreshToken();

      // Fire-and-forget backend logout
      fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Platform': this.platform,
        },
        body: refreshToken ? JSON.stringify({ refreshToken }) : undefined,
        credentials: this.isWeb ? 'include' : 'same-origin',
      }).catch(() => {});
    } finally {
      await this.clearTokens();
    }
  }
}

export const authService = new AuthService();
```

---

## 4. State Management

### 4.1 Extend Zustand Store

**File**: `src/store/useAppStore.ts` [MODIFY]

Follow the existing manual persistence pattern. Add auth state to the existing `AppState` interface and store creator.

```typescript
// Add to imports
import type { User } from '@/services/authService';
import { authService } from '@/services/authService';

// Add to AppState interface (alongside existing fields)
interface AppState {
  // ... existing state (topics, quizzes, profile, etc.)

  // Auth state
  user: User | null;
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  authError: string | null;

  // Auth actions
  setUser: (user: User | null) => void;
  setAuthLoading: (loading: boolean) => void;
  setAuthError: (error: string | null) => void;
  checkSession: () => Promise<void>;
  logout: () => Promise<void>;

  // ... existing actions
}

// Add to storeCreator (alongside existing state & actions)
const storeCreator: StateCreator<AppState> = (set, get) => ({
  // ... existing state ...

  // Auth state - initial values
  user: null,
  isAuthenticated: false,
  isAuthLoading: true, // Start true to check session on mount
  authError: null,

  // Auth actions
  setUser: (user) => set({
    user,
    isAuthenticated: !!user,
    authError: null,
  }),

  setAuthLoading: (isAuthLoading) => set({ isAuthLoading }),

  setAuthError: (authError) => set({ authError, isAuthLoading: false }),

  checkSession: async () => {
    try {
      set({ isAuthLoading: true, authError: null });

      const isValid = await authService.checkSession();
      if (isValid) {
        const user = await authService.getCurrentUser();
        set({ user, isAuthenticated: true, isAuthLoading: false });
        return;
      }

      set({ user: null, isAuthenticated: false, isAuthLoading: false });
    } catch {
      set({ user: null, isAuthenticated: false, isAuthLoading: false });
    }
  },

  logout: async () => {
    try {
      set({ isAuthLoading: true });
      await authService.logout();
    } finally {
      set({
        user: null,
        isAuthenticated: false,
        isAuthLoading: false,
        authError: null,
      });
    }
  },

  // ... existing actions ...
});

// Update selectPersisted to include user (NOT tokens - those are in SecureStore)
function selectPersisted(state: AppState): PersistedSlice {
  return {
    topics: state.topics,
    dismissedTopics: state.dismissedTopics,
    quizzes: state.quizzes,
    currentQuiz: state.currentQuiz,
    profile: state.profile,
    user: state.user, // Add this line
  };
}

// Update PersistedSlice type
type PersistedSlice = Pick<AppState,
  'topics' | 'dismissedTopics' | 'quizzes' | 'currentQuiz' | 'profile' | 'user'>;
```

The existing `hydrateState()` and `subscribe()` functions will automatically persist and restore the `user` field.

### 4.2 Auth Hook

**File**: `src/hooks/useAuth.ts` [NEW]

```typescript
import { useShallow } from 'zustand/shallow';
import { useAppStore } from '@/store/useAppStore';
import { authService } from '@/services/authService';

export function useAuth() {
  const store = useAppStore(useShallow((state) => ({
    user: state.user,
    isAuthenticated: state.isAuthenticated,
    isAuthLoading: state.isAuthLoading,
    authError: state.authError,
    setUser: state.setUser,
    setAuthLoading: state.setAuthLoading,
    setAuthError: state.setAuthError,
    checkSession: state.checkSession,
    logout: state.logout,
  })));

  const login = async () => {
    try {
      store.setAuthLoading(true);
      store.setAuthError(null);

      const result = await authService.loginWithGitHub();

      // Mobile: loginWithGitHub returns tokens, fetch user
      if (result) {
        const user = await authService.getCurrentUser();
        store.setUser(user);
        store.setAuthLoading(false);
      }
      // Web: page redirects, no further action needed here
    } catch (error) {
      store.setAuthError(error instanceof Error ? error.message : 'Login failed');
      store.setAuthLoading(false);
    }
  };

  return { ...store, login };
}
```

---

## 5. Login Screen Implementation

### 5.1 Auth Group Layout

**File**: `app/(auth)/_layout.tsx` [NEW]

```typescript
import { Stack } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';

export default function AuthLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    />
  );
}
```

### 5.2 Login Screen

**File**: `app/(auth)/login.tsx` [NEW]

```typescript
import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { AntDesign } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/contexts/ThemeContext';

export default function LoginScreen() {
  const { colors, spacing, typography, borderRadius, shadows } = useTheme();
  const styles = useStyles();
  const { width } = useWindowDimensions();
  const router = useRouter();
  const { isAuthenticated, isAuthLoading, authError, login, setAuthError } = useAuth();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !isAuthLoading) {
      router.replace('/(tabs)/discover');
    }
  }, [isAuthenticated, isAuthLoading]);

  // Auto-dismiss error
  useEffect(() => {
    if (authError) {
      const timer = setTimeout(() => setAuthError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [authError]);

  const containerWidth = width >= 768 ? 500 : width - spacing.xl * 2;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.content}>
        {/* Branding */}
        <View style={styles.logoContainer}>
          <Text style={styles.logo}>🧭</Text>
          <Text style={styles.title}>Breadthwise</Text>
          <Text style={styles.subtitle}>
            Expand your knowledge breadth.{'\n'}
            Discover topics outside your expertise.
          </Text>
        </View>

        {/* Login Button */}
        <View style={[styles.buttonContainer, { width: containerWidth }]}>
          <TouchableOpacity
            style={styles.githubButton}
            onPress={login}
            disabled={isAuthLoading}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Login with GitHub"
            accessibilityHint="Opens GitHub login in browser"
            accessibilityState={{ disabled: isAuthLoading }}
          >
            {isAuthLoading ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <>
                <AntDesign name="github" size={24} color={colors.text} />
                <Text style={styles.githubButtonText}>Continue with GitHub</Text>
              </>
            )}
          </TouchableOpacity>

          {authError && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{authError}</Text>
            </View>
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            By continuing, you agree to our Terms of Service{'\n'}
            and Privacy Policy.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

function useStyles() {
  const { colors, spacing, typography, borderRadius, shadows } = useTheme();

  return React.useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: colors.background,
        },
        content: {
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: spacing.xl,
        },
        logoContainer: {
          alignItems: 'center',
          marginBottom: spacing.xxl * 2,
        },
        logo: {
          fontSize: 80,
          marginBottom: spacing.lg,
        },
        title: {
          fontSize: typography.fontSize.xxxl,
          fontWeight: typography.fontWeight.bold,
          color: colors.text,
          marginBottom: spacing.md,
          textAlign: 'center',
        },
        subtitle: {
          fontSize: typography.fontSize.base,
          color: colors.textSecondary,
          textAlign: 'center',
          lineHeight: typography.lineHeight.relaxed,
          paddingHorizontal: spacing.xl,
        },
        buttonContainer: {
          width: '100%',
          maxWidth: 400,
        },
        githubButton: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.cardBackground,
          borderWidth: 2,
          borderColor: colors.border,
          borderRadius: borderRadius.md,
          paddingVertical: spacing.lg,
          paddingHorizontal: spacing.xl,
          minHeight: 56,
          ...shadows.small,
        },
        githubButtonText: {
          fontSize: typography.fontSize.lg,
          fontWeight: typography.fontWeight.semibold,
          color: colors.text,
          marginLeft: spacing.md,
        },
        errorContainer: {
          marginTop: spacing.lg,
          backgroundColor: colors.errorLight,
          borderRadius: borderRadius.md,
          padding: spacing.md,
          borderLeftWidth: 4,
          borderLeftColor: colors.error,
        },
        errorText: {
          fontSize: typography.fontSize.sm,
          color: colors.error,
          textAlign: 'center',
        },
        footer: {
          position: 'absolute',
          bottom: spacing.xl,
          paddingHorizontal: spacing.xl,
        },
        footerText: {
          fontSize: typography.fontSize.xs,
          color: colors.textSecondary,
          textAlign: 'center',
          lineHeight: typography.lineHeight.tight,
        },
      }),
    [colors, spacing, typography, borderRadius, shadows]
  );
}
```

---

## 6. Profile Screen Modifications

### 6.1 User Profile Header Component

**File**: `src/components/profile/UserProfileHeader.tsx` [NEW]

```typescript
import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import type { User } from '@/services/authService';
import { useTheme } from '@/contexts/ThemeContext';

interface UserProfileHeaderProps {
  user: User;
}

export function UserProfileHeader({ user }: UserProfileHeaderProps) {
  const { colors, spacing, typography, borderRadius, shadows } = useTheme();
  const styles = useStyles();

  const displayName = user.displayName || user.username;
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <View style={styles.container}>
      <View style={styles.avatarContainer}>
        {user.avatarUrl ? (
          <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
        )}
      </View>
      <Text style={styles.displayName}>{displayName}</Text>
      <Text style={styles.username}>@{user.username}</Text>
      {user.email && <Text style={styles.email}>{user.email}</Text>}
    </View>
  );
}

function useStyles() {
  const { colors, spacing, typography, borderRadius, shadows } = useTheme();

  return React.useMemo(
    () =>
      StyleSheet.create({
        container: {
          backgroundColor: colors.cardBackground,
          borderRadius: borderRadius.lg,
          padding: spacing.xl,
          marginHorizontal: spacing.lg,
          marginTop: spacing.lg,
          marginBottom: spacing.lg,
          alignItems: 'center',
          ...shadows.small,
        },
        avatarContainer: { marginBottom: spacing.md },
        avatar: {
          width: 80,
          height: 80,
          borderRadius: borderRadius.round,
        },
        avatarPlaceholder: {
          backgroundColor: colors.primary,
          justifyContent: 'center',
          alignItems: 'center',
        },
        avatarText: {
          fontSize: typography.fontSize.xxl,
          fontWeight: typography.fontWeight.bold,
          color: '#FFFFFF',
        },
        displayName: {
          fontSize: typography.fontSize.xl,
          fontWeight: typography.fontWeight.bold,
          color: colors.text,
          marginTop: spacing.sm,
        },
        username: {
          fontSize: typography.fontSize.base,
          color: colors.textSecondary,
          marginTop: spacing.xs,
        },
        email: {
          fontSize: typography.fontSize.sm,
          color: colors.textSecondary,
          marginTop: spacing.xs,
        },
      }),
    [colors, spacing, typography, borderRadius, shadows]
  );
}
```

### 6.2 Logout Button Component

**File**: `src/components/profile/LogoutButton.tsx` [NEW]

```typescript
import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/contexts/ThemeContext';

export function LogoutButton() {
  const { colors, spacing, typography, borderRadius } = useTheme();
  const styles = useStyles();
  const router = useRouter();
  const { logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoggingOut(true);
              await logout();
              router.replace('/(auth)/login');
            } catch {
              Alert.alert('Error', 'Failed to logout. Please try again.');
            } finally {
              setIsLoggingOut(false);
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  return (
    <TouchableOpacity
      style={styles.button}
      onPress={handleLogout}
      disabled={isLoggingOut}
      accessible
      accessibilityRole="button"
      accessibilityLabel="Logout"
      accessibilityHint="Logout from your account"
      accessibilityState={{ disabled: isLoggingOut }}
    >
      {isLoggingOut ? (
        <ActivityIndicator color="#FFFFFF" />
      ) : (
        <Text style={styles.buttonText}>Logout</Text>
      )}
    </TouchableOpacity>
  );
}

function useStyles() {
  const { colors, spacing, typography, borderRadius } = useTheme();

  return React.useMemo(
    () =>
      StyleSheet.create({
        button: {
          backgroundColor: colors.error,
          borderRadius: borderRadius.md,
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.xl,
          alignItems: 'center',
          marginHorizontal: spacing.lg,
          marginTop: spacing.xl,
          marginBottom: spacing.xxl,
          minHeight: 48,
          justifyContent: 'center',
        },
        buttonText: {
          fontSize: typography.fontSize.base,
          fontWeight: typography.fontWeight.semibold,
          color: '#FFFFFF',
        },
      }),
    [colors, spacing, typography, borderRadius]
  );
}
```

### 6.3 Modified Profile Screen

**File**: `app/(tabs)/profile.tsx` [MODIFY]

Add user info and logout to the existing profile screen. Keep all existing components and their prop interfaces intact.

```typescript
import { BreadthExpansionStats } from '@/components/profile/BreadthExpansionStats';
import { CategoryBreakdownList } from '@/components/profile/CategoryBreakdownList';
import { MilestonesList } from '@/components/profile/MilestonesList';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { QuizPerformanceCard } from '@/components/profile/QuizPerformanceCard';
import { UserProfileHeader } from '@/components/profile/UserProfileHeader';
import { LogoutButton } from '@/components/profile/LogoutButton';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/hooks/useAuth';
import { useAppStore } from '@/store/useAppStore';
import React from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ProfileScreen() {
  const { profile } = useAppStore();
  const insets = useSafeAreaInsets();
  const { styles: themeStyles, colors, spacing, typography } = useTheme();
  const { user, isAuthenticated } = useAuth();

  return (
    <ScrollView style={themeStyles.container}>
      <ProfileHeader paddingTop={Math.max(insets.top, 20)} />

      {/* User profile card (when authenticated) */}
      {isAuthenticated && user && (
        <UserProfileHeader user={user} />
      )}

      {/* Existing stats components - unchanged */}
      <BreadthExpansionStats
        totalDiscovered={profile.statistics.breadthExpansion.totalDiscovered}
        totalLearned={profile.statistics.breadthExpansion.totalLearned}
        inBucketList={profile.statistics.breadthExpansion.inBucketList}
        learningRate={profile.statistics.breadthExpansion.learningRate}
      />

      <QuizPerformanceCard
        totalQuizzesTaken={profile.statistics.quizPerformance.totalQuizzesTaken}
        averageScore={profile.statistics.quizPerformance.averageScore}
        passRate={profile.statistics.quizPerformance.passRate}
      />

      <CategoryBreakdownList
        categoryBreakdown={profile.statistics.categoryBreakdown}
      />

      <MilestonesList milestones={profile.milestones} />

      {/* Logout button (when authenticated) */}
      {isAuthenticated && <LogoutButton />}
    </ScrollView>
  );
}
```

---

## 7. Navigation & Protected Routes

### 7.1 Root Layout with Auth Guards

**File**: `app/_layout.tsx` [MODIFY]

Add auth state management and route protection while preserving all existing screen configurations.

```typescript
import { useEffect } from 'react';
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider as NavigationThemeProvider,
} from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ThemeProvider } from '@/contexts/ThemeContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { DarkColors, LightColors } from '@/styles/globalStyles';
import { useAppStore } from '@/store/useAppStore';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? DarkColors : LightColors;
  const router = useRouter();
  const segments = useSegments();

  const isAuthenticated = useAppStore((state) => state.isAuthenticated);
  const isAuthLoading = useAppStore((state) => state.isAuthLoading);
  const checkSession = useAppStore((state) => state.checkSession);

  // Check session on mount
  useEffect(() => {
    checkSession();
  }, []);

  // Auth guard - redirect based on auth state
  useEffect(() => {
    if (isAuthLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      router.replace('/(tabs)/discover');
    }
  }, [isAuthenticated, isAuthLoading, segments]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <NavigationThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            <Stack>
              {/* Auth screens */}
              <Stack.Screen
                name="(auth)"
                options={{ headerShown: false }}
              />
              {/* Existing screens - preserved as-is */}
              <Stack.Screen
                name="(tabs)"
                options={{ title: 'Home', headerShown: false }}
              />
              <Stack.Screen
                name="quiz"
                options={{
                  presentation: 'card',
                  title: 'Test Your Knowledge',
                  headerStyle: { backgroundColor: colors.primary },
                  headerTintColor: colors.white,
                  headerTitleStyle: { fontWeight: 'bold' },
                }}
              />
              <Stack.Screen
                name="discover-surprise"
                options={{
                  presentation: 'card',
                  title: 'Surprise Me',
                  headerStyle: { backgroundColor: colors.primary },
                  headerTintColor: colors.white,
                  headerTitleStyle: { fontWeight: 'bold' },
                }}
              />
              <Stack.Screen
                name="discover-guided"
                options={{
                  presentation: 'card',
                  title: 'Guide Me',
                  headerStyle: { backgroundColor: colors.primary },
                  headerTintColor: colors.white,
                  headerTitleStyle: { fontWeight: 'bold' },
                }}
              />
              <Stack.Screen
                name="topic-detail"
                options={{
                  presentation: 'card',
                  title: 'Topic Details',
                  headerStyle: { backgroundColor: colors.primary },
                  headerTintColor: colors.white,
                  headerTitleStyle: { fontWeight: 'bold' },
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
```

---

## 8. Reusable Auth Components

### 8.1 Auth Loading Overlay

**File**: `src/components/auth/AuthLoadingOverlay.tsx` [NEW]

```typescript
import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

interface AuthLoadingOverlayProps {
  message?: string;
}

export function AuthLoadingOverlay({ message = 'Authenticating...' }: AuthLoadingOverlayProps) {
  const { colors, spacing, typography, borderRadius } = useTheme();

  const styles = React.useMemo(
    () =>
      StyleSheet.create({
        overlay: {
          ...StyleSheet.absoluteFillObject,
          backgroundColor: colors.background + 'CC',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 999,
        },
        content: {
          backgroundColor: colors.cardBackground,
          borderRadius: borderRadius.lg,
          padding: spacing.xxl,
          alignItems: 'center',
          minWidth: 200,
        },
        message: {
          fontSize: typography.fontSize.base,
          color: colors.text,
          marginTop: spacing.lg,
          textAlign: 'center',
        },
      }),
    [colors, spacing, typography, borderRadius]
  );

  return (
    <View style={styles.overlay}>
      <View style={styles.content}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.message}>{message}</Text>
      </View>
    </View>
  );
}
```

---

## 9. Error Handling & Edge Cases

### 9.1 OAuth Errors

| Scenario | Handling | UI Response |
|----------|----------|-------------|
| User cancels OAuth | `AuthError('USER_CANCELLED')` | Dismissible error banner, stay on login |
| Network error during login | Generic error catch | Error shown, stay on login |
| Invalid callback URL | `AuthError('INVALID_CALLBACK')` | Error shown, redirect to login |
| Token refresh fails | `AuthError('SESSION_EXPIRED')` | Redirect to login |

### 9.2 Concurrent Refresh Requests

The `refreshPromise` field in `AuthService` prevents multiple simultaneous refresh requests. If a refresh is already in progress, subsequent calls await the same promise.

### 9.3 Offline Logout

Backend logout call is fire-and-forget (`fetch().catch(() => {})`). Local tokens are always cleared immediately regardless of network state.

### 9.4 Token Expiry During Request

`authenticatedFetch` automatically retries with a refreshed token when it receives a 401. This is transparent to the caller.

### 9.5 Session Check Flow

On app mount, `checkSession()` runs:
1. Call `/auth/session` to validate the current token/cookie
2. If valid, call `/users/me` to get full user data
3. Store user in Zustand state
4. If invalid, clear auth state (redirect handled by auth guard)

---

## 10. Testing Checklist

### OAuth Flow
- [ ] **Mobile (iOS)**: Login redirects to GitHub, deep link callback received, tokens stored in SecureStore, user fetched, navigates to app
- [ ] **Mobile (Android)**: Same as iOS
- [ ] **Web**: Login redirects to GitHub, cookies set, redirects back, session check works, navigates to app

### Token Refresh
- [ ] Access token auto-refreshes on 401
- [ ] Concurrent requests queue properly (single refresh)
- [ ] Failed refresh redirects to login
- [ ] Token rotation works (old refresh token invalidated)

### Logout
- [ ] Backend logout called (fire-and-forget)
- [ ] Local tokens/cookies cleared
- [ ] Zustand state reset
- [ ] Redirects to login screen
- [ ] Works offline (local state cleared even if backend unreachable)

### Protected Routes
- [ ] Unauthenticated users redirected to login
- [ ] Authenticated users can access all app tabs
- [ ] Already logged-in users skip login screen
- [ ] Auth state persists across app restarts (via Zustand persistence)

### UI/UX
- [ ] Login screen renders correctly (light & dark mode)
- [ ] Profile shows user avatar, name, email when authenticated
- [ ] Logout confirmation dialog works
- [ ] Loading states shown during OAuth flow
- [ ] Error messages displayed and auto-dismissed
- [ ] Responsive layout on phones and tablets

### Accessibility
- [ ] Login button has accessibilityLabel and accessibilityHint
- [ ] Loading states announced to screen readers
- [ ] Logical focus order

---

## 11. Implementation Roadmap

### Phase 1: Foundation (1-2 days)
1. Install `expo-secure-store`
2. Add `EXPO_PUBLIC_API_URL` to `.env`
3. Create `authService.ts`
4. Add auth state to `useAppStore.ts`
5. Create `useAuth.ts` hook

### Phase 2: Login Flow (1-2 days)
1. Create `app/(auth)/_layout.tsx` and `app/(auth)/login.tsx`
2. Test mobile OAuth flow (deep link callback)
3. Test web OAuth flow (cookie-based)

### Phase 3: Profile & Logout (1 day)
1. Create `UserProfileHeader` and `LogoutButton`
2. Modify profile screen (additive)
3. Test logout flow

### Phase 4: Protected Routes (1 day)
1. Modify root `_layout.tsx` with auth guards
2. Add session check on mount
3. Test navigation flows (authenticated/unauthenticated)

### Phase 5: Polish & Testing (1-2 days)
1. Error handling refinement
2. Cross-platform testing (iOS, Android, Web)
3. Dark/light mode testing
4. Accessibility testing

---

## Design System Reference

All auth components use `useTheme()` from `@/contexts/ThemeContext`:

```typescript
const { colors, shadows, spacing, typography, borderRadius, isDark } = useTheme();
```

**Key color properties used in auth**:
- `colors.background` - Screen background
- `colors.cardBackground` - Card/button surfaces
- `colors.text` - Primary text
- `colors.textSecondary` - Secondary text
- `colors.primary` - Primary accent (green)
- `colors.error` - Error states, logout button
- `colors.errorLight` - Error banner background
- `colors.border` - Borders

**Key spacing/typography values**:
- `spacing`: xs(4), sm(8), md(12), lg(15), xl(20), xxl(30)
- `typography.fontSize`: xs(12), sm(14), base(16), lg(18), xl(20), xxl(24), xxxl(28)
- `typography.fontWeight`: normal('400'), medium('500'), semibold('600'), bold('700')
- `borderRadius`: sm(4), md(8), lg(12), xl(20), round(9999)
- `shadows.small` - Spread directly (pre-resolved, no function call)

---

**Document Version**: 2.0
**Last Updated**: 2026-03-07
**Status**: Ready for Implementation
