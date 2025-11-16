import type { OAuth2Namespace } from '@fastify/oauth2';
import { FastifyReply, FastifyRequest } from 'fastify';
import { refreshTokenSchema, type RefreshTokenDto } from './auth.schemas.js';
import { AuthService } from './auth.service.js';
import { env } from '../shared/config/env.js';

interface LogoutBody {
  refreshToken?: string;
}

// Extend FastifyInstance to include the OAuth2 namespace
declare module 'fastify' {
  interface FastifyInstance {
    githubOAuth2: OAuth2Namespace;
  }
}

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  async githubCallback(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    // OAuth2 token is already exchanged by @fastify/oauth2
    const tokenData = await request.server.githubOAuth2.getAccessTokenFromAuthorizationCodeFlow(request);
    const token = tokenData.token;

    // Fetch user profile from GitHub
    const response = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${token.access_token}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch GitHub profile');
    }

    const profile = await response.json() as import('./auth.service.js').GitHubProfile;

    // Handle authentication
    const { user: _user, tokens } = await this.authService.handleGitHubCallback(profile, request);

    // Get platform and redirect URI from decoded OAuth state
    // This was validated and attached to the request by checkStateFunction
    if (!request.oauthState) {
      throw new Error('OAuth state not found - invalid authentication flow');
    }

    const { platform, redirectUri } = request.oauthState;

    if (platform === 'mobile') {
      // For mobile: redirect to deep link with tokens in URL fragment
      // redirectUri is guaranteed to exist (validated in generateStateFunction)
      if (!redirectUri) {
        throw new Error('redirect_uri is required for mobile OAuth flow');
      }

      // Use URL fragment (#) instead of query params (?) for security
      // Fragments are not sent to servers, preventing token leakage in logs
      const url = new URL(redirectUri);
      url.hash = `access_token=${tokens.accessToken}&refresh_token=${tokens.refreshToken}`;
      reply.redirect(url.toString());
    } else {
      // For web: set httpOnly cookies and redirect
      this.authService.setTokenCookies(reply, tokens);
      reply.redirect(env.WEB_CLIENT_URL);
    }
  }

  async refresh(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const platform = this.authService.detectPlatform(request);

    let refreshTokenValue: string;

    if (platform === 'mobile') {
      // Get refresh token from request body
      const body = refreshTokenSchema.parse(request.body) as RefreshTokenDto;
      refreshTokenValue = body.refreshToken;
    } else {
      // Get refresh token from cookie
      const cookieValue = request.cookies.refresh_token;

      if (!cookieValue) {
        throw new Error('No refresh token provided');
      }

      refreshTokenValue = cookieValue;
    }

    const { tokens } = await this.authService.refreshTokens(refreshTokenValue, request);

    if (platform === 'mobile') {
      reply.send({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      });
    } else {
      this.authService.setTokenCookies(reply, tokens);
      reply.send({
        message: 'Tokens refreshed successfully',
      });
    }
  }

  async logout(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const platform = this.authService.detectPlatform(request);

    let refreshTokenValue: string | undefined;

    if (platform === 'mobile') {
      const body = request.body as LogoutBody;
      refreshTokenValue = body?.refreshToken;
    } else {
      refreshTokenValue = request.cookies.refresh_token;
    }

    const userId = request.user?.sub;

    await this.authService.logout(refreshTokenValue, userId);

    if (platform === 'web') {
      this.authService.clearTokenCookies(reply);
    }

    reply.send({
      message: 'Logged out successfully',
    });
  }

  async revokeAll(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const userId = request.user.sub;

    await this.authService.revokeAllTokens(userId);

    const platform = this.authService.detectPlatform(request);

    if (platform === 'web') {
      this.authService.clearTokenCookies(reply);
    }

    reply.send({
      message: 'All tokens revoked',
    });
  }

  async session(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    reply.send({
      user: request.user,
      expiresAt: new Date(request.user.exp * 1000).toISOString(),
    });
  }
}
