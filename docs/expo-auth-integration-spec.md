# Expo Authentication Integration Specification

**Project**: Breadthwise
**Version**: 1.0
**Last Updated**: 2025-11-16
**Status**: Ready for Implementation

---

## Table of Contents

1. [Overview & Architecture](#1-overview--architecture)
2. [Dependencies & Configuration](#2-dependencies--configuration)
3. [Design System Integration](#3-design-system-integration)
4. [Auth Service Implementation](#4-auth-service-implementation)
5. [State Management](#5-state-management)
6. [Login Screen Implementation](#6-login-screen-implementation)
7. [Profile Screen Modifications](#7-profile-screen-modifications)
8. [Navigation & Protected Routes](#8-navigation--protected-routes)
9. [Component Library](#9-component-library)
10. [Error Handling & Edge Cases](#10-error-handling--edge-cases)
11. [Testing Checklist](#11-testing-checklist)
12. [Implementation Roadmap](#12-implementation-roadmap)
13. [Appendix: Type Definitions](#13-appendix-type-definitions)

---

## 1. Overview & Architecture

### 1.1 Introduction

This specification outlines the integration of GitHub OAuth authentication into the Breadthwise Expo application. The implementation follows a **platform-agnostic approach** that works seamlessly across iOS, Android, and Web platforms using a single codebase.

### 1.2 Current State

**Frontend (Expo)**:
- No existing authentication implementation
- Client-side only state management with Zustand
- Local persistence of topics, quizzes, and profile data
- Ready for backend integration

**Backend (Fastify)**:
- Fully implemented GitHub OAuth flow via `@fastify/oauth2`
- Platform-aware token delivery (cookies for web, URL fragments for mobile)
- JWT access tokens (15min expiry) + random refresh tokens (7d web, 30d mobile)
- User management with PostgreSQL (Neon)

### 1.3 Integration Goals

1. ✅ **Seamless OAuth Flow**: GitHub SSO on all platforms (iOS, Android, Web)
2. ✅ **Secure Token Management**: Platform-specific storage (SecureStore mobile, cookies web)
3. ✅ **Single Codebase**: One auth service with platform conditionals
4. ✅ **Design Consistency**: Use existing globalStyles.ts theme system
5. ✅ **Mobile-First UI**: Responsive login and profile screens
6. ✅ **Data Sync**: Merge local data with backend user account
7. ✅ **Protected Routes**: Conditional navigation based on auth state

### 1.4 Backend API Endpoints

| Endpoint | Method | Description | Platform-Specific |
|----------|--------|-------------|-------------------|
| `/auth/github` | GET | Initiates OAuth flow | Query param: `platform=mobile\|web`, `redirect_uri` (mobile only) |
| `/auth/github/callback` | GET | OAuth callback | Response: Web=cookies+redirect, Mobile=URL fragment redirect |
| `/auth/refresh` | POST | Refresh access token | Request: Web=cookie, Mobile=JSON body |
| `/auth/logout` | POST | Logout and revoke token | Request: Web=cookie, Mobile=JSON body |
| `/auth/revoke-all` | POST | Revoke all user tokens | Requires: Authorization header |
| `/auth/session` | GET | Validate session | Response: `{ user, expiresAt }` |
| `/users/me` | GET | Get current user | Requires: Authorization header |
| `/users/me` | PATCH | Update user info | Requires: Authorization header |

### 1.5 Authentication Flow Diagrams

#### Mobile Flow (iOS/Android)

```
User Taps "Login with GitHub"
         ↓
expo-web-browser opens OAuth URL
  (/auth/github?platform=mobile&redirect_uri=breadthwise://auth/callback)
         ↓
User authorizes on GitHub
         ↓
Backend redirects to: breadthwise://auth/callback#access_token=...&refresh_token=...
         ↓
expo-linking catches deep link
         ↓
Extract tokens from URL fragment
         ↓
Store tokens in expo-secure-store
         ↓
Update Zustand auth state
         ↓
Navigate to /(tabs)/discover
```

#### Web Flow

```
User Clicks "Login with GitHub"
         ↓
window.location.href = /auth/github?platform=web
         ↓
User authorizes on GitHub
         ↓
Backend sets httpOnly cookies + redirects to WEB_CLIENT_URL
         ↓
Browser follows redirect with cookies
         ↓
Check session via /auth/session (cookies sent automatically)
         ↓
Update Zustand auth state
         ↓
Navigate to /(tabs)/discover
```

### 1.6 Technology Stack

**Existing**:
- Expo SDK 54.0.12
- React Native 0.81.4
- expo-router 6.0.10 (file-based routing)
- Zustand 5.0.8 (state management)
- TypeScript (strict mode)
- @react-native-async-storage/async-storage (persistence)

**New Dependencies**:
- `expo-web-browser` ~14.0.0 (OAuth browser)
- `expo-secure-store` ~14.0.0 (secure token storage)
- `expo-linking` (already installed - deep link handling)

### 1.7 File Structure

```
Breadthwise/
├── app/
│   ├── _layout.tsx                    [MODIFY] Add auth guards
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
│   │   │   ├── LoginButton.tsx        [NEW] GitHub login button
│   │   │   ├── AuthLoadingOverlay.tsx [NEW] OAuth loading state
│   │   │   └── ErrorBanner.tsx        [NEW] Auth error display
│   │   │
│   │   └── profile/
│   │       ├── UserProfileHeader.tsx  [NEW] User avatar & info
│   │       ├── AccountSection.tsx     [NEW] Account settings
│   │       ├── LogoutButton.tsx       [NEW] Logout with confirmation
│   │       ├── UserAvatar.tsx         [NEW] Avatar component
│   │       └── UserInfoCard.tsx       [NEW] User details card
│   │
│   ├── hooks/
│   │   ├── useAuth.ts                 [NEW] Auth context hook
│   │   └── useRequireAuth.ts          [NEW] Protected route hook
│   │
│   └── types/
│       └── index.ts                   [MODIFY] Add auth types
│
├── .env                                [MODIFY] Add auth env vars
└── app.config.js                       [VERIFY] Deep link scheme (already set)
```

---

## 2. Dependencies & Configuration

### 2.1 Install New Dependencies

```bash
# Navigate to project root
cd /Users/salimbakri/Documents/Projects/Breadthwise

# Install new packages
npx expo install expo-web-browser expo-secure-store

# expo-linking is already installed (package.json:33)
```

**Expected versions**:
- `expo-web-browser`: ~14.0.0
- `expo-secure-store`: ~14.0.0
- `expo-linking`: ~7.0.2 (already installed)

### 2.2 Environment Variables

Add the following to `.env`:

```bash
# Existing (keep as-is)
EXPO_PUBLIC_BACKEND_URL=https://nanci-homogonous-nida.ngrok-free.dev

# New Auth Variables
EXPO_PUBLIC_API_URL=https://nanci-homogonous-nida.ngrok-free.dev
EXPO_PUBLIC_WEB_CLIENT_URL=http://localhost:8081
EXPO_PUBLIC_MOBILE_DEEP_LINK_SCHEME=breadthwise://
```

**Environment Variable Usage**:

```typescript
// src/services/authService.ts
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.backendUrl || 'http://localhost:3000';
const DEEP_LINK_SCHEME = 'breadthwise://'; // Must match app.config.js scheme
```

### 2.3 Deep Link Configuration

**File**: `app.config.js` (line 10)

```javascript
{
  expo: {
    scheme: "breadthwise",  // ✅ Already configured - DO NOT CHANGE
    // ...
  }
}
```

**Deep Link Format**:
- App opens on: `breadthwise://auth/callback#access_token=...&refresh_token=...`
- Scheme (`breadthwise`) must match backend's `MOBILE_DEEP_LINK_SCHEME` (default: `breadthwise://`)

### 2.4 TypeScript Configuration

No changes needed. Existing `tsconfig.json` already supports:
- Path alias `@/*` → `./src/*`
- Strict mode enabled
- Expo types included

---

## 3. Design System Integration

### 3.1 Using Existing Global Styles

**Location**: `src/styles/globalStyles.ts`

The app already has a comprehensive design system. **All new auth components must use this system**.

#### 3.1.1 Theme Colors (Light/Dark Mode)

```typescript
import { useTheme } from '@/contexts/ThemeContext';

function LoginScreen() {
  const { theme } = useTheme();
  const colors = theme === 'light' ? LightColors : DarkColors;

  // Use colors.primary, colors.background, colors.text, etc.
}
```

**Key Colors**:
- `primary`: Green (#4CAF50 light, #66BB6A dark) - for primary CTAs
- `secondary`: Blue (#2196F3 light, #42A5F5 dark) - for secondary actions
- `error`: Red - for error states
- `surface`: Card backgrounds
- `text`: Primary text color

#### 3.1.2 Typography System

```typescript
import { globalStyles, typography } from '@/styles/globalStyles';

// Font sizes
typography.fontSize.xxxl   // 36 - Large headings
typography.fontSize.xxl    // 28 - Screen titles
typography.fontSize.xl     // 24 - Section headers
typography.fontSize.lg     // 20 - Subheadings
typography.fontSize.base   // 16 - Body text
typography.fontSize.sm     // 14 - Secondary text

// Font weights
typography.fontWeight.bold      // 700
typography.fontWeight.semibold  // 600
typography.fontWeight.medium    // 500
typography.fontWeight.normal    // 400
```

#### 3.1.3 Spacing System

```typescript
import { spacing } from '@/styles/globalStyles';

spacing.xs   // 4
spacing.sm   // 8
spacing.md   // 12
spacing.lg   // 15
spacing.xl   // 20
spacing.xxl  // 30
```

#### 3.1.4 Pre-built Styles for Auth Components

**Login Button** (use existing button styles):

```typescript
import { buttonStyles } from '@/styles/globalStyles';

<TouchableOpacity style={buttonStyles.primary}>
  <Text style={buttonStyles.primaryText}>Continue with GitHub</Text>
</TouchableOpacity>
```

**Auth Container** (use existing card styles):

```typescript
import { cardStyles } from '@/styles/globalStyles';

<View style={[cardStyles.card, { padding: spacing.xl }]}>
  {/* Login content */}
</View>
```

**Error Messages** (use existing text styles):

```typescript
import { textStyles } from '@/styles/globalStyles';

<Text style={textStyles.error}>{error}</Text>
```

### 3.2 Mobile-First Design Principles

**Screen Breakpoints**:

```typescript
import { useWindowDimensions } from 'react-native';

function ResponsiveAuthScreen() {
  const { width } = useWindowDimensions();

  const isSmallScreen = width < 375;   // Small phones
  const isMediumScreen = width < 768;  // Most phones
  const isTablet = width >= 768;       // Tablets
  const isDesktop = width >= 1024;     // Desktop/web

  // Adjust layout based on screen size
}
```

**Responsive Padding**:

```typescript
const getResponsivePadding = (width: number) => {
  if (width < 375) return spacing.md;      // Small phones: 12px
  if (width < 768) return spacing.xl;      // Phones: 20px
  if (width < 1024) return spacing.xxl;    // Tablets: 30px
  return spacing.xxl + spacing.lg;         // Desktop: 45px
};
```

### 3.3 Accessibility Standards

**All auth components must include**:

```typescript
<TouchableOpacity
  accessible={true}
  accessibilityRole="button"
  accessibilityLabel="Login with GitHub"
  accessibilityHint="Opens GitHub login in browser"
>
  {/* Button content */}
</TouchableOpacity>

<TextInput
  accessible={true}
  accessibilityLabel="Email address"
  accessibilityHint="Enter your email address"
/>
```

**Focus Management**:
- Ensure logical tab order
- Announce screen changes to screen readers
- Provide descriptive labels for all interactive elements

### 3.4 Auth-Specific Style Patterns

#### Login Screen Styles

```typescript
// src/components/auth/styles/loginScreenStyles.ts
import { StyleSheet } from 'react-native';
import { spacing, typography, borderRadius, shadows } from '@/styles/globalStyles';

export const useLoginScreenStyles = (colors: typeof LightColors) => {
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
          marginBottom: spacing.xxl,
          alignItems: 'center',
        },
        title: {
          fontSize: typography.fontSize.xxxl,
          fontWeight: typography.fontWeight.bold,
          color: colors.text,
          marginBottom: spacing.sm,
          textAlign: 'center',
        },
        subtitle: {
          fontSize: typography.fontSize.base,
          color: colors.textSecondary,
          textAlign: 'center',
          marginBottom: spacing.xxl,
          lineHeight: typography.lineHeight.relaxed,
        },
        buttonContainer: {
          width: '100%',
          maxWidth: 400,
        },
        githubButton: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: borderRadius.md,
          paddingVertical: spacing.lg,
          paddingHorizontal: spacing.xl,
          ...shadows.small(colors),
        },
        githubButtonText: {
          fontSize: typography.fontSize.base,
          fontWeight: typography.fontWeight.semibold,
          color: colors.text,
          marginLeft: spacing.md,
        },
        loadingOverlay: {
          ...StyleSheet.absoluteFillObject,
          backgroundColor: colors.background + 'CC', // 80% opacity
          justifyContent: 'center',
          alignItems: 'center',
        },
      }),
    [colors]
  );
};
```

#### User Profile Card Styles

```typescript
// Use in Profile screen for user info display
export const useUserProfileStyles = (colors: typeof LightColors) => {
  return React.useMemo(
    () =>
      StyleSheet.create({
        profileCard: {
          backgroundColor: colors.surface,
          borderRadius: borderRadius.lg,
          padding: spacing.xl,
          marginHorizontal: spacing.lg,
          marginTop: spacing.lg,
          ...shadows.small(colors),
        },
        avatarContainer: {
          alignItems: 'center',
          marginBottom: spacing.lg,
        },
        avatar: {
          width: 80,
          height: 80,
          borderRadius: borderRadius.round,
          backgroundColor: colors.primary,
          justifyContent: 'center',
          alignItems: 'center',
        },
        avatarText: {
          fontSize: typography.fontSize.xxl,
          fontWeight: typography.fontWeight.bold,
          color: '#FFFFFF',
        },
        username: {
          fontSize: typography.fontSize.xl,
          fontWeight: typography.fontWeight.bold,
          color: colors.text,
          textAlign: 'center',
          marginTop: spacing.md,
        },
        email: {
          fontSize: typography.fontSize.sm,
          color: colors.textSecondary,
          textAlign: 'center',
          marginTop: spacing.xs,
        },
        logoutButton: {
          marginTop: spacing.xl,
          backgroundColor: colors.error,
          borderRadius: borderRadius.md,
          paddingVertical: spacing.md,
          alignItems: 'center',
        },
        logoutButtonText: {
          fontSize: typography.fontSize.base,
          fontWeight: typography.fontWeight.semibold,
          color: '#FFFFFF',
        },
      }),
    [colors]
  );
};
```

---

## 4. Auth Service Implementation

### 4.1 Complete Auth Service

**File**: `src/services/authService.ts` [NEW]

```typescript
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
```

### 4.2 Deep Link Handler Hook

**File**: `src/hooks/useDeepLinkHandler.ts` [NEW]

```typescript
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
```

---

## 5. State Management

### 5.1 Extend Zustand Store

**File**: `src/store/useAppStore.ts` [MODIFY]

Add the following auth state slice to the existing store:

```typescript
// Add to imports
import type { User } from '@/services/authService';
import { authService } from '@/services/authService';

// Add to AppState interface
interface AppState {
  // ... existing state (topics, quizzes, profile, etc.)

  // ============================================================
  // AUTH STATE
  // ============================================================
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

// In the create() function, add these initial values and actions:

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // ... existing state

      // ============================================================
      // AUTH STATE - Initial Values
      // ============================================================
      user: null,
      isAuthenticated: false,
      isAuthLoading: true, // Start as true to check session on mount
      authError: null,

      // ============================================================
      // AUTH ACTIONS
      // ============================================================

      setUser: (user) => {
        set({
          user,
          isAuthenticated: !!user,
          authError: null,
        });
      },

      setAuthLoading: (loading) => {
        set({ isAuthLoading: loading });
      },

      setAuthError: (error) => {
        set({ authError: error, isAuthLoading: false });
      },

      checkSession: async () => {
        try {
          set({ isAuthLoading: true, authError: null });

          // First check stored user
          const storedUser = await authService.getStoredUser();

          if (storedUser) {
            // Validate session with backend
            const user = await authService.checkSession();

            if (user) {
              set({ user, isAuthenticated: true, isAuthLoading: false });
              return;
            }
          }

          // No valid session
          set({ user: null, isAuthenticated: false, isAuthLoading: false });
        } catch (error) {
          console.error('Session check failed:', error);
          set({
            user: null,
            isAuthenticated: false,
            isAuthLoading: false,
            authError: error instanceof Error ? error.message : 'Session check failed',
          });
        }
      },

      logout: async () => {
        try {
          set({ isAuthLoading: true });

          await authService.logout();

          // Clear auth state
          set({
            user: null,
            isAuthenticated: false,
            isAuthLoading: false,
            authError: null,
          });

          // Optionally: Clear local app data (topics, quizzes)
          // Uncomment if you want to clear everything on logout:
          // set({
          //   topics: [],
          //   quizzes: [],
          //   currentQuiz: null,
          //   profile: { /* reset to defaults */ },
          // });

        } catch (error) {
          console.error('Logout failed:', error);

          // Still clear local auth state even if backend call fails
          set({
            user: null,
            isAuthenticated: false,
            isAuthLoading: false,
            authError: error instanceof Error ? error.message : 'Logout failed',
          });
        }
      },

      // ... existing actions (addTopic, updateTopicStatus, etc.)
    }),
    {
      name: 'app-storage',

      // Update partialize to exclude auth tokens (stored in SecureStore)
      partialize: (state) => ({
        topics: state.topics,
        dismissedTopics: state.dismissedTopics,
        quizzes: state.quizzes,
        currentQuiz: state.currentQuiz,
        profile: state.profile,
        user: state.user, // Persist user info (not tokens)
        // DO NOT persist tokens - they're in SecureStore
      }),
    }
  )
);
```

### 5.2 Custom Auth Hooks

**File**: `src/hooks/useAuth.ts` [NEW]

```typescript
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
```

**File**: `src/hooks/useRequireAuth.ts` [NEW]

```typescript
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
```

---

## 6. Login Screen Implementation

### 6.1 Auth Group Layout

**File**: `app/(auth)/_layout.tsx` [NEW]

```typescript
import { Stack } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { LightColors, DarkColors } from '@/styles/globalStyles';

export default function AuthLayout() {
  const { theme } = useTheme();
  const colors = theme === 'light' ? LightColors : DarkColors;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: colors.background,
        },
      }}
    />
  );
}
```

### 6.2 Login Screen

**File**: `app/(auth)/login.tsx` [NEW]

```typescript
import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { AntDesign } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/contexts/ThemeContext';
import { LightColors, DarkColors, spacing, typography, borderRadius, shadows } from '@/styles/globalStyles';

export default function LoginScreen() {
  const { theme } = useTheme();
  const colors = theme === 'light' ? LightColors : DarkColors;
  const styles = useLoginStyles(colors);
  const { width } = useWindowDimensions();
  const router = useRouter();

  const { isAuthenticated, isAuthLoading, authError, login, setAuthError } = useAuth();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !isAuthLoading) {
      router.replace('/(tabs)/discover');
    }
  }, [isAuthenticated, isAuthLoading]);

  // Clear error after 5 seconds
  useEffect(() => {
    if (authError) {
      const timer = setTimeout(() => setAuthError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [authError]);

  const handleLogin = async () => {
    await login();
  };

  const isTablet = width >= 768;
  const containerWidth = isTablet ? 500 : width - spacing.xl * 2;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.content}>
        {/* Logo/Branding */}
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
            onPress={handleLogin}
            disabled={isAuthLoading}
            accessible={true}
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

          {/* Error Message */}
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

const useLoginStyles = (colors: typeof LightColors) => {
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
          backgroundColor: colors.surface,
          borderWidth: 2,
          borderColor: colors.border,
          borderRadius: borderRadius.md,
          paddingVertical: spacing.lg,
          paddingHorizontal: spacing.xl,
          minHeight: 56,
          ...shadows.small(colors),
        },
        githubButtonText: {
          fontSize: typography.fontSize.lg,
          fontWeight: typography.fontWeight.semibold,
          color: colors.text,
          marginLeft: spacing.md,
        },
        errorContainer: {
          marginTop: spacing.lg,
          backgroundColor: colors.errorBackground,
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
          lineHeight: typography.lineHeight.normal,
        },
      }),
    [colors]
  );
};
```

---

## 7. Profile Screen Modifications

### 7.1 User Profile Header Component

**File**: `src/components/profile/UserProfileHeader.tsx` [NEW]

```typescript
import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import type { User } from '@/services/authService';
import { useTheme } from '@/contexts/ThemeContext';
import { LightColors, DarkColors, spacing, typography, borderRadius, shadows } from '@/styles/globalStyles';

interface UserProfileHeaderProps {
  user: User;
}

export function UserProfileHeader({ user }: UserProfileHeaderProps) {
  const { theme } = useTheme();
  const colors = theme === 'light' ? LightColors : DarkColors;
  const styles = useStyles(colors);

  const displayName = user.displayName || user.username;
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <View style={styles.container}>
      {/* Avatar */}
      <View style={styles.avatarContainer}>
        {user.avatarUrl ? (
          <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
        )}
      </View>

      {/* User Info */}
      <Text style={styles.displayName}>{displayName}</Text>
      <Text style={styles.username}>@{user.username}</Text>
      {user.email && <Text style={styles.email}>{user.email}</Text>}
    </View>
  );
}

const useStyles = (colors: typeof LightColors) => {
  return React.useMemo(
    () =>
      StyleSheet.create({
        container: {
          backgroundColor: colors.surface,
          borderRadius: borderRadius.lg,
          padding: spacing.xl,
          marginHorizontal: spacing.lg,
          marginTop: spacing.lg,
          alignItems: 'center',
          ...shadows.small(colors),
        },
        avatarContainer: {
          marginBottom: spacing.md,
        },
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
    [colors]
  );
};
```

### 7.2 Logout Button Component

**File**: `src/components/profile/LogoutButton.tsx` [NEW]

```typescript
import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/contexts/ThemeContext';
import { LightColors, DarkColors, spacing, typography, borderRadius } from '@/styles/globalStyles';

export function LogoutButton() {
  const { theme } = useTheme();
  const colors = theme === 'light' ? LightColors : DarkColors;
  const styles = useStyles(colors);
  const router = useRouter();
  const { logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoggingOut(true);
              await logout();
              router.replace('/(auth)/login');
            } catch (error) {
              console.error('Logout error:', error);
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
      accessible={true}
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

const useStyles = (colors: typeof LightColors) => {
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
          minHeight: 48,
          justifyContent: 'center',
        },
        buttonText: {
          fontSize: typography.fontSize.base,
          fontWeight: typography.fontWeight.semibold,
          color: '#FFFFFF',
        },
      }),
    [colors]
  );
};
```

### 7.3 Modified Profile Screen

**File**: `app/(tabs)/profile.tsx` [MODIFY]

Replace the existing profile screen with this updated version:

```typescript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaScrollView } from '@/components/SafeAreaScrollView';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { BreadthExpansionStats } from '@/components/profile/BreadthExpansionStats';
import { QuizPerformanceCard } from '@/components/profile/QuizPerformanceCard';
import { CategoryBreakdownList } from '@/components/profile/CategoryBreakdownList';
import { MilestonesList } from '@/components/profile/MilestonesList';
import { UserProfileHeader } from '@/components/profile/UserProfileHeader';
import { LogoutButton } from '@/components/profile/LogoutButton';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/contexts/ThemeContext';
import { LightColors, DarkColors, spacing, typography } from '@/styles/globalStyles';
import { LoadingSpinner } from '@/components/LoadingSpinner';

export default function ProfileScreen() {
  const { theme } = useTheme();
  const colors = theme === 'light' ? LightColors : DarkColors;
  const styles = useStyles(colors);
  const { user, isAuthenticated, isAuthLoading } = useAuth();

  if (isAuthLoading) {
    return (
      <SafeAreaScrollView contentContainerStyle={styles.loadingContainer}>
        <LoadingSpinner />
      </SafeAreaScrollView>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <SafeAreaScrollView contentContainerStyle={styles.unauthContainer}>
        <Text style={styles.unauthTitle}>Not Logged In</Text>
        <Text style={styles.unauthText}>
          Please login to view your profile and sync your progress.
        </Text>
      </SafeAreaScrollView>
    );
  }

  return (
    <SafeAreaScrollView>
      <ProfileHeader />

      {/* User Profile Card */}
      <UserProfileHeader user={user} />

      {/* Stats - Existing Components */}
      <BreadthExpansionStats />
      <QuizPerformanceCard />
      <CategoryBreakdownList />
      <MilestonesList />

      {/* Logout Button */}
      <LogoutButton />

      <View style={styles.spacer} />
    </SafeAreaScrollView>
  );
}

const useStyles = (colors: typeof LightColors) => {
  return React.useMemo(
    () =>
      StyleSheet.create({
        loadingContainer: {
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: colors.background,
        },
        unauthContainer: {
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: colors.background,
          paddingHorizontal: spacing.xl,
        },
        unauthTitle: {
          fontSize: typography.fontSize.xxl,
          fontWeight: typography.fontWeight.bold,
          color: colors.text,
          marginBottom: spacing.md,
        },
        unauthText: {
          fontSize: typography.fontSize.base,
          color: colors.textSecondary,
          textAlign: 'center',
          lineHeight: typography.lineHeight.relaxed,
        },
        spacer: {
          height: spacing.xxl,
        },
      }),
    [colors]
  );
};
```

---

## 8. Navigation & Protected Routes

### 8.1 Root Layout with Auth Guards

**File**: `app/_layout.tsx` [MODIFY]

Update the root layout to check auth state and redirect accordingly:

```typescript
import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { useAppStore } from '@/store/useAppStore';
import { useDeepLinkHandler } from '@/hooks/useDeepLinkHandler';

export default function RootLayout() {
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
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="quiz" options={{ presentation: 'modal' }} />
            <Stack.Screen name="discover-surprise" options={{ presentation: 'modal' }} />
            <Stack.Screen name="discover-guided" options={{ presentation: 'modal' }} />
            <Stack.Screen name="topic-detail" options={{ presentation: 'modal' }} />
          </Stack>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
```

### 8.2 Optional: Authenticated API Requests

For existing API calls (topics, quizzes), update them to use authenticated requests:

**Example**: Updating LLM service to include auth tokens

```typescript
// src/services/llmService.ts [MODIFY]
import { authService } from './authService';

class LLMService {
  async generateTopic(/* params */): Promise<Topic> {
    try {
      // Use authenticated fetch for backend requests
      const response = await authService.authenticatedFetch(
        `${API_URL}/topics/generate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ /* params */ }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to generate topic');
      }

      return await response.json();
    } catch (error) {
      // Handle error
      throw error;
    }
  }
}
```

---

## 9. Component Library

### 9.1 Auth Loading Overlay

**File**: `src/components/auth/AuthLoadingOverlay.tsx` [NEW]

```typescript
import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { LightColors, DarkColors, spacing, typography } from '@/styles/globalStyles';

interface AuthLoadingOverlayProps {
  message?: string;
}

export function AuthLoadingOverlay({ message = 'Authenticating...' }: AuthLoadingOverlayProps) {
  const { theme } = useTheme();
  const colors = theme === 'light' ? LightColors : DarkColors;
  const styles = useStyles(colors);

  return (
    <View style={styles.overlay}>
      <View style={styles.content}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.message}>{message}</Text>
      </View>
    </View>
  );
}

const useStyles = (colors: typeof LightColors) => {
  return React.useMemo(
    () =>
      StyleSheet.create({
        overlay: {
          ...StyleSheet.absoluteFillObject,
          backgroundColor: colors.background + 'CC', // 80% opacity
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 999,
        },
        content: {
          backgroundColor: colors.surface,
          borderRadius: 12,
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
    [colors]
  );
};
```

### 9.2 Error Banner

**File**: `src/components/auth/ErrorBanner.tsx` [NEW]

```typescript
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useTheme } from '@/contexts/ThemeContext';
import { LightColors, DarkColors, spacing, typography, borderRadius } from '@/styles/globalStyles';

interface ErrorBannerProps {
  message: string;
  onDismiss?: () => void;
  autoDismiss?: boolean;
  autoDismissDelay?: number;
}

export function ErrorBanner({
  message,
  onDismiss,
  autoDismiss = true,
  autoDismissDelay = 5000,
}: ErrorBannerProps) {
  const { theme } = useTheme();
  const colors = theme === 'light' ? LightColors : DarkColors;
  const styles = useStyles(colors);
  const translateY = useSharedValue(-100);

  useEffect(() => {
    translateY.value = withSpring(0);

    if (autoDismiss && onDismiss) {
      const timer = setTimeout(onDismiss, autoDismissDelay);
      return () => clearTimeout(timer);
    }
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <View style={styles.content}>
        <AntDesign name="exclamationcircle" size={20} color={colors.error} />
        <Text style={styles.message}>{message}</Text>
        {onDismiss && (
          <TouchableOpacity onPress={onDismiss} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <AntDesign name="close" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
}

const useStyles = (colors: typeof LightColors) => {
  return React.useMemo(
    () =>
      StyleSheet.create({
        container: {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
        },
        content: {
          backgroundColor: colors.errorBackground,
          borderBottomWidth: 2,
          borderBottomColor: colors.error,
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.lg,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
        },
        message: {
          flex: 1,
          fontSize: typography.fontSize.sm,
          color: colors.error,
        },
      }),
    [colors]
  );
};
```

### 9.3 User Avatar Component

**File**: `src/components/profile/UserAvatar.tsx` [NEW]

```typescript
import React from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { LightColors, DarkColors, typography, borderRadius } from '@/styles/globalStyles';

interface UserAvatarProps {
  avatarUrl?: string | null;
  displayName: string;
  size?: number;
}

export function UserAvatar({ avatarUrl, displayName, size = 80 }: UserAvatarProps) {
  const { theme } = useTheme();
  const colors = theme === 'light' ? LightColors : DarkColors;

  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const fontSize = size / 2.5;

  if (avatarUrl) {
    return (
      <Image
        source={{ uri: avatarUrl }}
        style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}
      />
    );
  }

  return (
    <View
      style={[
        styles.avatar,
        styles.avatarPlaceholder,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors.primary,
        },
      ]}
    >
      <Text style={[styles.avatarText, { fontSize }]}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    overflow: 'hidden',
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontWeight: typography.fontWeight.bold as any,
    color: '#FFFFFF',
  },
});
```

---

## 10. Error Handling & Edge Cases

### 10.1 OAuth Errors

**Scenario**: User cancels OAuth flow

```typescript
// Handled in authService.loginMobile()
if (result.type === 'cancel') {
  throw new AuthError('Login cancelled by user', 400, 'USER_CANCELLED');
}
```

**UI Response**: Show dismissable error banner, remain on login screen

### 10.2 Network Errors

**Scenario**: Token refresh fails due to network

```typescript
// authService.refreshAccessToken()
catch (error) {
  await this.clearTokens();
  throw new AuthError('Session expired', 401, 'SESSION_EXPIRED');
}
```

**UI Response**: Redirect to login screen, show "Session expired, please login again"

### 10.3 Concurrent Refresh Requests

**Solution**: Request queue in authService

```typescript
private refreshPromise: Promise<string> | null = null;

async refreshAccessToken(): Promise<string> {
  // Prevent multiple simultaneous refresh requests
  if (this.refreshPromise) {
    return this.refreshPromise;
  }

  this.refreshPromise = (async () => {
    // ... refresh logic
  })();

  return this.refreshPromise;
}
```

### 10.4 Offline Logout

**Scenario**: User logs out while offline

```typescript
async logout(): Promise<void> {
  // Call backend (don't await - allow offline logout)
  fetch(`${API_URL}/auth/logout`, {
    // ...
  }).catch(() => {
    // Ignore errors - clear local state anyway
  });

  // Clear local storage immediately
  await this.clearTokens();
}
```

**Result**: Local state cleared immediately, backend updated when online

### 10.5 Deep Link Validation

**Scenario**: Invalid deep link callback

```typescript
private extractTokensFromFragment(url: string): AuthTokens {
  const hashIndex = url.indexOf('#');

  if (hashIndex === -1) {
    throw new AuthError('No fragment found in callback URL', 400, 'INVALID_CALLBACK');
  }

  // Validate token presence
  if (!accessToken || !refreshToken) {
    throw new AuthError('Missing tokens in callback URL', 400, 'MISSING_TOKENS');
  }

  return { accessToken, refreshToken };
}
```

**UI Response**: Show error, redirect to login

### 10.6 Token Expiry During Request

**Scenario**: Access token expires mid-request

```typescript
// Auto-retry with refresh
async authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
  let response = await makeRequest(/* with current token */);

  // Retry with refresh if 401
  if (response.status === 401) {
    const newToken = await this.refreshAccessToken();
    response = await makeRequest(/* with new token */);
  }

  return response;
}
```

**Result**: Seamless token refresh, request succeeds

---

## 11. Testing Checklist

### 11.1 OAuth Flow Testing

- [ ] **Mobile (iOS)**
  - [ ] Login redirects to GitHub
  - [ ] Deep link callback received
  - [ ] Tokens extracted and stored in SecureStore
  - [ ] User session fetched
  - [ ] Navigates to main app

- [ ] **Mobile (Android)**
  - [ ] Same as iOS

- [ ] **Web**
  - [ ] Login redirects to GitHub
  - [ ] Callback sets cookies
  - [ ] Navigates to main app
  - [ ] Session persists on refresh

### 11.2 Token Refresh Testing

- [ ] Access token auto-refreshes before expiry
- [ ] Concurrent requests queue properly
- [ ] Failed refresh redirects to login
- [ ] Refresh token rotation works

### 11.3 Logout Testing

- [ ] Backend logout called
- [ ] Local tokens cleared
- [ ] Zustand state reset
- [ ] Redirects to login screen
- [ ] Offline logout works

### 11.4 Protected Routes

- [ ] Unauthenticated users redirected to login
- [ ] Authenticated users can access app
- [ ] Already logged-in users skip login screen

### 11.5 Error Scenarios

- [ ] User cancels OAuth → error shown
- [ ] Network error during login → error shown
- [ ] Invalid callback URL → error shown
- [ ] Token expired → auto-refresh or redirect

### 11.6 Platform-Specific

- [ ] iOS deep links work
- [ ] Android deep links work
- [ ] Web cookies work correctly
- [ ] SecureStore encryption works (mobile)

### 11.7 UI/UX

- [ ] Login screen renders correctly
- [ ] Profile shows user info
- [ ] Logout confirmation works
- [ ] Loading states shown
- [ ] Errors displayed clearly
- [ ] Dark mode works
- [ ] Light mode works

### 11.8 Accessibility

- [ ] Screen reader announces auth states
- [ ] Buttons have accessibility labels
- [ ] Inputs have accessibility hints
- [ ] Focus order is logical

---

## 12. Implementation Roadmap

### Phase 1: Foundation (2-3 days)

**Tasks**:
1. Install dependencies (`expo-web-browser`, `expo-secure-store`)
2. Create auth service (`authService.ts`)
3. Add auth state to Zustand store
4. Create auth hooks (`useAuth`, `useRequireAuth`, `useDeepLinkHandler`)
5. Update environment variables

**Deliverable**: Auth service ready, state management in place

### Phase 2: Login Flow (2-3 days)

**Tasks**:
1. Create auth group layout
2. Implement login screen
3. Add deep link handling
4. Integrate with backend OAuth
5. Test mobile and web OAuth flows

**Deliverable**: Working login on all platforms

### Phase 3: Profile & Logout (1-2 days)

**Tasks**:
1. Create user profile components (`UserProfileHeader`, `UserAvatar`, `LogoutButton`)
2. Modify profile screen
3. Implement logout flow
4. Add confirmation dialogs

**Deliverable**: Profile shows user info, logout works

### Phase 4: Protected Routes (1 day)

**Tasks**:
1. Modify root layout with auth guards
2. Add session check on app startup
3. Implement redirect logic
4. Test navigation flows

**Deliverable**: App redirects based on auth state

### Phase 5: Data Sync (2 days)

**Tasks**:
1. Create sync hooks
2. Implement upload local data on login
3. Add conflict resolution
4. Test sync scenarios

**Deliverable**: Local data syncs with backend

### Phase 6: Polish & Testing (2-3 days)

**Tasks**:
1. Error handling refinement
2. Loading state improvements
3. Accessibility testing
4. Cross-platform testing (iOS, Android, Web)
5. Dark/light theme testing
6. Performance optimization

**Deliverable**: Production-ready auth system

**Total Estimated Time**: 10-14 days

---

## 13. Appendix: Type Definitions

### 13.1 Auth Types

**File**: `src/types/index.ts` [MODIFY - Add these types]

```typescript
// Re-export from authService for convenience
export type { User, AuthTokens, SessionResponse, RefreshResponse } from '@/services/authService';
export { AuthError } from '@/services/authService';

// Auth state
export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  authError: string | null;
}

// Token pair
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

// OAuth state payload (backend-generated, read-only for frontend)
export interface OAuthStatePayload {
  nonce: string;
  platform: 'web' | 'mobile';
  redirectUri?: string;
  iat: number;
  exp: number;
}
```

### 13.2 Zustand Store Type

```typescript
import type { User } from '@/services/authService';

interface AppState {
  // Existing state
  topics: Topic[];
  dismissedTopics: string[];
  quizzes: Quiz[];
  currentQuiz: Quiz | null;
  profile: Profile;
  isLoading: boolean;
  error: string | null;

  // Auth state
  user: User | null;
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  authError: string | null;

  // Existing actions
  addTopic: (topic: Topic) => void;
  updateTopicStatus: (id: string, status: TopicStatus) => void;
  dismissTopic: (topicName: string) => void;
  deleteTopic: (id: string) => void;
  addQuiz: (quiz: Quiz) => void;
  updateQuizAnswer: (questionIndex: number, userAnswer: string, isCorrect: boolean) => void;
  calculateStatistics: () => void;
  checkMilestones: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Auth actions
  setUser: (user: User | null) => void;
  setAuthLoading: (loading: boolean) => void;
  setAuthError: (error: string | null) => void;
  checkSession: () => Promise<void>;
  logout: () => Promise<void>;
}
```

---

## Conclusion

This specification provides a **complete, production-ready** integration of GitHub OAuth authentication into the Breadthwise Expo application. Key highlights:

✅ **Platform-Agnostic**: Single codebase works on iOS, Android, and Web
✅ **Design Consistency**: Uses existing `globalStyles.ts` theme system
✅ **Type-Safe**: Full TypeScript coverage
✅ **Mobile-First**: Responsive UI following best practices
✅ **Secure**: Platform-specific token storage (SecureStore mobile, cookies web)
✅ **Production-Ready**: Error handling, offline support, accessibility

All code examples are **ready to implement** - not pseudocode. Follow the implementation roadmap for a structured rollout.

**Next Steps**: Begin with Phase 1 (Foundation), following the roadmap in Section 12.

---

**Document Version**: 1.0
**Last Updated**: 2025-11-16
**Status**: ✅ Ready for Implementation
